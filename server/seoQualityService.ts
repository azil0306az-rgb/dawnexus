/**
 * Dawnexus Version 8.3.0 — Advanced Information Gain & Content Quality Engine
 * Evaluates originality, practical expertise, evidence fields, search intent,
 * and topical overlap against existing CMS articles.
 * 
 * NOTE: Transparent editorial quality assessment — NOT a Google ranking score.
 */

import { getBlogById, getBlogBySlug, getPublishedBlogsForSitemap, BlogRecord } from './db.js';

export interface QualityCriterionResult {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'needs_evidence';
  score: number; // 0 to 10
  weight: number; // 1 to 3
  evidenceFound: string;
  missingInformation: string;
  recommendation: string;
}

export interface InformationGainAssessment {
  overallScore: number; // 0 to 100
  overall_score?: number;
  score?: number;
  has_original_data?: boolean;
  answer_blocks_count?: number;
  ai_readiness_score?: number;
  criteria: QualityCriterionResult[];
  strengths: string[];
  missingEvidence: string[];
  actionableFixes: string[];
  recommendations?: string[];
  overlapCheck: {
    hasHighOverlap: boolean;
    similarArticles: Array<{ id: number; title: string; slug: string; matchedKeyword: string }>;
    warningMessage?: string;
  };
  wordCount: number;
  headingsBreakdown: { h2Count: number; h3Count: number };
  disclaimer: string;
}

const BOILERPLATE_PHRASES = [
  /in today'?s fast-?paced (digital|business) world/i,
  /it is important to remember that/i,
  /without further ado/i,
  /in conclusion, it can be said that/i,
  /a dime a dozen/i,
  /in the modern era/i,
  /revolutionize the way we/i,
  /game-?changer for businesses/i
];

export class SeoQualityService {
  /**
   * Evaluates an article's Information Gain and originality
   */
  static assessArticle(article: {
    id?: number;
    title: string;
    slug?: string;
    content: string;
    excerpt?: string;
    primary_keyword?: string;
    secondary_keywords?: string[] | string;
    search_intent?: string;
    target_questions?: string[] | string;
    firsthand_observations?: string;
    project_examples?: string;
    case_studies?: string;
    original_research_data?: string;
    implementation_process?: string;
    external_sources?: string[] | string;
    limitations_lessons?: string;
    author?: string;
    author_role?: string;
    author_bio?: string;
    author_credentials?: string;
    citation_answer_blocks?: any;
  }): InformationGainAssessment {
    const rawContent = article.content || '';
    const plainText = rawContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText ? plainText.split(/\s+/).length : 0;

    const h2Matches = rawContent.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
    const h3Matches = rawContent.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];

    // Parse array inputs
    let secKeywords: string[] = [];
    try {
      secKeywords = typeof article.secondary_keywords === 'string'
        ? JSON.parse(article.secondary_keywords)
        : (article.secondary_keywords || []);
    } catch {}

    let extSources: string[] = [];
    try {
      extSources = typeof article.external_sources === 'string'
        ? JSON.parse(article.external_sources)
        : (article.external_sources || []);
    } catch {}

    let targetQuestions: string[] = [];
    try {
      targetQuestions = typeof article.target_questions === 'string'
        ? JSON.parse(article.target_questions)
        : (article.target_questions || []);
    } catch {}

    const criteria: QualityCriterionResult[] = [];
    const strengths: string[] = [];
    const missingEvidence: string[] = [];
    const actionableFixes: string[] = [];

    // 1. Practical Expertise & Firsthand Observations
    const obsText = (article.firsthand_observations || '').trim();
    const projText = (article.project_examples || '').trim();
    if (obsText.length >= 80 || projText.length >= 80) {
      criteria.push({
        id: 'firsthand_expertise',
        label: 'Firsthand Observations & Project Context',
        status: 'pass',
        score: 10,
        weight: 3,
        evidenceFound: `Documented ${obsText.length ? 'firsthand observations' : ''} ${projText.length ? 'and real project examples' : ''}.`,
        missingInformation: 'None',
        recommendation: 'Maintain specific technical observations.'
      });
      strengths.push('Includes verified firsthand observations or concrete project context.');
    } else if (obsText.length > 0 || projText.length > 0) {
      criteria.push({
        id: 'firsthand_expertise',
        label: 'Firsthand Observations & Project Context',
        status: 'warning',
        score: 6,
        weight: 3,
        evidenceFound: 'Brief observations recorded (<80 chars).',
        missingInformation: 'Detailed field observations or named project scenarios are sparse.',
        recommendation: 'Expand with specific real-world implementation nuances encountered during delivery.'
      });
      actionableFixes.push('Elaborate on firsthand technical challenges encountered during actual client builds.');
    } else {
      criteria.push({
        id: 'firsthand_expertise',
        label: 'Firsthand Observations & Project Context',
        status: 'needs_evidence',
        score: 2,
        weight: 3,
        evidenceFound: 'No dedicated firsthand observation or project scenario provided.',
        missingInformation: 'Missing firsthand project evidence. Generic summaries provide lower information gain.',
        recommendation: 'Add at least one real project scenario or field observation under the Original Evidence tab.'
      });
      missingEvidence.push('Firsthand observations or real project delivery examples');
      actionableFixes.push('Document firsthand lessons learned from client engagements under Original Evidence.');
    }

