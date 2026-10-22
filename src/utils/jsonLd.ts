/**
 * Dawnexus Version 8.3.0 — Client-side JSON-LD helper & Schema Validator
 */

import { BlogRecord } from '../types';

export function buildArticleJsonLd(blog: BlogRecord) {
  const canonicalUrl = blog.canonical_url || `https://www.dawnexus.in/blog/${blog.slug}`;
  const ogImage = blog.featured_image || 'https://www.dawnexus.in/brand/dawnexus-logo-original.png';
  const publishedDate = blog.published_at || blog.created_at;
  const modifiedDate = blog.last_reviewed_at || blog.updated_at || blog.published_at || blog.created_at;

  let authorEntity: any;
  if (blog.author_role || blog.author_bio || blog.author_credentials) {
    authorEntity = {
      '@type': 'Person',
      'name': blog.author || 'Karthik V',
      'jobTitle': blog.author_role || 'Technical Architect & SEO Strategist',
      'description': blog.author_bio || undefined,
      'url': 'https://www.dawnexus.in/'
    };
    if (blog.author_credentials) {
      authorEntity.hasCredential = blog.author_credentials;
    }
  } else {
    authorEntity = {
      '@type': 'Organization',
      'name': blog.author || 'Dawnexus Editorial',
      'url': 'https://www.dawnexus.in/'
    };
  }

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': canonicalUrl
    },
    'headline': blog.title,
    'description': blog.meta_description || blog.excerpt || blog.title,
    'image': ogImage,
    'author': authorEntity,
    'publisher': {
      '@type': 'Organization',
      '@id': 'https://www.dawnexus.in/#organization',
      'name': 'Dawnexus',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://www.dawnexus.in/brand/dawnexus-logo-original.png'
      }
    },
    'datePublished': publishedDate,
    'dateModified': modifiedDate,
    'articleSection': blog.category || 'Digital Strategy',
    'inLanguage': 'en-IN'
  };

  if (blog.reviewer_name && blog.reviewer_name.trim()) {
    schema.reviewedBy = {
      '@type': 'Organization',
      'name': blog.reviewer_name.trim()
    };
  }

  let answerBlocks: any[] = [];
  try {
    answerBlocks = typeof blog.citation_answer_blocks === 'string'
      ? JSON.parse(blog.citation_answer_blocks)
      : (blog.citation_answer_blocks || []);
  } catch {}

  if (Array.isArray(answerBlocks) && answerBlocks.length > 0) {
    schema.hasPart = answerBlocks.map(b => ({
      '@type': 'Question',
      'name': b.heading_text || b.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': b.concise_answer || b.answer
      }
    }));
  }

  return schema;
}

export function generatePageJsonLd(pageType: 'home' | 'service' | 'blog' | 'blog_index', data?: any) {
  if (pageType === 'blog' && data) {
    return buildArticleJsonLd(data as BlogRecord);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.dawnexus.in/#organization',
        'name': 'Dawnexus',
        'url': 'https://www.dawnexus.in',
        'logo': 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
        'sameAs': [
          'https://twitter.com/dawnexus',
          'https://linkedin.com/company/dawnexus'
        ]
      },
      {
        '@type': 'LocalBusiness',
        '@id': 'https://www.dawnexus.in/#localbusiness',
        'name': 'Dawnexus',
        'image': 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'Coimbatore',
          'addressRegion': 'Tamil Nadu',
          'addressCountry': 'IN'
        },
        'areaServed': [
          { '@type': 'AdministrativeArea', 'name': 'Coimbatore' },
          { '@type': 'AdministrativeArea', 'name': 'Tamil Nadu' }
        ]
      }
    ]
  };
}

export function validateJsonLdSchema(schema: any): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema) {
    errors.push('Schema object is empty or null.');
    return { isValid: false, errors, warnings };
  }

  if (!schema['@context']) {
    errors.push("Missing required '@context' property.");
  }

  // Check strict rule: NO fabricated Review or AggregateRating
  const jsonStr = JSON.stringify(schema);
  if (jsonStr.includes('"@type":"Review"') || jsonStr.includes('"@type": "Review"') || jsonStr.includes('AggregateRating')) {
    warnings.push("Contains Review or AggregateRating schema. Verify these are genuine customer reviews.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
