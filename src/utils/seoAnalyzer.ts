import { SeoAuditResult, SeoCheck } from '../types';

export interface SeoAnalysisInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML or markdown
  featured_image: string;
  image_alt: string;
  primary_keyword: string;
  secondary_keywords: string[];
  target_location: string;
  search_intent: string;
  seo_title: string;
  meta_description: string;
}

export function analyzeSeo(input: SeoAnalysisInput): SeoAuditResult {
  const checks: SeoCheck[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Text normalization & plain text extraction
  const rawContent = input.content || '';
  const plainText = rawContent
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .replace(/[#*_~`\[\]()]/g, ' ') // Strip markdown chars
    .replace(/\s+/g, ' ')
    .trim();

  const words = plainText.length > 0 ? plainText.split(/\s+/).filter(w => w.length > 0) : [];
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const primaryKeyword = (input.primary_keyword || '').trim().toLowerCase();
  const title = (input.title || '').trim();
  const seoTitle = (input.seo_title || title).trim();
  const metaDesc = (input.meta_description || input.excerpt || '').trim();
  const slug = (input.slug || '').trim().toLowerCase();

  // Extract headings from HTML or markdown
  const h2Matches = rawContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || rawContent.match(/^##\s+.+$/gm) || [];
  const h3Matches = rawContent.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || rawContent.match(/^###\s+.+$/gm) || [];
  const h1Matches = rawContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || rawContent.match(/^#\s+.+$/gm) || [];

  const headingsCount = {
    h1: h1Matches.length,
    h2: h2Matches.length,
    h3: h3Matches.length
  };

  const allHeadingsText = [...h2Matches, ...h3Matches]
    .map(h => h.replace(/<[^>]*>/g, '').replace(/^#+\s*/, '').toLowerCase())
    .join(' ');

  // Extract first 150 words (introduction)
  const introWords = words.slice(0, 150).join(' ').toLowerCase();

  // Keyword counts & presence
  const keywordCounts: { keyword: string; count: number; inTitle: boolean; inHeading: boolean; inIntro: boolean }[] = [];

  let primaryOccurrences = 0;
  if (primaryKeyword) {
    // Escape regex
    const escaped = primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = plainText.match(regex);
    primaryOccurrences = matches ? matches.length : 0;

    const inTitle = seoTitle.toLowerCase().includes(primaryKeyword) || title.toLowerCase().includes(primaryKeyword);
    const inHeading = allHeadingsText.includes(primaryKeyword);
    const inIntro = introWords.includes(primaryKeyword);

    keywordCounts.push({
      keyword: input.primary_keyword,
      count: primaryOccurrences,
      inTitle,
      inHeading,
      inIntro
    });
  }

  // Secondary keywords check
  if (Array.isArray(input.secondary_keywords)) {
    for (const sec of input.secondary_keywords) {
      const secTrimmed = sec.trim();
      if (!secTrimmed) continue;
      const escaped = secTrimmed.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = plainText.match(regex);
      const count = matches ? matches.length : 0;
      keywordCounts.push({
        keyword: secTrimmed,
        count,
        inTitle: seoTitle.toLowerCase().includes(secTrimmed.toLowerCase()),
        inHeading: allHeadingsText.includes(secTrimmed.toLowerCase()),
        inIntro: introWords.includes(secTrimmed.toLowerCase())
      });
    }
  }

  // Count links in content
  const linkMatches = rawContent.match(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>/gi) || rawContent.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  let internalLinksCount = 0;
  let outboundLinksCount = 0;

  for (const linkTag of linkMatches) {
    if (
      linkTag.includes('/services/') ||
      linkTag.includes('/blog') ||
      linkTag.includes('dawnexus.in') ||
      linkTag.includes('#contact') ||
      linkTag.startsWith('/') ||
      linkTag.startsWith('#')
    ) {
      internalLinksCount++;
    } else if (linkTag.includes('http://') || linkTag.includes('https://')) {
      outboundLinksCount++;
    }
  }

  // Check image alt
  const hasImagesWithAlt = Boolean(
    (input.featured_image && input.image_alt && input.image_alt.trim().length >= 5) ||
    rawContent.includes('alt="')
  );

  // --- INDIVIDUAL AUDIT CHECKS ---

  // Check 1: Primary Keyword Defined
  if (!primaryKeyword) {
    checks.push({
      id: 'primary-keyword',
      label: 'Primary Keyword',
      status: 'fail',
      message: 'No target primary keyword specified. Define one to guide search intent.',
      score: 0
    });
    recommendations.push('Enter a clear primary keyword (e.g., "website design in Coimbatore").');
  } else {
    checks.push({
      id: 'primary-keyword',
      label: 'Primary Keyword',
      status: 'pass',
      message: `Targeting "${input.primary_keyword}"`,
      score: 10
    });
  }

  // Check 2: Title Length & Keyword
  const titleLen = seoTitle.length;
  if (titleLen === 0) {
    checks.push({
      id: 'title-tag',
      label: 'SEO Title',
      status: 'fail',
      message: 'Article title or SEO title is missing.',
      score: 0
    });
  } else if (titleLen < 30) {
    checks.push({
      id: 'title-tag',
      label: 'SEO Title Length',
      status: 'warning',
      message: `Title is short (${titleLen} chars). Ideal range is 40–60 characters.`,
      score: 6
    });
    recommendations.push('Expand the SEO title to be more descriptive and compelling for search clicks.');
  } else if (titleLen > 65) {
    checks.push({
      id: 'title-tag',
      label: 'SEO Title Length',
      status: 'warning',
      message: `Title is long (${titleLen} chars) and may truncate in Google SERPs (>60 chars).`,
      score: 7
    });
    recommendations.push('Shorten the SEO title to under 60 characters to avoid snippet truncation.');
  } else {
    checks.push({
      id: 'title-tag',
      label: 'SEO Title Length',
      status: 'pass',
      message: `Optimal title length (${titleLen} characters).`,
      score: 10
    });
  }

  // Keyword in Title
  if (primaryKeyword) {
    if (seoTitle.toLowerCase().includes(primaryKeyword) || title.toLowerCase().includes(primaryKeyword)) {
      checks.push({
        id: 'title-keyword',
        label: 'Keyword in Title',
        status: 'pass',
        message: 'Primary keyword is prominently featured in the page title.',
        score: 10
      });
    } else {
      checks.push({
        id: 'title-keyword',
        label: 'Keyword in Title',
        status: 'fail',
        message: 'Primary keyword is missing from the SEO Title.',
        score: 0
      });
      recommendations.push(`Include "${input.primary_keyword}" near the beginning of your SEO Title.`);
    }
  }

  // Check 3: Meta Description
  const metaLen = metaDesc.length;
  if (metaLen === 0) {
    checks.push({
      id: 'meta-description',
      label: 'Meta Description',
      status: 'fail',
      message: 'Meta description is empty. Search engines will generate a random snippet.',
      score: 0
    });
    recommendations.push('Write a persuasive 120–160 character meta description containing your target keyword.');
  } else if (metaLen < 80) {
    checks.push({
      id: 'meta-description',
      label: 'Meta Description',
      status: 'warning',
      message: `Meta description is short (${metaLen} chars). Expand to 120–160 chars for maximum SERP real estate.`,
      score: 6
    });
  } else if (metaLen > 165) {
    checks.push({
      id: 'meta-description',
      label: 'Meta Description',
      status: 'warning',
      message: `Meta description is slightly long (${metaLen} chars) and may truncate on mobile screens.`,
      score: 8
    });
  } else {
    const hasKeywordInMeta = primaryKeyword ? metaDesc.toLowerCase().includes(primaryKeyword) : true;
    checks.push({
      id: 'meta-description',
      label: 'Meta Description',
      status: 'pass',
      message: `Optimal meta length (${metaLen} chars)${hasKeywordInMeta ? ' with target keyword' : ''}.`,
      score: 10
    });
  }

  // Check 4: URL Slug
  if (!slug) {
    checks.push({
      id: 'slug',
      label: 'URL Slug',
      status: 'fail',
      message: 'URL slug is missing.',
      score: 0
    });
  } else if (slug.length > 70) {
    checks.push({
      id: 'slug',
      label: 'URL Slug',
      status: 'warning',
      message: 'URL slug is unnecessarily long. Keep it short and focused.',
      score: 6
    });
  } else {
    const slugHasKeyword = primaryKeyword ? slug.includes(primaryKeyword.replace(/\s+/g, '-')) : true;
    checks.push({
      id: 'slug',
      label: 'URL Slug Structure',
      status: 'pass',
      message: `Clean, SEO-friendly slug (${slug})${slugHasKeyword ? ' containing primary keyword' : ''}.`,
      score: 10
    });
  }

  // Check 5: Word Count & Content Depth
  if (wordCount < 250) {
    checks.push({
      id: 'word-count',
      label: 'Content Depth',
      status: 'fail',
      message: `Thin content warning (${wordCount} words). Comprehensive guides should exceed 600+ words.`,
      score: 3
    });
    warnings.push('Content is very short. Thin pages struggle to rank against authoritative competitors.');
  } else if (wordCount < 600) {
    checks.push({
      id: 'word-count',
      label: 'Content Depth',
      status: 'warning',
      message: `Moderate length (${wordCount} words). Elaborate on examples, process steps, or FAQs.`,
      score: 7
    });
  } else {
    checks.push({
      id: 'word-count',
      label: 'Content Depth',
      status: 'pass',
      message: `Excellent comprehensive depth (${wordCount} words, ~${readingTimeMinutes} min read).`,
      score: 10
    });
  }

  // Check 6: Headings Structure (H2, H3)
  if (headingsCount.h2 === 0) {
    checks.push({
      id: 'headings',
      label: 'Heading Structure',
      status: 'fail',
      message: 'No H2 subheadings found. Break your content into structured semantic sections.',
      score: 2
    });
    recommendations.push('Add descriptive <h2> subheadings to organize topics and improve scannability.');
  } else {
    const hasKwInHeading = primaryKeyword ? allHeadingsText.includes(primaryKeyword) : true;
    checks.push({
      id: 'headings',
      label: 'Heading Structure',
      status: 'pass',
      message: `Structured with ${headingsCount.h2} H2 subheadings and ${headingsCount.h3} H3 sections${hasKwInHeading ? ' (keyword included)' : ''}.`,
      score: 10
    });
  }

  // Check 7: Natural Keyword Placement & Over-optimization Check
  if (primaryKeyword && wordCount > 50) {
    const density = (primaryOccurrences / wordCount) * 100;
    const inIntro = introWords.includes(primaryKeyword);

    if (primaryOccurrences === 0) {
      checks.push({
        id: 'keyword-usage',
        label: 'Keyword Presence',
        status: 'fail',
        message: 'Primary keyword does not appear in the body text.',
        score: 0
      });
      recommendations.push(`Naturally introduce "${input.primary_keyword}" within the first paragraph and body.`);
    } else if (density > 3.0) {
      checks.push({
        id: 'keyword-usage',
        label: 'Keyword Naturalness',
        status: 'warning',
        message: `High keyword frequency (${primaryOccurrences} times, ${density.toFixed(1)}%). Potential risk of over-optimization / stuffing.`,
        score: 6
      });
      warnings.push(`Primary keyword appears ${primaryOccurrences} times. Use synonyms and conversational phrasing instead of repetitive phrasing.`);
    } else {
      checks.push({
        id: 'keyword-usage',
        label: 'Keyword Naturalness',
        status: 'pass',
        message: `Natural keyword integration (${primaryOccurrences} times, ${density.toFixed(1)}% density)${inIntro ? ', introduced early' : ''}.`,
        score: 10
      });
    }
  }

  // Check 8: Internal Linking to Dawnexus Core Pages
  if (internalLinksCount === 0) {
    checks.push({
      id: 'internal-links',
      label: 'Internal Links',
      status: 'warning',
      message: 'No internal links to Dawnexus service pages or contact form detected.',
      score: 5
    });
    recommendations.push('Add 1–2 internal links to relevant service pages (/services/website-design, /services/seo-services, etc.) or #contact to pass SEO link equity.');
  } else {
    checks.push({
      id: 'internal-links',
      label: 'Internal Links',
      status: 'pass',
      message: `Includes ${internalLinksCount} internal link${internalLinksCount > 1 ? 's' : ''} connecting readers to Dawnexus capabilities.`,
      score: 10
    });
  }

  // Check 9: Local SEO Signals (if location is specified)
  if (input.target_location && input.target_location.trim().length > 0) {
    const locLower = input.target_location.trim().toLowerCase();
    const city = locLower.split(',')[0].trim();
    const hasLocationMention = plainText.toLowerCase().includes(city) || title.toLowerCase().includes(city);

    if (hasLocationMention) {
      checks.push({
        id: 'local-seo',
        label: 'Local Relevance',
        status: 'pass',
        message: `Localized for ${input.target_location} with contextual mentions in copy.`,
        score: 10
      });
    } else {
      checks.push({
        id: 'local-seo',
        label: 'Local Relevance',
        status: 'warning',
        message: `Target location "${city}" is not mentioned in the article copy or headings.`,
        score: 6
      });
      recommendations.push(`Mention local market context for ${city} (market challenges, regional businesses, local demand) to boost local search rankings.`);
    }
  }

  // Check 10: Featured Image & Alt Text
  if (!input.featured_image) {
    checks.push({
      id: 'images',
      label: 'Visual Media',
      status: 'info',
      message: 'No featured image selected. Adding an editorial visual boosts social sharing CTR.',
      score: 8
    });
  } else if (!input.image_alt || input.image_alt.trim().length < 4) {
    checks.push({
      id: 'images',
      label: 'Image Alt Text',
      status: 'warning',
      message: 'Featured image is missing descriptive alt text for accessibility and Google Image search.',
      score: 6
    });
    recommendations.push('Add descriptive alt text for the featured image describing the visual concept.');
  } else {
    checks.push({
      id: 'images',
      label: 'Image Optimization',
      status: 'pass',
      message: 'Featured image is set with descriptive alt text.',
      score: 10
    });
  }

  // Calculate overall score (weighted average)
  const totalPointsPossible = checks.length * 10;
  const totalPointsEarned = checks.reduce((sum, c) => sum + c.score, 0);
  const score = totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0;

  return {
    score,
    checks,
    wordCount,
    readingTimeMinutes,
    headingsCount,
    keywordCounts,
    internalLinksCount,
    outboundLinksCount,
    hasImagesWithAlt,
    warnings,
    recommendations
  };
}

