/**
 * Dawnexus AI SEO Studio — Deterministic SEO Quality Scorer
 * 100-Point Transparent Rubric & Audit Engine
 * 
 * Strict Code-Based Evaluation (No Generative AI API)
 */

export interface SeoCriterionScore {
  name: string;
  maxPoints: number;
  score: number;
  passed: boolean;
  notes: string[];
}

export interface SeoAuditReport {
  totalScore: number;
  maxScore: number;
  percentage: number;
  meetsThreshold: boolean;
  threshold: number;
  criteria: Record<string, SeoCriterionScore>;
  passedChecks: string[];
  failedChecks: string[];
  mandatoryFailures: string[];
  recommendations: string[];
  warnings: string[];
  requiredFixes: string[];
  evaluatedAt: string;
  metadata: {
    wordCount: number;
    headingCount: { h1: number; h2: number; h3: number };
    internalLinksCount: number;
    externalLinksCount: number;
    keywordOccurrences: number;
    keywordDensity: number;
    hasFeaturedImage: boolean;
    hasImageAlt: boolean;
    categoryValid: boolean;
    slugValid: boolean;
  };
}

export interface BlogAuditInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  category: string;
  primary_keyword?: string;
  secondary_keywords?: string[] | string;
  search_intent?: string;
  target_audience?: string;
  seo_title?: string;
  meta_description?: string;
  canonical_url?: string;
  featured_image?: string;
  image_alt?: string;
}

export const VALID_CATEGORIES = [
  'Website Design',
  'SEO Strategy',
  'AI Creative',
  'Digital Marketing',
  'Digital Strategy',
  'Conversion Optimization',
  'Case Studies'
] as const;

export const DEFAULT_SEO_THRESHOLD = 90;

export const DAWNEXUS_CORE_URLS = [
  'https://dawnexus.in/',
  'https://dawnexus.in',
  '/',
  'https://dawnexus.in/services/website-design',
  '/services/website-design',
  'https://dawnexus.in/services/seo-services',
  '/services/seo-services',
  'https://dawnexus.in/services/ai-video-creation',
  '/services/ai-video-creation',
  'https://dawnexus.in/services/digital-marketing',
  '/services/digital-marketing',
  'https://dawnexus.in/website-cost-calculator',
  '/website-cost-calculator',
  'https://dawnexus.in/blog',
  '/blog',
  '/services',
  '/contact',
  '/pricing',
  '/about',
  '/work',
  '/portfolio',
  '/admin'
];

/**
 * Extracts all URLs from markdown and HTML content
 */
export function extractLinks(content: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  
  // Markdown links: [text](href)
  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(content)) !== null) {
    links.push({ text: match[1].trim(), href: match[2].trim() });
  }

  // HTML links: <a href="...">text</a>
  const htmlRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  while ((match = htmlRegex.exec(content)) !== null) {
    const rawText = match[2].replace(/<[^>]*>/g, '').trim();
    links.push({ text: rawText, href: match[1].trim() });
  }

  return links;
}

/**
 * Normalizes a URL or path for Dawnexus domain comparison
 */
export function normalizeDawnexusPath(href: string): string {
  if (!href) return '';
  const trimmed = href.trim();
  if (trimmed.startsWith('#')) return trimmed;

  let clean = trimmed.split('#')[0].split('?')[0];
  clean = clean.replace(/^https?:\/\/(www\.)?dawnexus\.in/i, '');
  clean = clean.replace(/^https?:\/\/localhost(:\d+)?/i, '');

  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }

  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.replace(/\/+$/, '');
  }

  return clean;
}

/**
 * Validates whether an internal link targets an authentic Dawnexus page or published blog
 */
