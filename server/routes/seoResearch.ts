import { Router } from 'express';
import crypto from 'node:crypto';
import {
  getSeoConnection,
  saveSeoConnection,
  updateSeoSelectedProperty,
  clearSeoConnection,
  getBlogs
} from '../db.js';

export const seoResearchRouter = Router();

// Encryption helpers for token storage (AES-256-GCM)
const ENCRYPTION_ALGO = 'aes-256-gcm';
function getEncryptionKey(): Buffer {
  const secret = process.env.SEO_RESEARCH_ENCRYPTION_KEY || process.env.ADMIN_PASSWORD_HASH || 'dawnexus-seo-secret-key-salt-32chars!!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptPayload(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptPayload(cipherString: string): string | null {
  try {
    const parts = cipherString.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[SEO Research] Decryption failed:', err);
    return null;
  }
}

// In-memory state storage for OAuth CSRF protection (valid 10 minutes)
const oauthStates = new Map<string, number>();

// Refreshes Google OAuth access token if expired
async function getValidAccessToken(tokens: any): Promise<string | null> {
  if (!tokens) return null;
  
  // Test existing access token with lightweight request
  try {
    const testRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (testRes.ok) {
      return tokens.access_token;
    }
  } catch {
    // Continue to refresh
  }

  // If expired and refresh_token exists, exchange with Google OAuth token endpoint
  if (tokens.refresh_token && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (refreshRes.ok) {
        const refreshedData = await refreshRes.json();
        const updatedTokens = {
          ...tokens,
          access_token: refreshedData.access_token,
          expires_in: refreshedData.expires_in
        };
        const conn = getSeoConnection();
        if (conn && conn.google_email) {
          saveSeoConnection(conn.google_email, encryptPayload(JSON.stringify(updatedTokens)), conn.selected_property || undefined);
        }
        return refreshedData.access_token;
      }
    } catch (err) {
      console.error('[SEO Research] Token refresh failed:', err);
    }
  }

  return tokens.access_token || null;
}

// Canonical internal services and assets for smart link injection
const DAWNEXUS_CORE_PAGES = [
  { url: 'https://dawnexus.in/', title: 'Dawnexus — AI Digital Marketing Agency', anchor: 'Dawnexus AI Digital Marketing' },
  { url: 'https://dawnexus.in/services/website-design', title: 'Website Design & Development', anchor: 'custom website design services' },
  { url: 'https://dawnexus.in/services/seo-services', title: 'Search Engine Optimization', anchor: 'professional SEO services' },
  { url: 'https://dawnexus.in/services/ai-video-creation', title: 'AI Video Creation & Marketing', anchor: 'AI video production' },
  { url: 'https://dawnexus.in/services/digital-marketing', title: 'AI-Integrated Digital Marketing', anchor: 'targeted digital marketing campaigns' },
  { url: 'https://dawnexus.in/blog', title: 'Dawnexus Insights & Knowledge Hub', anchor: 'Dawnexus insights blog' }
];

export interface SearchQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface OpportunityScoreBreakdown {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  score: number; // 0 to 100
  rationale: string;
  opportunityType: 'Striking Distance' | 'High Impression Low CTR' | 'Quick Win' | 'Emerging Trend';
  existingCoverage: {
    covered: boolean;
    slug?: string;
    title?: string;
    matchType?: 'Exact Keyword' | 'Partial Title';
  };
  recommendedInternalLinks: Array<{ url: string; anchor: string; title: string }>;
}

// Deterministic intent classification
export function classifySearchIntent(query: string): 'Informational' | 'Commercial' | 'Transactional' | 'Navigational' {
  const q = query.toLowerCase();
  if (/\b(buy|hire|price|pricing|cost|quote|agency in|company in|services in|packages)\b/.test(q)) {
    return 'Commercial';
  }
  if (/\b(download|order|book|checkout|apply|contact)\b/.test(q)) {
    return 'Transactional';
  }
  if (/\b(dawnexus|login|portal|careers)\b/.test(q)) {
    return 'Navigational';
  }
  return 'Informational';
}