    // 2. Verified Case Studies & Research Data
    const caseText = (article.case_studies || '').trim();
    const researchText = (article.original_research_data || '').trim();
    if (caseText.length >= 100 || researchText.length >= 100) {
      criteria.push({
        id: 'case_study_data',
        label: 'Original Case Studies & Internal Data',
        status: 'pass',
        score: 10,
        weight: 3,
        evidenceFound: 'Verified case study notes or original research figures present.',
        missingInformation: 'None',
        recommendation: 'Ensure all metrics are verified against client sign-offs.'
      });
      strengths.push('Contains original case study details or internal benchmark data.');
    } else if (caseText.length > 0 || researchText.length > 0) {
      criteria.push({
        id: 'case_study_data',
        label: 'Original Case Studies & Internal Data',
        status: 'warning',
        score: 6,
        weight: 3,
        evidenceFound: 'Partial case study or data notes supplied.',
        missingInformation: 'Specific baseline numbers or measurable outcomes.',
        recommendation: 'Add verified metrics (e.g. % load time reduction, conversion lift) where available.'
      });
    } else {
      criteria.push({
        id: 'case_study_data',
        label: 'Original Case Studies & Internal Data',
        status: 'needs_evidence',
        score: 4,
        weight: 3,
        evidenceFound: 'No verified case study or original benchmark data attached.',
        missingInformation: 'Optional for purely conceptual guides, but highly recommended for commercial topics.',
        recommendation: 'Attach an anonymized or approved client case example if available.'
      });
      missingEvidence.push('Original case study or internal benchmark data');
    }

    // 3. Actionable Implementation Process
    const processText = (article.implementation_process || '').trim();
    const hasNumberedLists = /<ol[^>]*>|1\.\s+[A-Z]/i.test(rawContent);
    if (processText.length >= 100 || (hasNumberedLists && h2Matches.length >= 2)) {
      criteria.push({
        id: 'actionable_steps',
        label: 'Actionable Implementation Process',
        status: 'pass',
        score: 10,
        weight: 2,
        evidenceFound: 'Step-by-step implementation process or structured procedural guidance detected.',
        missingInformation: 'None',
        recommendation: 'Preserve clear procedural milestones.'
      });
      strengths.push('Clear actionable process or step-by-step instructions provided.');
    } else {
      criteria.push({
        id: 'actionable_steps',
        label: 'Actionable Implementation Process',
        status: 'warning',
        score: 5,
        weight: 2,
        evidenceFound: 'High-level theory without procedural milestones.',
        missingInformation: 'Step-by-step technical or execution checklist.',
        recommendation: 'Outline a concrete 3-to-5 step implementation process under Original Evidence.'
      });
      actionableFixes.push('Add an actionable implementation workflow so the reader can execute immediately.');
    }

    // 4. Primary External Sources & Authoritative References
    const hasOutboundLinks = /<a[^>]+href=["'](https?:\/\/(?!www\.dawnexus\.in|dawnexus\.in)[^"']+)["'][^>]*>/i.test(rawContent);
    if (extSources.length > 0 || hasOutboundLinks) {
      criteria.push({
        id: 'external_references',
        label: 'Primary Sources & External Documentation',
        status: 'pass',
        score: 9,
        weight: 2,
        evidenceFound: `Referenced ${extSources.length} external source(s) and/or authoritative documentation links.`,
        missingInformation: 'None',
        recommendation: 'Verify external URLs remain active and point to primary documentation.'
      });
      strengths.push('Cites authoritative primary sources or external technical documentation.');
    } else {
      criteria.push({
        id: 'external_references',
        label: 'Primary Sources & External Documentation',
        status: 'warning',
        score: 5,
        weight: 2,
        evidenceFound: 'No outbound primary sources or official documentation links detected.',
        missingInformation: 'Links to official standards (e.g. W3C, Google Search Central, MDN, ISO).',
        recommendation: 'Reference official documentation or research to substantiate factual statements.'
      });
      missingEvidence.push('External primary documentation citations');
      actionableFixes.push('Link to primary documentation (Google Search Central, MDN, W3C) to support key claims.');
    }