export function isValidDawnexusInternalLink(href: string, validSlugs: string[] = []): boolean {
  if (!href) return false;
  const trimmed = href.trim();

  // Anchor links on single-page sections (e.g. #contact, #pricing, #services)
  if (trimmed.startsWith('#')) {
    return true;
  }

  const clean = normalizeDawnexusPath(trimmed);
  if (clean === '/' || clean === '') {
    return true;
  }

  const validStaticPaths = [
    '/',
    '/blog',
    '/website-cost-calculator',
    '/services/website-design',
    '/services/seo-services',
    '/services/ai-video-creation',
    '/services/digital-marketing',
    '/services',
    '/contact',
    '/pricing',
    '/about',
    '/work',
    '/portfolio',
    '/admin'
  ];

  if (validStaticPaths.includes(clean.toLowerCase())) {
    return true;
  }

  // Check blog slug format: /blog/<slug>
  if (clean.startsWith('/blog/')) {
    const slug = clean.substring('/blog/'.length).replace(/\/+$/, '');
    if (slug) {
      if (validSlugs.length === 0 || validSlugs.includes(slug)) {
        return true;
      }
      return validSlugs.includes(slug);
    }
  }

  return false;
}

/**
 * Deterministically audits a blog draft against the 100-point rubric
 */
