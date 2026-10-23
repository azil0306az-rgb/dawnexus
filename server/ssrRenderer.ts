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
  bodyHtml?: string;
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

    const bodyHtml = `
      <header class="py-6 px-4 max-w-7xl mx-auto">
        <nav aria-label="Breadcrumb Navigation" class="text-sm text-gray-400 mb-4">
          <a href="/" class="hover:text-white">Home</a> &gt; <span class="text-white">${escapeHtml(service?.title || title)}</span>
        </nav>
      </header>
      <main class="max-w-7xl mx-auto px-4 py-8">
        <article class="max-w-4xl">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">${escapeHtml(title)}</h1>
          <p class="text-lg text-gray-300 leading-relaxed mb-6">${escapeHtml(description)}</p>
          <div class="my-8 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
            <h2 class="text-2xl font-bold text-white mb-4">Key Capabilities &amp; Engineering Focus</h2>
            <p class="text-gray-300 text-sm leading-relaxed mb-4">
              Dawnexus delivers production-grade ${escapeHtml(service?.title || 'digital services')} with deep technical rigor, strict Core Web Vitals adherence, and measurable business ROI.
            </p>
            <div class="flex flex-wrap gap-4 mt-6">
              <a href="/#contact" class="inline-block bg-[#C7FF4D] text-[#050505] font-semibold px-6 py-3 rounded-full">Request Proposal</a>
              <a href="/website-cost-calculator" class="inline-block border border-gray-700 text-white font-semibold px-6 py-3 rounded-full hover:border-gray-500">Calculate Project Cost</a>
            </div>
          </div>
        </article>
      </main>
      <footer class="max-w-7xl mx-auto px-4 py-8 border-t border-white/10 text-xs text-gray-500">
        <div class="flex flex-wrap gap-4">
          <a href="/" class="hover:text-gray-300">Home</a>
          <a href="/services/website-design" class="hover:text-gray-300">Website Design</a>
          <a href="/services/seo-services" class="hover:text-gray-300">SEO Services</a>
          <a href="/services/ai-video-creation" class="hover:text-gray-300">AI Video</a>
          <a href="/services/digital-marketing" class="hover:text-gray-300">Digital Marketing</a>
          <a href="/website-cost-calculator" class="hover:text-gray-300">Cost Calculator</a>
          <a href="/blog" class="hover:text-gray-300">Blog</a>
          <a href="/sitemap.xml" class="hover:text-gray-300">Sitemap</a>
        </div>
      </footer>`;

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
          '@type': 'Organization',
          '@id': `${BASE_URL}/#organization`,
          name: 'Dawnexus',
          url: `${BASE_URL}/`
        },
        url: `${BASE_URL}/services/${serviceSlug}`,
        description
      },
      bodyHtml
    };
  }

  // 3. Website Cost Calculator
  if (cleanPath === '/website-cost-calculator') {
    const bodyHtml = `
      <header class="py-6 px-4 max-w-7xl mx-auto">
        <nav aria-label="Breadcrumb Navigation" class="text-sm text-gray-400 mb-4">
          <a href="/" class="hover:text-white">Home</a> &gt; <span class="text-white">Website Cost Calculator</span>
        </nav>
      </header>
      <main class="max-w-7xl mx-auto px-4 py-8">
        <article class="max-w-4xl">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">Instant Website Cost Calculator India (₹) | Dawnexus</h1>
          <p class="text-lg text-gray-300 leading-relaxed mb-6">
            Calculate an instant, transparent project cost estimate for your new website. Select website type, page count, and custom features in Indian Rupees (₹).
          </p>
          <div class="my-8 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
            <h2 class="text-2xl font-bold text-white mb-4">Transparent Web Development Estimation</h2>
            <p class="text-gray-300 text-sm leading-relaxed mb-4">
              Get detailed line-item visibility into architecture, responsive design, backend features, SEO setup, and maintenance tiers with no hidden surprises.
            </p>
            <div class="flex flex-wrap gap-4 mt-6">
              <a href="/#contact" class="inline-block bg-[#C7FF4D] text-[#050505] font-semibold px-6 py-3 rounded-full">Consult Our Engineers</a>
              <a href="/services/website-design" class="inline-block border border-gray-700 text-white font-semibold px-6 py-3 rounded-full hover:border-gray-500">Website Design Details</a>
            </div>
          </div>
        </article>
      </main>
      <footer class="max-w-7xl mx-auto px-4 py-8 border-t border-white/10 text-xs text-gray-500">
        <div class="flex flex-wrap gap-4">
          <a href="/" class="hover:text-gray-300">Home</a>
          <a href="/services/website-design" class="hover:text-gray-300">Website Design</a>
          <a href="/services/seo-services" class="hover:text-gray-300">SEO Services</a>
          <a href="/services/ai-video-creation" class="hover:text-gray-300">AI Video</a>
          <a href="/services/digital-marketing" class="hover:text-gray-300">Digital Marketing</a>
          <a href="/blog" class="hover:text-gray-300">Blog</a>
          <a href="/sitemap.xml" class="hover:text-gray-300">Sitemap</a>
        </div>
      </footer>`;

    return {
      title: 'Instant Website Cost Calculator India (₹) | Dawnexus',
      description: 'Calculate an instant, transparent project cost estimate for your new website. Select website type, page count, and custom features in Indian Rupees (₹).',
      canonicalUrl: `${BASE_URL}/website-cost-calculator`,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Dawnexus Website Cost Calculator',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        url: `${BASE_URL}/website-cost-calculator`,
        description: 'Instant interactive project estimation tool for modern web development in India.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR'
        }
      },
      bodyHtml
    };
  }

  // 4. Blog Hub
  if (cleanPath === '/blog') {
    const publishedBlogs = getPublishedBlogsForSitemap();
    let blogListHtml = '';
    for (const b of publishedBlogs.slice(0, 30)) {
      blogListHtml += `
        <article class="p-6 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
          <h2 class="text-xl font-bold text-white mb-2">
            <a href="/blog/${escapeAttr(b.slug)}" class="hover:text-[#C7FF4D]">${escapeHtml(b.title)}</a>
          </h2>
          <p class="text-gray-400 text-sm mb-3">${escapeHtml(b.excerpt || b.meta_description || '')}</p>
          <a href="/blog/${escapeAttr(b.slug)}" class="text-xs font-semibold text-[#C7FF4D] hover:underline">Read Article &rarr;</a>
        </article>`;
    }

    const bodyHtml = `
      <header class="py-6 px-4 max-w-7xl mx-auto">
        <nav aria-label="Breadcrumb Navigation" class="text-sm text-gray-400 mb-4">
          <a href="/" class="hover:text-white">Home</a> &gt; <span class="text-white">Blog &amp; Insights</span>
        </nav>
      </header>
      <main class="max-w-7xl mx-auto px-4 py-8">
        <section class="max-w-4xl mb-8">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-4">
            Blog &amp; Insights | Web Engineering &amp; SEO Playbooks
          </h1>
          <p class="text-lg text-gray-300 leading-relaxed">
            Practical playbooks, real-world case studies, and engineering insights on web development, local SEO, AI video, and digital growth from Dawnexus.
          </p>
        </section>
        <section class="max-w-4xl">
          ${blogListHtml}
        </section>
      </main>
      <footer class="max-w-7xl mx-auto px-4 py-8 border-t border-white/10 text-xs text-gray-500">
        <div class="flex flex-wrap gap-4">
          <a href="/" class="hover:text-gray-300">Home</a>
          <a href="/services/website-design" class="hover:text-gray-300">Website Design</a>
          <a href="/services/seo-services" class="hover:text-gray-300">SEO Services</a>
          <a href="/services/ai-video-creation" class="hover:text-gray-300">AI Video</a>
          <a href="/services/digital-marketing" class="hover:text-gray-300">Digital Marketing</a>
          <a href="/website-cost-calculator" class="hover:text-gray-300">Cost Calculator</a>
          <a href="/sitemap.xml" class="hover:text-gray-300">Sitemap</a>
        </div>
      </footer>`;

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
      },
      bodyHtml
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

      const bodyHtml = `
        <header class="py-6 px-4 max-w-7xl mx-auto">
          <nav aria-label="Breadcrumb Navigation" class="text-sm text-gray-400 mb-4">
            <a href="/" class="hover:text-white">Home</a> &gt; <a href="/blog" class="hover:text-white">Blog</a> &gt; <span class="text-white">${escapeHtml(blog.title)}</span>
          </nav>
        </header>
        <main class="max-w-4xl mx-auto px-4 py-8">
          <article>
            <header class="mb-8">
              <h1 class="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-4">${escapeHtml(blog.title)}</h1>
              <div class="text-sm text-gray-400 flex flex-wrap gap-4 items-center">
                <span>By ${escapeHtml(blog.author || 'Dawnexus Editorial')}</span>
                <span>•</span>
                <time datetime="${escapeAttr(blog.published_at || blog.created_at || '')}">${escapeHtml((blog.published_at || blog.created_at || '').split('T')[0])}</time>
                <span>•</span>
                <span>${escapeHtml(blog.reading_time || '5 min read')}</span>
              </div>
            </header>
            <div class="text-lg text-gray-300 leading-relaxed mb-6 font-medium border-l-4 border-[#C7FF4D] pl-4">
              ${escapeHtml(blog.excerpt || blog.meta_description || '')}
            </div>
            <div class="prose prose-invert max-w-none text-gray-300 leading-relaxed mb-12">
              ${blog.content ? blog.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : ''}
            </div>
            <nav aria-label="Related Links" class="pt-8 border-t border-white/10 flex flex-wrap gap-4">
              <a href="/blog" class="text-[#C7FF4D] text-sm hover:underline">&larr; Back to all articles</a>
              <a href="/services/seo-services" class="text-gray-400 text-sm hover:text-white">Explore SEO Services</a>
              <a href="/website-cost-calculator" class="text-gray-400 text-sm hover:text-white">Calculate Website Cost</a>
            </nav>
          </article>
        </main>
        <footer class="max-w-7xl mx-auto px-4 py-8 border-t border-white/10 text-xs text-gray-500">
          <div class="flex flex-wrap gap-4">
            <a href="/" class="hover:text-gray-300">Home</a>
            <a href="/services/website-design" class="hover:text-gray-300">Website Design</a>
            <a href="/services/seo-services" class="hover:text-gray-300">SEO Services</a>
            <a href="/services/ai-video-creation" class="hover:text-gray-300">AI Video</a>
            <a href="/services/digital-marketing" class="hover:text-gray-300">Digital Marketing</a>
            <a href="/blog" class="hover:text-gray-300">Blog</a>
            <a href="/sitemap.xml" class="hover:text-gray-300">Sitemap</a>
          </div>
        </footer>`;

      return {
        title,
        description,
        canonicalUrl,
        ogImage,
        ogType: 'article',
        schema: JsonLdService.generateArticleSchema(blog),
        bodyHtml
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
    if (modified.includes('id="page-json-ld"')) {
      modified = modified.replace(/<script id=["']page-json-ld["'][^>]*>[\s\S]*?<\/script>/is, jsonLd.trim());
    } else if (modified.includes('</head>')) {
      modified = modified.replace('</head>', `${jsonLd}\n  </head>`);
    }
  }

  // 7. Inject Body HTML fallback inside <div id="root">...</div> if provided
  if (meta.bodyHtml) {
    modified = modified.replace(
      /<div id=["']root["']>[\s\S]*?<\/div>/is,
      `<div id="root">\n${meta.bodyHtml}\n    </div>`
    );
  }

  return modified;
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