    // 5. Practical Limitations & Lessons Learned
    const limitationsText = (article.limitations_lessons || '').trim();
    if (limitationsText.length >= 60) {
      criteria.push({
        id: 'limitations_lessons',
        label: 'Nuance, Trade-offs & Limitations',
        status: 'pass',
        score: 10,
        weight: 2,
        evidenceFound: 'Acknowledges real trade-offs, constraints, or boundary conditions.',
        missingInformation: 'None',
        recommendation: 'Honest trade-offs strengthen reader trust significantly.'
      });
      strengths.push('Demonstrates balanced authority by acknowledging trade-offs and edge-case limitations.');
    } else {
      criteria.push({
        id: 'limitations_lessons',
        label: 'Nuance, Trade-offs & Limitations',
        status: 'warning',
        score: 4,
        weight: 2,
        evidenceFound: 'Presents a one-size-fits-all solution without trade-offs or constraints.',
        missingInformation: 'When does this approach fail or become suboptimal? What are the cost/complexity trade-offs?',
        recommendation: 'Add a brief note explaining limitations or when an alternative approach is superior.'
      });
      actionableFixes.push('State when this strategy might not apply (e.g., budget constraints, scale limits).');
    }

    // 6. Generic Boilerplate Detection
    let boilerplateHits = 0;
    for (const regex of BOILERPLATE_PHRASES) {
      if (regex.test(rawContent)) {
        boilerplateHits++;
      }
    }
    if (boilerplateHits === 0) {
      criteria.push({
        id: 'boilerplate_cleanliness',
        label: 'Fluff & Boilerplate Elimination',
        status: 'pass',
        score: 10,
        weight: 2,
        evidenceFound: 'Clean phrasing with zero detected filler/boilerplate intros.',
        missingInformation: 'None',
        recommendation: 'Keep paragraphs direct and value-dense.'
      });
    } else {
      criteria.push({
        id: 'boilerplate_cleanliness',
        label: 'Fluff & Boilerplate Elimination',
        status: 'warning',
        score: Math.max(3, 10 - (boilerplateHits * 3)),
        weight: 2,
        evidenceFound: `Detected ${boilerplateHits} generic cliché/filler phrase(s).`,
        missingInformation: 'Direct, factual phrasing in opening sentences.',
        recommendation: 'Remove introductory filler phrases (e.g. "In today\'s fast-paced world") in favor of immediate answers.'
      });
      actionableFixes.push('Replace generic introductory filler with immediate, factual explanations.');
    }

    // 7. Author Credibility & E-E-A-T Signals
    const authorRole = (article.author_role || '').trim();
    const authorBio = (article.author_bio || '').trim();
    const authorCreds = (article.author_credentials || '').trim();
    if (authorRole && (authorBio || authorCreds)) {
      criteria.push({
        id: 'author_credibility',
        label: 'E-E-A-T Author Identity & Credentials',
        status: 'pass',
        score: 10,
        weight: 2,
        evidenceFound: `Author role and verified credentials documented (${authorRole}).`,
        missingInformation: 'None',
        recommendation: 'Keep author profile verified and consistent.'
      });
      strengths.push('Author background, professional role, and credentials explicitly verified.');
    } else {
      criteria.push({
        id: 'author_credibility',
        label: 'E-E-A-T Author Identity & Credentials',
        status: 'warning',
        score: 5,
        weight: 2,
        evidenceFound: 'Generic author name without specific professional bio or credentials.',
        missingInformation: 'Author bio, professional experience, or verifiable credentials.',
        recommendation: 'Specify the author role and real engineering background.'
      });
      missingEvidence.push('Author professional background or credentials');
    }

    // 8. Topical Overlap & Keyword Cannibalization Check
    const overlapCheck = this.checkTopicalOverlap(
      article.id,
      article.title,
      article.primary_keyword || '',
      article.slug || ''
    );

    if (overlapCheck.hasHighOverlap) {
      criteria.push({
        id: 'topical_differentiation',
        label: 'Topical Differentiation & Cannibalization',
        status: 'warning',
        score: 4,
        weight: 3,
        evidenceFound: `Potential overlap with ${overlapCheck.similarArticles.length} existing published article(s).`,
        missingInformation: 'Clear differentiation angle or unique search intent distinction.',
        recommendation: overlapCheck.warningMessage || 'Differentiate the primary target angle to avoid internal keyword cannibalization.'
      });
      actionableFixes.push(overlapCheck.warningMessage || 'Differentiate this article from existing published playbooks.');
    } else {
      criteria.push({
        id: 'topical_differentiation',
        label: 'Topical Differentiation & Cannibalization',
        status: 'pass',
        score: 10,
        weight: 3,
        evidenceFound: 'Distinct primary keyword and topical angle compared to published CMS archive.',
        missingInformation: 'None',
        recommendation: 'Create internal links to complementary published articles.'
      });
      strengths.push('Topically unique with low risk of keyword cannibalization.');
    }