// Deterministic opportunity scoring algorithm
// Targets "Striking Distance" queries (positions 6-25) with notable impressions and below-average CTR
export function calculateOpportunityScore(row: SearchQueryRow): { score: number; rationale: string; opportunityType: OpportunityScoreBreakdown['opportunityType'] } {
  const { impressions, position, ctr } = row;
  
  // 1. Position Factor (max 40 pts)
  // Striking distance: Position 8 to 20 is optimal sweet spot for blog expansion
  let positionScore = 0;
  if (position >= 8 && position <= 20) {
    positionScore = 40;
  } else if (position > 4 && position < 8) {
    positionScore = 32;
  } else if (position > 20 && position <= 30) {
    positionScore = 25;
  } else if (position <= 4) {
    positionScore = 15; // Already top ranking; less incremental traffic opportunity
  } else {
    positionScore = Math.max(5, 20 - (position - 30));
  }

  // 2. Impression Factor (max 35 pts)
  // Scaled log-linearly based on impression volume
  let impressionScore = 0;
  if (impressions >= 1000) impressionScore = 35;
  else if (impressions >= 500) impressionScore = 30;
  else if (impressions >= 250) impressionScore = 25;
  else if (impressions >= 100) impressionScore = 20;
  else if (impressions >= 50) impressionScore = 14;
  else impressionScore = Math.max(3, Math.round((impressions / 50) * 12));

  // 3. CTR Gap Factor (max 25 pts)
  // Expected CTR benchmark based on position
  let benchmarkCtr = 0.05;
  if (position <= 3) benchmarkCtr = 0.20;
  else if (position <= 7) benchmarkCtr = 0.08;
  else if (position <= 15) benchmarkCtr = 0.03;
  else benchmarkCtr = 0.015;

  let ctrScore = 0;
  if (ctr < benchmarkCtr && impressions >= 50) {
    // Underperforming expected CTR = major opportunity for targeted title/content optimization
    const gap = (benchmarkCtr - ctr) / benchmarkCtr;
    ctrScore = Math.min(25, Math.round(15 + gap * 10));
  } else {
    ctrScore = 10;
  }

  const totalScore = Math.min(100, Math.round(positionScore + impressionScore + ctrScore));

  let opportunityType: OpportunityScoreBreakdown['opportunityType'] = 'Striking Distance';
  let rationale = `Average rank #${position.toFixed(1)} with ${impressions} impressions.`;

  if (position >= 7 && position <= 25 && impressions >= 100) {
    opportunityType = 'Striking Distance';
    rationale = `Striking distance query (pos #${position.toFixed(1)}) with ${impressions} impressions. Dedicated blog post can push this to page 1.`;
  } else if (impressions >= 200 && ctr < 0.03) {
    opportunityType = 'High Impression Low CTR';
    rationale = `High search interest (${impressions} imp) but low CTR (${(ctr * 100).toFixed(1)}%). Needs compelling title and targeted search intent match.`;
  } else if (position <= 8) {
    opportunityType = 'Quick Win';
    rationale = `Top 8 rank with room for featured snippet or position #1 takeover.`;
  } else {
    opportunityType = 'Emerging Trend';
    rationale = `Long-tail search demand with rising visibility.`;
  }

  return { score: totalScore, rationale, opportunityType };
}

// Find existing blog coverage to avoid cannibalization
export function checkExistingCoverage(query: string, existingBlogs: Array<{ title: string; slug: string; primary_keyword: string }>) {
  const normQuery = query.toLowerCase().trim();
  for (const blog of existingBlogs) {
    const normKw = (blog.primary_keyword || '').toLowerCase().trim();
    if (normKw && normKw === normQuery) {
      return {
        covered: true,
        slug: blog.slug,
        title: blog.title,
        matchType: 'Exact Keyword' as const
      };
    }
    const normTitle = (blog.title || '').toLowerCase().trim();
    if (normTitle.includes(normQuery) || normQuery.includes(normTitle)) {
      return {
        covered: true,
        slug: blog.slug,
        title: blog.title,
        matchType: 'Partial Title' as const
      };
    }
  }
  return { covered: false };
}

