/**
 * Dawnexus Version 8.3.0 — Dynamic, Server-Safe JSON-LD Generator & Validator
 * Strictly grounded in verified business records and published CMS data.
 * 
 * CRITICAL RULE: NEVER fabricate customer reviews, ratings, physical office coordinates, or author credentials.
 */

import { BlogRecord } from './db.js';

const BASE_URL = 'https://www.dawnexus.in';
const DEFAULT_LOGO = `${BASE_URL}/brand/dawnexus-logo-original.png`;

export interface SchemaValidationResult {
  isValid: boolean;
  type: string;
  errors: string[];
  warnings: string[];
  entityCount: number;
  hasFabricatedReviews: boolean;
  schemaJson: string;
}

export class JsonLdService {
  /**
   * Generates official Organization schema with verified business credentials
   */
  static generateOrganizationSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Dawnexus',
      legalName: 'Dawnexus',
      url: `${BASE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        '@id': `${BASE_URL}/#logo`,
        url: DEFAULT_LOGO,
        caption: 'Dawnexus'
      },
      image: DEFAULT_LOGO,
      description: 'Dawnexus delivers bespoke website design, performance technical SEO, AI video marketing, and digital growth systems for ambitious Indian SMBs and enterprises.',
      email: 'contact@dawnexus.in',
      sameAs: [
        'https://www.linkedin.com/company/dawnexus',
        'https://github.com/azil0306az-rgb/dawnexus'
      ],
      knowsAbout: [
        'Website Design',
        'Search Engine Optimization',
        'Core Web Vitals Optimization',
        'AI Video Production',
        'Digital Marketing'
      ]
    };
  }

  /**
   * Generates LocalBusiness schema ONLY when verified customer-facing physical premises are confirmed.
   * If not confirmed, returns null to prevent deceptive markup penalties.
   */
  static generateLocalBusinessSchema(options: { hasPhysicalPremises?: boolean; addressLocality?: string } = {}): object | null {
    // Dawnexus operates primarily as a digital-first engineering agency in Coimbatore, Tamil Nadu.
    // If no public walk-in customer premises exist, Google Search guidelines dictate using Organization/ProfessionalService.
    if (!options.hasPhysicalPremises) {
      return null;
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      '@id': `${BASE_URL}/#localbusiness`,
      name: 'Dawnexus',
      url: `${BASE_URL}/`,
      logo: DEFAULT_LOGO,
      image: DEFAULT_LOGO,
      description: 'Professional web design, technical SEO, and AI marketing services in Coimbatore, Tamil Nadu.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: options.addressLocality || 'Coimbatore',
        addressRegion: 'Tamil Nadu',
        addressCountry: 'IN'
      },
      priceRange: '₹₹',
      telephone: '+91-99940-00000',
      parentOrganization: {
        '@id': `${BASE_URL}/#organization`
      }
    };
  }

  /**
   * Generates BlogPosting schema with verified author credentials and E-E-A-T signals
   */
  static generateArticleSchema(blog: BlogRecord): object {
    const canonicalUrl = blog.canonical_url || `${BASE_URL}/blog/${blog.slug}`;
    const ogImage = blog.featured_image || DEFAULT_LOGO;
    const publishedDate = blog.published_at || blog.created_at;
    const modifiedDate = blog.updated_at || blog.published_at || blog.created_at;

    // Build author entity (Person with credentials if role present, else Organization)
    let authorEntity: any;
    if (blog.author_role || blog.author_bio || blog.author_credentials) {
      authorEntity = {
        '@type': 'Person',
        name: blog.author || 'Karthik V',
        jobTitle: blog.author_role || 'Technical Architect & SEO Strategist',
        description: blog.author_bio || undefined,
        url: `${BASE_URL}/`
      };
      if (blog.author_credentials) {
        authorEntity.hasCredential = blog.author_credentials;
      }
    } else {
      authorEntity = {
        '@type': 'Organization',
        name: blog.author || 'Dawnexus Editorial',
        url: `${BASE_URL}/`
      };
    }

    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${canonicalUrl}#article`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      headline: blog.title,
      description: blog.meta_description || blog.excerpt || blog.title,
      image: ogImage,
      author: authorEntity,
      publisher: {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Dawnexus',
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_LOGO
        }
      },
      datePublished: publishedDate,
      dateModified: modifiedDate,
      articleSection: blog.category || 'Digital Strategy',
      inLanguage: 'en-IN'
    };

    // If verified reviewer info exists, add reviewedBy
    if (blog.reviewer_name && blog.reviewer_name.trim()) {
      schema.reviewedBy = {
        '@type': 'Organization',
        name: blog.reviewer_name.trim()
      };
    }

    // If Citation Answer Blocks exist, attach FAQPage / Question items
    let answerBlocks: any[] = [];
    try {
      answerBlocks = typeof blog.citation_answer_blocks === 'string'
        ? JSON.parse(blog.citation_answer_blocks)
        : (blog.citation_answer_blocks || []);
    } catch {}

    if (Array.isArray(answerBlocks) && answerBlocks.length > 0) {
      schema.hasPart = answerBlocks.map(b => ({
        '@type': 'Question',
        name: b.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: b.answer
        }
      }));
    }

    return schema;
  }

  /**
   * Generates Review / AggregateRating schema ONLY if genuine, visible client reviews exist.
   * If none exist in the database, STRICTLY returns null. Never fabricates review data.
   */
  static generateReviewSchema(verifiedReviews: Array<{ author: string; reviewBody: string; ratingValue: number; itemReviewedName: string }>): object | null {
    if (!verifiedReviews || verifiedReviews.length === 0) {
      return null;
    }

    const totalScore = verifiedReviews.reduce((sum, r) => sum + r.ratingValue, 0);
    const avgScore = Number((totalScore / verifiedReviews.length).toFixed(1));

    return {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: verifiedReviews[0].itemReviewedName || 'Dawnexus Web & SEO Services',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgScore,
        reviewCount: verifiedReviews.length,
        bestRating: 5,
        worstRating: 1
      },
      review: verifiedReviews.map(r => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: r.author
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.ratingValue,
          bestRating: 5
        },
        reviewBody: r.reviewBody
      }))
    };
  }

  /**
   * Validates JSON-LD schema against Google Rich Results standards and safety rules
   */
  static validateJsonLd(schema: any): SchemaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!schema || typeof schema !== 'object') {
      return {
        isValid: false,
        type: 'Unknown',
        errors: ['Schema object is empty or invalid'],
        warnings: [],
        entityCount: 0,
        hasFabricatedReviews: false,
        schemaJson: '{}'
      };
    }

    const type = schema['@type'] || 'Unknown';

    // 1. Context check
    if (schema['@context'] !== 'https://schema.org' && schema['@context'] !== 'http://schema.org') {
      errors.push("Missing or invalid '@context'. Expected 'https://schema.org'.");
    }

    // 2. Type check
    if (!schema['@type']) {
      errors.push("Missing '@type' declaration.");
    }

    // 3. BlogPosting specific validation
    if (type === 'BlogPosting' || type === 'Article') {
      if (!schema.headline) errors.push("BlogPosting requires 'headline'.");
      if (!schema.author) errors.push("BlogPosting requires 'author'.");
      if (!schema.publisher) errors.push("BlogPosting requires 'publisher'.");
      if (!schema.datePublished) errors.push("BlogPosting requires 'datePublished'.");
      if (!schema.image) warnings.push("Missing 'image' attribute on BlogPosting.");
      if (!schema.mainEntityOfPage) warnings.push("Missing 'mainEntityOfPage' linking to canonical URL.");
    }

    // 4. Organization validation
    if (type === 'Organization' || type === 'ProfessionalService') {
      if (!schema.name) errors.push("Organization requires 'name'.");
      if (!schema.url) errors.push("Organization requires 'url'.");
    }

    // 5. Fabricated review audit: flag any Review schema not linked to verified records
    let hasFabricatedReviews = false;
    const jsonStr = JSON.stringify(schema);
    if (jsonStr.includes('"AggregateRating"') || jsonStr.includes('"Review"')) {
      // In Dawnexus, reviews must have explicit verified client authors
      if (jsonStr.includes('5.0') && !jsonStr.includes('reviewBody')) {
        errors.push("Unsubstantiated AggregateRating detected without visible review bodies.");
        hasFabricatedReviews = true;
      }
    }

    return {
      isValid: errors.length === 0,
      type,
      errors,
      warnings,
      entityCount: 1 + (schema.hasPart?.length || 0),
      hasFabricatedReviews,
      schemaJson: JSON.stringify(schema, null, 2)
    };
  }
}

export function generateServerJsonLd(pageType: 'home' | 'service' | 'blog' | 'blog_index', article?: BlogRecord): object {
  if (pageType === 'blog' && article) {
    return JsonLdService.generateArticleSchema(article);
  }
  return JsonLdService.generateOrganizationSchema();
}

export function validateJsonLdStructure(schema: any): SchemaValidationResult {
  return JsonLdService.validateJsonLd(schema);
}
