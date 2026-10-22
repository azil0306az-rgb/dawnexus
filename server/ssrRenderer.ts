/**
 * Dawnexus Server-Side Meta & Schema Injection for SPA Routes
 * Solves raw HTML view-source crawler indexability and social previews
 */

import { getBlogBySlug, getPublishedBlogsForSitemap } from './db.js';
import { DEFAULT_SERVICE_PAGES } from './websiteContent.js';
import { JsonLdService } from './jsonLdService.js';

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: 'website' | 'article';
  schema?: object;
  status?: number;
}

const BASE_URL = 'https://www.dawnexus.in';
const DEFAULT_OG_IMAGE = `${BASE_URL}/brand/dawnexus-logo-original.png`;

export function resolvePageMetadata(pathname: string): PageMetadata {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  // 1. Homepage
  if (cleanPath === '/') {
    return {
      title: 'Dawnexus | Web Development, AI Video & Digital Marketing',
      description: 'Dawnexus helps businesses grow with professional website development, AI-powered video creation, digital advertising, SEO, and Google Business Profile optimization.',
      canonicalUrl: `${BASE_URL}/`,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      schema: JsonLdService.generateOrganizationSchema()
    };
  }

  // 2. Service Pages
  const serviceMatch = cleanPath.match(/^\/services\/(website-design|seo-services|ai-video-creation|digital-marketing)$/);
  if (serviceMatch) {
    const serviceSlug = serviceMatch[1];
    const service = DEFAULT_SERVICE_PAGES[serviceSlug];
    const titles: Record<string, string> = {
      'website-design': 'Website Design & Development Services in Coimbatore | Dawnexus',
      'seo-services': 'Search Engine Optimization (SEO) Services in Coimbatore | Dawnexus',
      'ai-video-creation': 'AI Video Creation & Marketing Services | Dawnexus',
      'digital-marketing': 'Performance Digital Marketing & Growth Services | Dawnexus'
    };
    const title = titles[serviceSlug] || `${service?.title || serviceSlug} | Dawnexus`;
    const description = service?.hero_description || service?.hero_subtitle || 'Professional digital services by Dawnexus.';

    return {
      title,
      description,
      canonicalUrl: `${BASE_URL}/services/${serviceSlug}`,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service?.title || title,
        provider: {
          '@type': 'ProfessionalService',
          name: 'Dawnexus',
          url: `${BASE_URL}/`
        },
        url: `${BASE_URL}/services/${serviceSlug}`,
        description
      }
    };
  }

  // 3. Website Cost Calculator
  if (cleanPath === '/website-cost-calculator') {
    return {
      title: 'Instant Website Cost Calculator India (₹) | Dawnexus',
      description: 'Calculate an instant, transparent project cost estimate for your new website. Select website type, page count, and custom features in Indian Rupees (₹).',
      canonicalUrl: `${BASE_URL}/website-cost-calculator`,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Dawnexus Website Cost Calculator',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        url: `${BASE_URL}/website-cost-calculator`,
        description: 'Instant interactive project estimation tool for modern web development in India.'
      }
    };
  }

  // 4. Blog Hub
  if (cleanPath === '/blog') {
    return {
      title: 'Blog & Insights | Web Engineering & SEO Playbooks | Dawnexus',
      description: 'Practical playbooks, real-world case studies, and engineering insights on web development, local SEO, AI video, and digital growth from Dawnexus.',
      canonicalUrl: `${BASE_URL}/blog`,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Dawnexus Insights',
        url: `${BASE_URL}/blog`,
        description: 'Practical web development, local SEO, and digital marketing insights.'
      }
    };
  }

  // 5. Blog Post
  const blogMatch = cleanPath.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const blog = getBlogBySlug(slug);

    if (blog && (blog.status === 'Published' || blog.status === 'Scheduled')) {
      const title = `${blog.seo_title || blog.title} | Dawnexus`;
      const description = blog.meta_description || blog.excerpt || 'Read this article on Dawnexus Insights.';
      const canonicalUrl = `${BASE_URL}/blog/${blog.slug}`;
      const ogImage = blog.featured_image || DEFAULT_OG_IMAGE;

      return {
        title,
        description,
        canonicalUrl,
        ogImage,
        ogType: 'article',
        schema: JsonLdService.generateArticleSchema(blog)
      };
    } else {
      // Blog slug not found in CMS
      return {
        title: 'Article Not Found | Dawnexus',
        description: 'The requested article could not be found or has been moved.',
        canonicalUrl: `${BASE_URL}/blog`,
        ogImage: DEFAULT_OG_IMAGE,
        ogType: 'website',
        status: 404
      };
    }
  }

  // Default fallback for any other route
  return {
    title: 'Dawnexus | Web Development, AI Video & Digital Marketing',
    description: 'Dawnexus helps businesses grow with professional website development, AI-powered video creation, digital advertising, SEO, and Google Business Profile optimization.',
    canonicalUrl: `${BASE_URL}${cleanPath}`,
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website'
  };
}

export function injectPageMetadata(html: string, meta: PageMetadata): string {
  let modified = html;

  // 1. Replace Title
  modified = modified.replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(meta.title)}</title>`);

  // 2. Replace Meta Description
  modified = modified.replace(
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`
  );

  // 3. Replace Canonical
  modified = modified.replace(
    /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/is,
    `<link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}" />`
  );

  // 4. Replace Open Graph Tags
  modified = modified.replace(
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`
  );
  modified = modified.replace(
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`
  );
  modified = modified.replace(
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta property="og:url" content="${escapeAttr(meta.canonicalUrl)}" />`
  );
  modified = modified.replace(
    /<meta\s+property=["']og:type["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta property="og:type" content="${meta.ogType}" />`
  );
  if (meta.ogImage) {
    modified = modified.replace(
      /<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/is,
      `<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`
    );
  }

  // 5. Replace Twitter Tags
  modified = modified.replace(
    /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`
  );
  modified = modified.replace(
    /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`
  );
  modified = modified.replace(
    /<meta\s+name=["']twitter:url["']\s+content=["'].*?["']\s*\/?>/is,
    `<meta name="twitter:url" content="${escapeAttr(meta.canonicalUrl)}" />`
  );
  if (meta.ogImage) {
    modified = modified.replace(
      /<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/is,
      `<meta name="twitter:image" content="${escapeAttr(meta.ogImage)}" />`
    );
  }

  // 6. Inject Schema.org JSON-LD if present
  if (meta.schema) {
    const jsonLd = `\n    <script id="page-json-ld" type="application/ld+json">\n${JSON.stringify(meta.schema, null, 2)}\n    </script>`;
    if (modified.includes('</head>')) {
      modified = modified.replace('</head>', `${jsonLd}\n  </head>`);
    }
  }

  return modified;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