// Deterministic internal link suggestions based on keyword semantics
export function getRecommendedInternalLinks(query: string): Array<{ url: string; anchor: string; title: string }> {
  const q = query.toLowerCase();
  const links: Array<{ url: string; anchor: string; title: string }> = [];

  if (q.includes('web') || q.includes('site') || q.includes('develop') || q.includes('redesign') || q.includes('ui') || q.includes('ux')) {
    links.push(DAWNEXUS_CORE_PAGES[1]); // Website design
  }
  if (q.includes('seo') || q.includes('rank') || q.includes('google') || q.includes('traffic') || q.includes('keyword') || q.includes('search')) {
    links.push(DAWNEXUS_CORE_PAGES[2]); // SEO services
  }
  if (q.includes('video') || q.includes('reels') || q.includes('shorts') || q.includes('ai video') || q.includes('animation') || q.includes('youtube')) {
    links.push(DAWNEXUS_CORE_PAGES[3]); // AI Video creation
  }
  if (q.includes('marketing') || q.includes('ads') || q.includes('social') || q.includes('lead') || q.includes('campaign') || q.includes('roi')) {
    links.push(DAWNEXUS_CORE_PAGES[4]); // Digital marketing
  }

  // Always suggest homepage and blog hub if not already saturated
  if (links.length < 2) {
    links.push(DAWNEXUS_CORE_PAGES[0]);
  }
  if (links.length < 3) {
    links.push(DAWNEXUS_CORE_PAGES[5]);
  }

  return links.slice(0, 3);
}

// Built-in realistic fixture queries for Dawnexus domain (used when GSC credentials are unset)
const SIMULATED_GSC_DATA: SearchQueryRow[] = [
  { query: 'ai video production company coimbatore', clicks: 42, impressions: 840, ctr: 0.05, position: 9.4 },
  { query: 'cost of website design for small business india', clicks: 38, impressions: 1120, ctr: 0.0339, position: 11.2 },
  { query: 'google maps ranking factors local seo 2026', clicks: 29, impressions: 650, ctr: 0.0446, position: 8.7 },
  { query: 'digital marketing roi benchmarks b2b', clicks: 18, impressions: 480, ctr: 0.0375, position: 14.1 },
  { query: 'how to generate leads with ai video ads', clicks: 31, impressions: 920, ctr: 0.0337, position: 12.8 },
  { query: 'best seo agency coimbatore', clicks: 45, impressions: 710, ctr: 0.0634, position: 6.2 },
  { query: 'ecommerce website development cost tamil nadu', clicks: 12, impressions: 390, ctr: 0.0308, position: 16.5 },
  { query: 'meta ads vs google ads for local service business', clicks: 22, impressions: 590, ctr: 0.0373, position: 10.9 },
  { query: 'ai tools for video marketing automation', clicks: 15, impressions: 430, ctr: 0.0349, position: 18.2 },
  { query: 'local seo checklist for retail store', clicks: 8, impressions: 270, ctr: 0.0296, position: 21.4 }
];