    // Calculate weighted score
    let totalWeight = 0;
    let earnedWeight = 0;
    for (const c of criteria) {
      totalWeight += (c.weight * 10);
      earnedWeight += (c.weight * c.score);
    }
    const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 70;

    const hasOriginalData = Boolean(
      article.firsthand_observations ||
      article.project_examples ||
      article.case_studies ||
      article.original_research_data
    );

    let answerBlocks: any[] = [];
    try {
      answerBlocks = typeof (article as any).citation_answer_blocks === 'string'
        ? JSON.parse((article as any).citation_answer_blocks)
        : ((article as any).citation_answer_blocks || []);
    } catch {}

    return {
      overallScore,
      overall_score: overallScore,
      score: overallScore,
      has_original_data: hasOriginalData,
      answer_blocks_count: answerBlocks.length,
      ai_readiness_score: Math.min(100, Math.round((answerBlocks.length * 35) + (hasOriginalData ? 30 : 0))),
      criteria,
      strengths,
      missingEvidence,
      actionableFixes,
      recommendations: actionableFixes,
      overlapCheck,
      wordCount: words,
      headingsBreakdown: {
        h2Count: h2Matches.length,
        h3Count: h3Matches.length
      },
      disclaimer: 'Internal editorial quality assessment designed to maximize information gain and technical rigor. This is NOT an official Google ranking factor.'
    };
  }

  /**
   * Checks whether the proposed article has high topical overlap with existing published articles
   */
  static checkTopicalOverlap(
    currentId?: number,
    title: string = '',
    primaryKeyword: string = '',
    slug: string = ''
  ): {
    hasHighOverlap: boolean;
    similarArticles: Array<{ id: number; title: string; slug: string; matchedKeyword: string }>;
    warningMessage?: string;
  } {
    try {
      const sitemapBlogs = getPublishedBlogsForSitemap();
      if (!sitemapBlogs || sitemapBlogs.length === 0) {
        return { hasHighOverlap: false, similarArticles: [] };
      }

      const normKeyword = primaryKeyword.trim().toLowerCase();
      const normSlug = slug.trim().toLowerCase();
      const normTitle = title.trim().toLowerCase();

      const matched: Array<{ id: number; title: string; slug: string; matchedKeyword: string }> = [];

      for (const item of sitemapBlogs) {
        const published = getBlogBySlug(item.slug);
        if (!published || (currentId && published.id === currentId)) {
          continue;
        }

        const pubKeyword = (published.primary_keyword || '').trim().toLowerCase();
        const pubSlug = (published.slug || '').trim().toLowerCase();
        const pubTitle = (published.title || '').trim().toLowerCase();

        // Check exact or partial keyword match
        let isMatch = false;
        let reason = '';

        if (normKeyword && pubKeyword && normKeyword === pubKeyword) {
          isMatch = true;
          reason = `Exact primary keyword match ("${published.primary_keyword}")`;
        } else if (normSlug && pubSlug && (normSlug.includes(pubSlug) || pubSlug.includes(normSlug))) {
          isMatch = true;
          reason = `High URL slug similarity ("${published.slug}")`;
        } else if (normTitle && pubTitle && this.calculateJaccardSimilarity(normTitle, pubTitle) > 0.6) {
          isMatch = true;
          reason = `Substantial title similarity ("${published.title}")`;
        }

        if (isMatch) {
          matched.push({
            id: published.id,
            title: published.title,
            slug: published.slug,
            matchedKeyword: reason
          });
        }
      }

      return {
        hasHighOverlap: matched.length > 0,
        similarArticles: matched,
        warningMessage: matched.length > 0
          ? `Topical overlap detected with published article: "${matched[0].title}" (${matched[0].matchedKeyword}). Consider cross-linking or differentiating the target intent.`
          : undefined
      };
    } catch {
      return { hasHighOverlap: false, similarArticles: [] };
    }
  }

  private static calculateJaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const set2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
  }
}

export function assessInformationGain(article: any): InformationGainAssessment {
  return SeoQualityService.assessArticle(article);
}

export function detectContentOverlap(article: any, _existingArticles?: any[]) {
  return SeoQualityService.checkTopicalOverlap(article.id, article.title, article.primary_keyword, article.slug);
}