export function calculateSeoScore(
  blog: BlogAuditInput,
  existingSlugs: string[] = [],
  threshold: number = DEFAULT_SEO_THRESHOLD
): SeoAuditReport {
  const passedChecks: string[] = [];
  const failedChecks: string[] = [];
  const warnings: string[] = [];
  const requiredFixes: string[] = [];

  const rawContent = blog.content || '';
  const textContent = rawContent.replace(/<[^>]*>/g, ' ').replace(/[#*_`~\[\]]/g, ' ');
  const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Headings
  const h1Matches = rawContent.match(/^#\s+[^\n]+|<h1[^>]*>.*?<\/h1>/gim) || [];
  const h2Matches = rawContent.match(/^##\s+[^\n]+|<h2[^>]*>.*?<\/h2>/gim) || [];
  const h3Matches = rawContent.match(/^###\s+[^\n]+|<h3[^>]*>.*?<\/h3>/gim) || [];
  const headingCount = {
    h1: h1Matches.length,
    h2: h2Matches.length,
    h3: h3Matches.length
  };

  // Keywords
  const primaryKw = (blog.primary_keyword || '').trim().toLowerCase();
  let secondaryKws: string[] = [];
  if (Array.isArray(blog.secondary_keywords)) {
    secondaryKws = blog.secondary_keywords.map(k => String(k).trim().toLowerCase()).filter(Boolean);
  } else if (typeof blog.secondary_keywords === 'string') {
    try {
      const parsed = JSON.parse(blog.secondary_keywords);
      if (Array.isArray(parsed)) secondaryKws = parsed.map(k => String(k).trim().toLowerCase()).filter(Boolean);
    } catch {
      secondaryKws = blog.secondary_keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    }
  }

  let keywordOccurrences = 0;
  if (primaryKw) {
    const kwRegex = new RegExp(`\\b${primaryKw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    const matches = textContent.match(kwRegex);
    keywordOccurrences = matches ? matches.length : 0;
  }
  const keywordDensity = wordCount > 0 && primaryKw ? (keywordOccurrences / wordCount) * 100 : 0;

  // Links
  const extractedLinks = extractLinks(rawContent);
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  let brokenInternalLinks: string[] = [];

  for (const link of extractedLinks) {
    const isInternal = link.href.startsWith('/') || link.href.includes('dawnexus.in');
    if (isInternal) {
      internalLinksCount++;
      if (!isValidDawnexusInternalLink(link.href, existingSlugs)) {
        brokenInternalLinks.push(link.href);
      }
    } else if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
      externalLinksCount++;
    }
  }

  // Images
  const hasFeaturedImage = Boolean(blog.featured_image && blog.featured_image.trim());
  const hasImageAlt = Boolean(blog.image_alt && blog.image_alt.trim());

  // Category & Slug validation
  const categoryValid = (VALID_CATEGORIES as readonly string[]).includes(blog.category);
  const slugValid = Boolean(blog.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(blog.slug));

  // -------------------------------------------------------------
  // 1. Search Intent & Topic Relevance (Max 15 pts)
  // -------------------------------------------------------------
  let intentScore = 0;
  const intentNotes: string[] = [];
  const validIntents = ['Informational', 'Commercial Investigation', 'Transactional', 'Navigational'];
  
  if (blog.search_intent && validIntents.includes(blog.search_intent)) {
    intentScore += 5;
    passedChecks.push(`Search intent clearly classified as '${blog.search_intent}'.`);
  } else {
    intentNotes.push('Search intent missing or not properly classified.');
    warnings.push('Specify a valid search intent (Informational, Commercial Investigation, Transactional, Navigational).');
  }

  if (categoryValid) {
    intentScore += 5;
    passedChecks.push(`Category '${blog.category}' aligns with verified Dawnexus service taxonomy.`);
  } else {
    failedChecks.push(`Invalid category '${blog.category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    requiredFixes.push(`Change category to an official Dawnexus category.`);
  }

  if (blog.target_audience && blog.target_audience.trim().length >= 5) {
    intentScore += 5;
    passedChecks.push('Target audience clearly identified.');
  } else {
    intentScore += 3;
    warnings.push('Provide a more descriptive target audience to sharpen topical focus.');
  }

  // -------------------------------------------------------------
  // 2. Title, Slug & Metadata (Max 15 pts)
  // -------------------------------------------------------------
  let metaScore = 0;
  const metaNotes: string[] = [];

  // Title: 40-70 characters is ideal for SERP snippets
  const titleLen = (blog.title || '').trim().length;
  if (titleLen >= 30 && titleLen <= 70) {
    metaScore += 4;
    passedChecks.push(`Article title length (${titleLen} chars) is optimal for SERP display.`);
  } else if (titleLen > 0) {
    metaScore += 2;
    warnings.push(`Title length is ${titleLen} characters. 40-65 characters is recommended for search snippets.`);
  } else {
    failedChecks.push('Article title is missing.');
    requiredFixes.push('Add an article title.');
  }

  // Slug check
  if (slugValid) {
    metaScore += 4;
    passedChecks.push(`Slug '${blog.slug}' is URL-friendly and lowercase kebab-case.`);
  } else {
    metaNotes.push('Slug is invalid or missing.');
    failedChecks.push('Slug must be non-empty lowercase kebab-case.');
    requiredFixes.push('Generate a clean lowercase kebab-case slug.');
  }

  // Meta description: 110-165 characters (falls back to excerpt if meta_description is not explicitly provided)
  const metaDesc = (blog.meta_description || blog.excerpt || '').trim();
  const metaDescLen = metaDesc.length;
  if (metaDescLen >= 110 && metaDescLen <= 165) {
    metaScore += 4;
    passedChecks.push(`Meta description length (${metaDescLen} chars) fits standard search snippets.`);
  } else if (metaDescLen > 0) {
    metaScore += 2;
    warnings.push(`Meta description is ${metaDescLen} characters (120-160 characters recommended).`);
  } else {
    metaNotes.push('Meta description is missing.');
    warnings.push('Provide a compelling meta description.');
  }

  // Canonical URL (defaults to official Dawnexus blog format https://dawnexus.in/blog/<slug>)
  const canonicalUrl = (blog.canonical_url || (blog.slug ? `https://dawnexus.in/blog/${blog.slug}` : '')).trim();
  if (canonicalUrl && (canonicalUrl.startsWith('https://dawnexus.in/blog/') || canonicalUrl.startsWith('/blog/'))) {
    metaScore += 3;
    passedChecks.push('Canonical URL follows official Dawnexus conventions.');
  } else {
    metaScore += 1;
    warnings.push('Canonical URL should point to https://dawnexus.in/blog/<slug>.');
  }

  // -------------------------------------------------------------
  // 3. Heading Hierarchy & Structure (Max 15 pts)
  // -------------------------------------------------------------
  let headingScore = 0;
  const headingNotes: string[] = [];

  // H1 should be present once (or handled by page title template, but in markdown usually max 1)
  if (headingCount.h1 <= 1) {
    headingScore += 5;
    passedChecks.push('H1 usage adheres to single primary heading guideline.');
  } else {
    warnings.push(`Found ${headingCount.h1} H1 tags in content. Multiple H1 tags can dilute topic hierarchy.`);
  }

  // H2 headings (at least 2 required for structured guide)
  if (headingCount.h2 >= 3) {
    headingScore += 6;
    passedChecks.push(`Content is well-structured with ${headingCount.h2} H2 section headings.`);
  } else if (headingCount.h2 >= 1) {
    headingScore += 3;
    warnings.push('Add at least 3 distinct H2 sub-sections for thorough coverage.');
  } else {
    headingNotes.push('No H2 subheadings found in article content.');
    failedChecks.push('Article lacks structured H2 headings.');
    requiredFixes.push('Organize the content with structured H2 subheadings.');
  }

  // H3 headings
  if (headingCount.h3 >= 1) {
    headingScore += 4;
    passedChecks.push(`Sub-sections utilize H3 headings (${headingCount.h3}) for deep topical breakdown.`);
  } else {
    headingScore += 2;
    headingNotes.push('Consider adding H3 headings under major sections for easier scanning.');
  }

  // -------------------------------------------------------------
  // 4. Helpful, Original & Sufficiently Detailed Content (Max 20 pts)
  // -------------------------------------------------------------
  let contentScore = 0;
  const contentNotes: string[] = [];

  if (wordCount >= 800) {
    contentScore += 12;
    passedChecks.push(`Comprehensive word count (${wordCount} words) provides in-depth informational depth.`);
  } else if (wordCount >= 500) {
    contentScore += 8;
    warnings.push(`Article is ${wordCount} words. Expanding beyond 800 words ensures thorough topical coverage.`);
  } else if (wordCount >= 200) {
    contentScore += 4;
    warnings.push(`Article is short (${wordCount} words). Expand content with practical explanations.`);
  } else {
    failedChecks.push(`Article content is too short (${wordCount} words). Minimum 300 words required for quality.`);
    requiredFixes.push('Expand the article with detailed practical insights and explanations.');
  }

  // Check introduction and conclusion presence
  const hasIntro = textContent.slice(0, 400).length >= 100;
  const hasConclusion = /conclusion|summary|next steps|wrap-up|final thoughts/i.test(rawContent);

  if (hasIntro && hasConclusion) {
    contentScore += 8;
    passedChecks.push('Article contains clear introduction and dedicated conclusion/next steps.');
  } else if (hasIntro) {
    contentScore += 4;
    warnings.push('Include a clear conclusion section summarizing key takeaways.');
  } else {
    contentNotes.push('Article introduction or conclusion is incomplete.');
  }

  // -------------------------------------------------------------
  // 5. Primary and Related Keyword Coverage (Max 10 pts)
  // -------------------------------------------------------------
  let kwScore = 0;
  const kwNotes: string[] = [];

  if (primaryKw) {
    // In title
    const inTitle = (blog.title || '').toLowerCase().includes(primaryKw);
    if (inTitle) {
      kwScore += 3;
      passedChecks.push(`Primary keyword '${primaryKw}' appears naturally in the title.`);
    } else {
      warnings.push(`Consider including primary keyword '${primaryKw}' in the article title.`);
    }

    // In content with natural density (0.5% - 2.5%)
    if (keywordDensity >= 0.3 && keywordDensity <= 3.0) {
      kwScore += 4;
      passedChecks.push(`Primary keyword density is balanced (${keywordDensity.toFixed(2)}%, ${keywordOccurrences} occurrences).`);
    } else if (keywordOccurrences > 0 && keywordDensity > 3.0) {
      kwScore += 2;
      warnings.push(`Primary keyword density (${keywordDensity.toFixed(2)}%) is high. Avoid keyword stuffing.`);
    } else if (keywordOccurrences > 0) {
      kwScore += 2;
      warnings.push(`Primary keyword occurs only ${keywordOccurrences} time(s). Include it in key sub-sections.`);
    } else {
      failedChecks.push(`Primary keyword '${primaryKw}' was not found in the body content.`);
      requiredFixes.push(`Integrate primary keyword '${primaryKw}' naturally into the article.`);
    }

    // Secondary keywords
    if (secondaryKws.length > 0) {
      const foundSec = secondaryKws.filter(sk => textContent.toLowerCase().includes(sk));
      if (foundSec.length >= Math.min(2, secondaryKws.length)) {
        kwScore += 3;
        passedChecks.push(`Secondary keywords covered: ${foundSec.join(', ')}.`);
      } else {
        kwScore += 1;
        warnings.push(`Integrate remaining secondary keywords: ${secondaryKws.filter(sk => !foundSec.includes(sk)).join(', ')}.`);
      }
    } else {
      kwScore += 1;
    }
  } else {
    failedChecks.push('Primary keyword is not specified.');
    requiredFixes.push('Define a target primary keyword.');
  }

  // -------------------------------------------------------------
  // 6. Relevant Internal Linking (Max 10 pts)
  // -------------------------------------------------------------
  let linkScore = 0;
  const linkNotes: string[] = [];

  if (brokenInternalLinks.length > 0) {
    failedChecks.push(`Broken internal links detected: ${brokenInternalLinks.join(', ')}.`);
    requiredFixes.push(`Update internal links to match valid Dawnexus URLs or blog slugs.`);
  }

  if (internalLinksCount >= 2 && brokenInternalLinks.length === 0) {
    linkScore += 10;
    passedChecks.push(`Contains ${internalLinksCount} valid internal link(s) connecting to Dawnexus services/insights.`);
  } else if (internalLinksCount === 1 && brokenInternalLinks.length === 0) {
    linkScore += 6;
    passedChecks.push('Contains 1 valid internal link. Adding 1-2 more contextual links is recommended.');
  } else {
    linkNotes.push('Insufficient internal links.');
    warnings.push('Add at least 2 relevant internal links to Dawnexus core services (e.g. /services/website-design or /services/seo-services).');
  }

  // -------------------------------------------------------------
  // 7. Featured Image, Alt Text & Accessibility (Max 10 pts)
  // -------------------------------------------------------------
  let imageScore = 0;
  const imageNotes: string[] = [];

  if (hasFeaturedImage) {
    imageScore += 5;
    passedChecks.push('Featured image is attached.');
    if (hasImageAlt) {
      imageScore += 5;
      passedChecks.push(`Descriptive image alt text provided: "${blog.image_alt}".`);
    } else {
      imageNotes.push('Image alt text is missing.');
      warnings.push('Add descriptive alt text to the featured image for accessibility and SEO.');
    }
  } else {
    imageNotes.push('Featured image is pending attachment.');
    warnings.push('Attach a high-resolution featured image before publishing.');
  }

  // -------------------------------------------------------------
  // 8. Readability & Factual Checks (Max 5 pts)
  // -------------------------------------------------------------
  let readScore = 5;
  const readNotes: string[] = [];

  // Check for common placeholders or hallucinated claims
  const hallucinationPatterns = [
    /\[insert\s+/i,
    /lorem ipsum/i,
    /tk tk/i,
    /client xyz/i,
    /our client \w+ saw a 1000%/i
  ];
  for (const pat of hallucinationPatterns) {
    if (pat.test(rawContent)) {
      readScore = Math.max(0, readScore - 3);
      failedChecks.push(`Found placeholder or unverified claim matching: ${pat.source}`);
      requiredFixes.push('Remove generic placeholders or unverified statistics.');
      break;
    }
  }
  if (readScore === 5) {
    passedChecks.push('No draft placeholders or unverified statistical claims detected.');
  }

  // -------------------------------------------------------------
  // Compile Results
  // -------------------------------------------------------------
  const totalScore = intentScore + metaScore + headingScore + contentScore + kwScore + linkScore + imageScore + readScore;
  const percentage = Math.round((totalScore / 100) * 100);

  // Mandatory check enforcement
  const mandatoryFailures: string[] = [];

  if (!categoryValid) {
    mandatoryFailures.push(
      `Invalid category '${blog.category}'. Category must be one of: ${VALID_CATEGORIES.join(', ')}.`
    );
  }

  if (!slugValid) {
    mandatoryFailures.push(
      `Invalid slug '${blog.slug}'. Slug must be non-empty lowercase kebab-case (e.g. 'how-to-optimize-seo').`
    );
  }

  if ((blog.title || '').trim().length === 0) {
    mandatoryFailures.push('Article title is missing or empty.');
  }

  if (wordCount < 150) {
    mandatoryFailures.push(
      `Content length is insufficient (${wordCount} words). Minimum 150 words required for indexing.`
    );
  }

  if (brokenInternalLinks.length > 0) {
    mandatoryFailures.push(
      `Broken internal link(s) detected: ${brokenInternalLinks.join(', ')}. Internal links must point to valid Dawnexus pages or published blog posts.`
    );
  }

  const hasMandatoryFailures = mandatoryFailures.length > 0;
  const meetsThreshold = totalScore >= threshold && !hasMandatoryFailures;
  const recommendations: string[] = Array.from(new Set([...requiredFixes, ...warnings]));

  return {
    totalScore,
    maxScore: 100,
    percentage,
    meetsThreshold,
    threshold,
    criteria: {
      searchIntentAndRelevance: {
        name: 'Search intent and topic relevance',
        maxPoints: 15,
        score: intentScore,
        passed: intentScore >= 12,
        notes: intentNotes
      },
      titleSlugAndMetadata: {
        name: 'Title, slug and metadata',
        maxPoints: 15,
        score: metaScore,
        passed: metaScore >= 12,
        notes: metaNotes
      },
      headingHierarchy: {
        name: 'Heading hierarchy and structure',
        maxPoints: 15,
        score: headingScore,
        passed: headingScore >= 11,
        notes: headingNotes
      },
      contentDepth: {
        name: 'Helpful, original and detailed content',
        maxPoints: 20,
        score: contentScore,
        passed: contentScore >= 16,
        notes: contentNotes
      },
      keywordCoverage: {
        name: 'Primary and related keyword coverage',
        maxPoints: 10,
        score: kwScore,
        passed: kwScore >= 7,
        notes: kwNotes
      },
      internalLinking: {
        name: 'Relevant internal linking',
        maxPoints: 10,
        score: linkScore,
        passed: linkScore >= 6,
        notes: linkNotes
      },
      imageAndAccessibility: {
        name: 'Featured image, alt text and accessibility',
        maxPoints: 10,
        score: imageScore,
        passed: imageScore >= 8,
        notes: imageNotes
      },
      readabilityAndFactual: {
        name: 'Readability and factual checks',
        maxPoints: 5,
        score: readScore,
        passed: readScore >= 4,
        notes: readNotes
      }
    },
    passedChecks,
    failedChecks,
    mandatoryFailures,
    recommendations,
    warnings,
    requiredFixes,
    evaluatedAt: new Date().toISOString(),
    metadata: {
      wordCount,
      headingCount,
      internalLinksCount,
      externalLinksCount,
      keywordOccurrences,
      keywordDensity: Number(keywordDensity.toFixed(2)),
      hasFeaturedImage,
      hasImageAlt,
      categoryValid,
      slugValid
    }
  };
}

/**
 * Normalizes any SEO audit report or external input into a guaranteed, fully typed SeoAuditReport
 * with iterable arrays for mandatoryFailures, recommendations, warnings, and requiredFixes.
 */
export function normalizeSeoReport(report: any): SeoAuditReport {
  if (!report || typeof report !== 'object') {
    return {
      totalScore: 0,
      maxScore: 100,
      percentage: 0,
      meetsThreshold: false,
      threshold: DEFAULT_SEO_THRESHOLD,
      criteria: {},
      passedChecks: [],
      failedChecks: ['No valid SEO report provided.'],
      mandatoryFailures: ['Missing or malformed SEO audit report.'],
      recommendations: ['Perform a full SEO quality audit before scheduling.'],
      warnings: [],
      requiredFixes: ['Perform a full SEO quality audit before scheduling.'],
      evaluatedAt: new Date().toISOString(),
      metadata: {
        wordCount: 0,
        headingCount: { h1: 0, h2: 0, h3: 0 },
        internalLinksCount: 0,
        externalLinksCount: 0,
        keywordOccurrences: 0,
        keywordDensity: 0,
        hasFeaturedImage: false,
        hasImageAlt: false,
        categoryValid: false,
        slugValid: false
      }
    };
  }

  const totalScore = typeof report.totalScore === 'number' && !isNaN(report.totalScore)
    ? report.totalScore
    : (typeof report.score === 'number' && !isNaN(report.score) ? report.score : 0);

  const maxScore = typeof report.maxScore === 'number' ? report.maxScore : 100;
  const percentage = typeof report.percentage === 'number' ? report.percentage : Math.round((totalScore / maxScore) * 100);
  const threshold = typeof report.threshold === 'number' ? report.threshold : DEFAULT_SEO_THRESHOLD;

  const passedChecks = Array.isArray(report.passedChecks) ? report.passedChecks.map(String) : [];
  const failedChecks = Array.isArray(report.failedChecks) ? report.failedChecks.map(String) : [];
  const warnings = Array.isArray(report.warnings) ? report.warnings.map(String) : [];
  const requiredFixes = Array.isArray(report.requiredFixes) ? report.requiredFixes.map(String) : [];

  let mandatoryFailures: string[] = [];
  if (Array.isArray(report.mandatoryFailures)) {
    mandatoryFailures = report.mandatoryFailures.map(String);
  } else if (typeof report.mandatoryFailures === 'string' && report.mandatoryFailures.trim()) {
    mandatoryFailures = [report.mandatoryFailures.trim()];
  } else if (report.hasMandatoryFailures && failedChecks.length > 0) {
    mandatoryFailures = [...failedChecks];
  }

  let recommendations: string[] = [];
  if (Array.isArray(report.recommendations)) {
    recommendations = report.recommendations.map(String);
  } else if (typeof report.recommendations === 'string' && report.recommendations.trim()) {
    recommendations = [report.recommendations.trim()];
  } else {
    recommendations = Array.from(new Set([...requiredFixes, ...warnings]));
  }

  const meetsThreshold = typeof report.meetsThreshold === 'boolean'
    ? report.meetsThreshold
    : (totalScore >= threshold && mandatoryFailures.length === 0);

  return {
    totalScore,
    maxScore,
    percentage,
    meetsThreshold,
    threshold,
    criteria: report.criteria && typeof report.criteria === 'object' ? report.criteria : {},
    passedChecks,
    failedChecks,
    mandatoryFailures,
    recommendations,
    warnings,
    requiredFixes,
    evaluatedAt: typeof report.evaluatedAt === 'string' ? report.evaluatedAt : new Date().toISOString(),
    metadata: {
      wordCount: Number(report.metadata?.wordCount) || 0,
      headingCount: {
        h1: Number(report.metadata?.headingCount?.h1) || 0,
        h2: Number(report.metadata?.headingCount?.h2) || 0,
        h3: Number(report.metadata?.headingCount?.h3) || 0
      },
      internalLinksCount: Number(report.metadata?.internalLinksCount) || 0,
      externalLinksCount: Number(report.metadata?.externalLinksCount) || 0,
      keywordOccurrences: Number(report.metadata?.keywordOccurrences) || 0,
      keywordDensity: Number(report.metadata?.keywordDensity) || 0,
      hasFeaturedImage: Boolean(report.metadata?.hasFeaturedImage),
      hasImageAlt: Boolean(report.metadata?.hasImageAlt),
      categoryValid: Boolean(report.metadata?.categoryValid),
      slugValid: Boolean(report.metadata?.slugValid)
    }
  };
}