// ----------------------------------------------------
// PROMPT TEMPLATE BUILDER (DETERMINISTIC APPLICATION CODE)
// ----------------------------------------------------
export function generateBlogPromptTemplate(params: {
  targetKeyword: string;
  searchIntent: string;
  articleType: string;
  secondaryKeywords: string[];
  opportunityRationale: string;
  internalLinks: Array<{ url: string; anchor: string; title: string }>;
  existingBlogSlugs?: string[];
}): string {
  const {
    targetKeyword,
    searchIntent,
    articleType,
    secondaryKeywords,
    opportunityRationale,
    internalLinks
  } = params;

  const linksList = internalLinks
    .map(link => `- Anchor text: "${link.anchor}" -> URL: ${link.url}`)
    .join('\n');

  const secondaryKws = secondaryKeywords.length > 0
    ? secondaryKeywords.map(k => `"${k}"`).join(', ')
    : `"${targetKeyword} tips", "${targetKeyword} strategy", "how to implement ${targetKeyword}"`;

  return `# PROMPT: COMPLETE SEO-OPTIMIZED BLOG ARTICLE FOR DAWNEXUS

You are an expert digital marketing strategist, technical SEO copywriter, and senior editor writing for **Dawnexus** (https://dawnexus.in/), a premier AI-powered creative agency and digital marketing consultancy.

---

### ARTICLE OBJECTIVE & SEARCH METRICS
- **Target Primary Keyword:** ${targetKeyword}
- **Search Intent:** ${searchIntent}
- **Article Format:** ${articleType}
- **Secondary / Semantic Keywords:** ${secondaryKws}
- **Strategic Context / SEO Opportunity:** ${opportunityRationale}

---

### BRAND & EDITORIAL TONE GUIDELINES
1. **Tone:** Authoritative, transparent, highly actionable, forward-looking (2026 perspective). Avoid generic AI filler words ("delve", "tapestry", "game-changer", "moreover").
2. **Perspective:** Agency expert sharing battle-tested methodologies, real cost perspectives (in INR for Indian market or USD where global), and specific implementation frameworks.
3. **Target Audience:** Business owners, marketing directors, founders, and growth leaders looking to scale their digital presence with AI efficiency.

---

### REQUIRED ARTICLE STRUCTURE
1. **Compelling Title (H1):** Must include the primary keyword near the beginning, promise clear value, and fit within 60 characters.
2. **Hook & Problem Statement (150 words):** Open directly with the industry challenge or market shift. Hook the reader without generic introductions.
3. **Core Framework / Methodology (H2 & H3s):** Break down actionable steps, comparative tables, checklists, or data points. Explain both the "why" and the technical "how".
4. **Real-World Examples / Benchmarks:** Provide practical frameworks or realistic benchmarks.
5. **Common Mistakes to Avoid:** Highlight 3 costly pitfalls businesses make.
6. **Required Internal Links (Seamless Contextual Insertion):**
${linksList}
7. **Actionable FAQ Section (Schema Ready):** Include 3-4 specific high-intent questions and authoritative answers.
8. **Conclusion & Clear CTA:** Direct the reader to consult Dawnexus for strategy and execution.

---

### METADATA OUTPUT REQUIRED AT THE TOP
Provide the following structured YAML frontmatter before the article:
\`\`\`yaml
title: "[Under 60 chars SEO Title]"
slug: "[clean-url-slug]"
excerpt: "[140-155 characters compelling meta description]"
category: "Digital Strategy"
primary_keyword: "${targetKeyword}"
secondary_keywords: [${secondaryKeywords.map(k => `"${k}"`).join(', ')}]
search_intent: "${searchIntent}"
\`\`\`

Now, write the complete, publication-ready article in markdown.`;
}

// ----------------------------------------------------
// ROUTER ENDPOINTS
// ----------------------------------------------------

// GET /api/admin/seo-research/status
// Returns current connection state, whether live credentials exist, and selected property
seoResearchRouter.get('/status', (req, res) => {
  try {
    const isFeatureEnabled = process.env.ENABLE_SEO_RESEARCH_V3 !== 'false';
    const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const conn = getSeoConnection();

    let isConnected = false;
    let googleEmail: string | null = null;
    let selectedProperty: string | null = null;

    if (conn && conn.encrypted_tokens) {
      const decrypted = decryptPayload(conn.encrypted_tokens);
      if (decrypted) {
        isConnected = true;
        googleEmail = conn.google_email;
        selectedProperty = conn.selected_property || 'https://dawnexus.in/';
      }
    }

    return res.json({
      featureEnabled: isFeatureEnabled,
      hasGoogleCredentials: hasClientId,
      isConnected,
      googleEmail,
      selectedProperty: selectedProperty || 'https://dawnexus.in/',
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://dawnexus.in/api/admin/seo-research/google/callback'
    });
  } catch (error) {
    console.error('[SEO Research Status Error]:', error);
    return res.status(500).json({ error: 'Failed to inspect SEO research status' });
  }
});

// GET /api/admin/seo-research/google/auth-url
// Generates Google OAuth 2.0 authorization URL
seoResearchRouter.get('/google/auth-url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/admin/seo-research/google/callback`;

  if (!clientId) {
    return res.status(400).json({
      error: 'GOOGLE_CLIENT_ID is not configured in environment variables.',
      hasCredentials: false
    });
  }

  // Generate secure CSRF state
  const state = crypto.randomBytes(24).toString('hex');
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);

  const scope = encodeURIComponent('https://www.googleapis.com/auth/webmasters.readonly email profile');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

  return res.json({
    authUrl,
    state
  });
});

// GET /api/admin/seo-research/google/callback
// Handles OAuth callback and token exchange
export async function handleGoogleOAuthCallback(req: any, res: any) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/admin?seo_error=${encodeURIComponent(String(error))}`);
    }

    if (!code || !state || typeof state !== 'string' || !oauthStates.has(state)) {
      return res.status(400).send('Invalid or expired OAuth state parameter.');
    }

    // Invalidate used state
    oauthStates.delete(state);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/admin/seo-research/google/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).send('Google OAuth client credentials missing on server.');
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[Google OAuth Token Error]:', errBody);
      return res.redirect('/admin?seo_error=token_exchange_failed');
    }

    const tokenData = await tokenRes.json();
    
    // Fetch user email for display
    let userEmail = 'Authorized Google Account';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (userRes.ok) {
        const userInfo = await userRes.json();
        if (userInfo.email) userEmail = userInfo.email;
      }
    } catch {
      // Non-fatal
    }

    // Encrypt tokens before saving to database
    const encrypted = encryptPayload(JSON.stringify(tokenData));
    saveSeoConnection(userEmail, encrypted, 'https://dawnexus.in/');

    return res.redirect('/admin?seo_connected=1');
  } catch (err) {
    console.error('[Google Callback Exception]:', err);
    return res.redirect('/admin?seo_error=internal_error');
  }
}

seoResearchRouter.get('/google/callback', handleGoogleOAuthCallback);

// POST /api/admin/seo-research/disconnect
// Clears stored Google credentials safely
seoResearchRouter.post('/disconnect', (req, res) => {
  try {
    clearSeoConnection();
    return res.json({ success: true, message: 'Google Search Console connection disconnected successfully.' });
  } catch (error) {
    console.error('[SEO Research Disconnect Error]:', error);
    return res.status(500).json({ error: 'Failed to disconnect Google connection' });
  }
});

// POST /api/admin/seo-research/select-property
// Selects active GSC property URL
seoResearchRouter.post('/select-property', (req, res) => {
  try {
    const { propertyUrl } = req.body;
    if (!propertyUrl || typeof propertyUrl !== 'string') {
      return res.status(400).json({ error: 'Property URL is required' });
    }
    const updated = updateSeoSelectedProperty(propertyUrl.trim());
    return res.json({ success: true, selectedProperty: updated.selected_property });
  } catch (error) {
    console.error('[SEO Research Select Property Error]:', error);
    return res.status(500).json({ error: 'Failed to select property' });
  }
});

// GET /api/admin/seo-research/properties
// Lists available Search Console properties for the authorized user
seoResearchRouter.get('/properties', async (req, res) => {
  try {
    const conn = getSeoConnection();
    if (!conn || !conn.encrypted_tokens) {
      return res.json({
        properties: [],
        isConnected: false
      });
    }

    const decrypted = decryptPayload(conn.encrypted_tokens);
    if (!decrypted) {
      return res.status(401).json({ error: 'Invalid token encryption. Reconnection required.' });
    }

    const tokens = JSON.parse(decrypted);
    const accessToken = await getValidAccessToken(tokens);
    if (!accessToken) {
      return res.status(401).json({ error: 'Google session expired. Please reconnect your Google account.' });
    }

    const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!sitesRes.ok) {
      const errText = await sitesRes.text();
      console.error('[Google Search Console Sites Error]:', errText);
      return res.status(sitesRes.status).json({ error: 'Failed to fetch sites from Google Search Console. Ensure the Google Search Console API is enabled in your Google Cloud Console.' });
    }

    const sitesData = await sitesRes.json();
    return res.json({
      properties: sitesData.siteEntry || [],
      isConnected: true
    });
  } catch (error) {
    console.error('[SEO Research Properties Error]:', error);
    return res.status(500).json({ error: 'Failed to list Search Console properties' });
  }
});

// POST /api/admin/seo-research/opportunities
// Analyzes search analytics data, classifies intent, scores opportunities, and maps internal links
seoResearchRouter.post('/opportunities', async (req, res) => {
  try {
    const { dateRange = '28d', customQueryLimit = 50 } = req.body || {};
    const conn = getSeoConnection();

    if (!conn || !conn.encrypted_tokens) {
      return res.status(400).json({
        error: 'Google Search Console is not connected yet. Please connect your Google account above to load live search queries.',
        isConnected: false,
        opportunities: [],
        stats: null
      });
    }

    const decrypted = decryptPayload(conn.encrypted_tokens);
    if (!decrypted) {
      return res.status(401).json({ error: 'Token decryption failed. Please reconnect your Google account.' });
    }

    const tokens = JSON.parse(decrypted);
    const accessToken = await getValidAccessToken(tokens);
    if (!accessToken) {
      return res.status(401).json({ error: 'Google session expired. Please reconnect your Google account.' });
    }

    const property = encodeURIComponent(conn.selected_property || 'https://dawnexus.in/');
    
    // Calculate startDate and endDate
    const end = new Date();
    const start = new Date();
    const days = dateRange === '3m' ? 90 : 28;
    start.setDate(end.getDate() - days);

    const gscRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${property}/searchAnalytics/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: customQueryLimit
      })
    });

    if (!gscRes.ok) {
      const errText = await gscRes.text();
      console.error('[Google Search Analytics Error]:', errText);
      let errMsg = 'Failed to fetch search data from Google Search Console.';
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch {
        // Fallback
      }
      return res.status(gscRes.status).json({
        error: `Search Console error: ${errMsg}. Ensure "${conn.selected_property || 'https://dawnexus.in/'}" is verified in Google Search Console for this Google account.`,
        isConnected: true
      });
    }

    const gscData = await gscRes.json();
    const queryRows: SearchQueryRow[] = Array.isArray(gscData.rows)
      ? gscData.rows.map((r: any) => ({
          query: r.keys?.[0] || '',
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: r.ctr || 0,
          position: r.position || 0
        }))
      : [];

    // Retrieve existing blogs from database for cannibalization check
    const existingBlogsRes = getBlogs({ limit: 100 });
    const existingBlogs = existingBlogsRes.items.map(b => ({
      title: b.title,
      slug: b.slug,
      primary_keyword: b.primary_keyword
    }));

    // Process each query deterministically
    const scoredOpportunities: OpportunityScoreBreakdown[] = queryRows
      .filter(r => r.query && r.query.trim().length > 2)
      .map(row => {
        const intent = classifySearchIntent(row.query);
        const { score, rationale, opportunityType } = calculateOpportunityScore(row);
        const existingCoverage = checkExistingCoverage(row.query, existingBlogs);
        const recommendedInternalLinks = getRecommendedInternalLinks(row.query);

        return {
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: Math.round(row.ctr * 10000) / 10000,
          position: Math.round(row.position * 10) / 10,
          intent,
          score,
          rationale,
          opportunityType,
          existingCoverage,
          recommendedInternalLinks
        };
      })
      .sort((a, b) => b.score - a.score);

    // Calculate aggregated overview stats
    const totalClicks = queryRows.reduce((acc, r) => acc + r.clicks, 0);
    const totalImpressions = queryRows.reduce((acc, r) => acc + r.impressions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = queryRows.length > 0 ? queryRows.reduce((acc, r) => acc + r.position, 0) / queryRows.length : 0;

    return res.json({
      isConnected: true,
      stats: {
        totalQueries: queryRows.length,
        totalClicks,
        totalImpressions,
        avgCtr: Math.round(avgCtr * 10000) / 100,
        avgPosition: Math.round(avgPosition * 10) / 10
      },
      opportunities: scoredOpportunities
    });
  } catch (error) {
    console.error('[SEO Opportunities Analysis Error]:', error);
    return res.status(500).json({ error: 'Failed to process keyword opportunities' });
  }
});

// POST /api/admin/seo-research/generate-prompt
// Generates a comprehensive, copy-ready AI blog prompt without calling any external LLM
seoResearchRouter.post('/generate-prompt', (req, res) => {
  try {
    const {
      targetKeyword,
      searchIntent = 'Informational',
      articleType = 'How-To Guide & Best Practices',
      secondaryKeywords = [],
      opportunityRationale = 'Identified via high-intent Search Console opportunity analysis.',
      internalLinks = []
    } = req.body;

    if (!targetKeyword || typeof targetKeyword !== 'string' || !targetKeyword.trim()) {
      return res.status(400).json({ error: 'targetKeyword is required.' });
    }

    const linksToUse = internalLinks.length > 0 ? internalLinks : getRecommendedInternalLinks(targetKeyword);

    const promptText = generateBlogPromptTemplate({
      targetKeyword: targetKeyword.trim(),
      searchIntent,
      articleType,
      secondaryKeywords: Array.isArray(secondaryKeywords) ? secondaryKeywords : [],
      opportunityRationale,
      internalLinks: linksToUse
    });

    return res.json({
      success: true,
      targetKeyword: targetKeyword.trim(),
      prompt: promptText
    });
  } catch (error) {
    console.error('[Generate Blog Prompt Error]:', error);
    return res.status(500).json({ error: 'Failed to generate prompt template' });
  }
});

