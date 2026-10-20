/**
 * Authoritative Backend Website Content Service
 * Version: Dawnexus 6.1.3
 * 
 * Manages database-controlled content for service pages with:
 * - Immediate live publication without requiring a git commit or Vercel redeployment
 * - In-memory and SQLite caching with instant invalidation
 * - Complete version history and safe rollback
 * - Strict preservation of primary service page titles and canonical URLs
 * - Safe default content fallback so pages never break
 */

export interface ServiceCapability {
  icon: string;
  title: string;
  desc: string;
}

export interface ProcessStep {
  step: string;
  title: string;
  desc: string;
}

export interface PricingPackage {
  name: string;
  badge?: string;
  price: string;
  period?: string;
  description: string;
  popular?: boolean;
  inclusions: string[];
  ctaLabel: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CtaSection {
  title: string;
  desc: string;
  buttonText: string;
}

export interface ServicePageContent {
  id?: number;
  slug: string;
  title: string; // Protected primary service title (immutable by AI)
  canonical_url: string; // Immutable
  hero_badge: string;
  hero_subtitle: string;
  hero_description: string;
  hero_primary_cta: string;
  hero_secondary_cta: string;
  capabilities: ServiceCapability[];
  process_steps: ProcessStep[];
  packages: PricingPackage[];
  faqs: FaqItem[];
  cta_section: CtaSection;
  meta_title: string;
  meta_description: string;
  og_image: string;
  status: 'draft' | 'published';
  version: number;
  created_at?: string;
  updated_at: string;
}

export interface ContentVersionRecord {
  id: number;
  page_slug: string;
  version_number: number;
  content_json: string;
  change_summary: string | null;
  created_by: string;
  is_published: number;
  published_at: string | null;
  created_at: string;
}

export const DEFAULT_SERVICE_PAGES: Record<string, ServicePageContent> = {
  'website-design': {
    slug: 'website-design',
    title: 'Website Design & Development',
    canonical_url: 'https://www.dawnexus.in/services/website-design',
    hero_badge: 'Engineering Digital Credibility',
    hero_subtitle: 'High-Performance Website Design & Engineering Built for Commercial Conversion',
    hero_description: 'We craft fast, responsive, and search-optimized websites that turn casual visitors into high-intent client inquiries.',
    hero_primary_cta: 'Request a Proposal',
    hero_secondary_cta: 'Explore Capabilities',
    capabilities: [
      {
        icon: 'Layout',
        title: 'Responsive Business Websites',
        desc: 'Fluid, cross-device layouts that deliver an intuitive and polished experience on smartphones, tablets, laptops, and desktops.'
      },
      {
        icon: 'Gauge',
        title: 'Conversion-Focused Landing Pages',
        desc: 'Targeted single-page funnels designed with deliberate visual hierarchy, persuasive copywriting, and friction-free user flows.'
      },
      {
        icon: 'Code2',
        title: 'Modern Front-End Engineering',
        desc: 'Built with clean semantic markup, modular component architecture, and modern frameworks that ensure rapid loading and maintainability.'
      },
      {
        icon: 'Sparkles',
        title: 'Brand Visual Modernization',
        desc: 'Complete redesigns for outdated websites, transitioning legacy sites into contemporary, credible brand assets that build immediate trust.'
      },
      {
        icon: 'ShieldCheck',
        title: 'Technical Foundation & SEO Ready',
        desc: 'Engineered with clean metadata, Core Web Vitals optimization, accessible semantic tags, and schema readiness out of the box.'
      },
      {
        icon: 'Layers',
        title: 'Intuitive Content Architecture',
        desc: 'Clear navigation hierarchies and thoughtful content layout that guide visitors smoothly toward taking decisive commercial action.'
      }
    ],
    process_steps: [
      {
        step: '01',
        title: 'Discovery & Wireframing',
        desc: 'We analyze your commercial goals, target user personas, and competitive landscape to establish structural wireframes before styling.'
      },
      {
        step: '02',
        title: 'Design & Visual Systems',
        desc: 'We translate your brand identity into a refined design system with typography, color hierarchy, and bespoke component styling.'
      },
      {
        step: '03',
        title: 'Engineering & Performance Tuning',
        desc: 'We code your website with clean, performant TypeScript and modern CSS, testing responsiveness and cross-browser reliability.'
      },
      {
        step: '04',
        title: 'Quality Assurance & Launch',
        desc: 'Rigorous pre-launch validation covering mobile rendering, speed optimization, contact forms, schema validation, and analytics integration.'
      }
    ],
    packages: [
      {
        name: 'Essential Web',
        badge: 'Startup Foundation',
        price: '₹24,999',
        period: 'one-time',
        description: 'Single-page conversion landing page or clean 3-page business site engineered for rapid market credibility.',
        popular: false,
        inclusions: [
          'Custom modern responsive layout',
          'Mobile & tablet optimization',
          'Interactive enquiry contact form',
          'Core Web Vitals tuning (< 1.5s load)',
          'Standard SEO metadata & schema setup',
          '14 days post-launch support'
        ],
        ctaLabel: 'Choose Essential'
      },
      {
        name: 'Professional Business',
        badge: 'Most Popular',
        price: '₹49,999',
        period: 'one-time',
        description: 'Comprehensive 5-8 page corporate website engineered to position your business as a market leader.',
        popular: true,
        inclusions: [
          '5-8 bespoke page templates',
          'Interactive product / service showcase',
          'Dynamic CMS blog integration',
          'Advanced technical SEO & OpenGraph',
          'Google Analytics 4 & Search Console setup',
          'Lead capture automation & notification',
          '30 days dedicated support'
        ],
        ctaLabel: 'Select Professional'
      },
      {
        name: 'Enterprise Growth',
        badge: 'Custom Architecture',
        price: '₹89,999+',
        period: 'one-time',
        description: 'Fully custom digital platform with bespoke interactive features, calculators, and API integrations.',
        popular: false,
        inclusions: [
          'Full bespoke design & engineering',
          'Custom cost calculators or 3D viewer',
          'CRM & webhook integrations',
          'Multi-step quotation funnels',
          'Database optimization & caching',
          'Dedicated senior engineer support'
        ],
        ctaLabel: 'Consult Enterprise'
      }
    ],
    faqs: [
      {
        question: 'How long does a typical website design project take?',
        answer: 'Our Essential Web builds typically launch in 7-10 business days. Comprehensive Professional Business projects usually take 2-3 weeks including review milestones and QA.'
      },
      {
        question: 'Can I edit website content myself after launch?',
        answer: 'Yes! Dawnexus features an integrated administrative control panel allowing you to easily update text, images, packages, and blog posts without coding.'
      },
      {
        question: 'Is SEO included in the website design packages?',
        answer: 'All our websites are built from the ground up with technical SEO best practices, semantic HTML5, Core Web Vitals optimization, XML sitemaps, and Schema.org structured data.'
      },
      {
        question: 'Will my website look great on mobile phones?',
        answer: 'Every website we engineer is mobile-first, ensuring high-speed rendering, fluid typography, and effortless touch navigation on all smartphone and tablet viewports.'
      }
    ],
    cta_section: {
      title: 'Ready to Elevate Your Digital Brand Presence?',
      desc: 'Schedule a free strategy consultation to discuss your website requirements, conversion goals, and architectural roadmap.',
      buttonText: 'Request a Free Consultation'
    },
    meta_title: 'Website Design & Development | Dawnexus',
    meta_description: 'Custom, high-performance responsive website design and development engineered for brand credibility, lightning-fast speed, and conversion growth.',
    og_image: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
    status: 'published',
    version: 1,
    updated_at: new Date().toISOString()
  },

  'seo-services': {
    slug: 'seo-services',
    title: 'Search Engine Optimization (SEO)',
    canonical_url: 'https://www.dawnexus.in/services/seo-services',
    hero_badge: 'Targeted Organic Search Acquisition',
    hero_subtitle: 'Dominant Search Rankings Engineered to Capture High-Value Organic Demand',
    hero_description: 'Technical SEO, content architecture, and authority building designed to establish sustained organic visibility on Google.',
    hero_primary_cta: 'Get Free SEO Audit',
    hero_secondary_cta: 'View SEO Methodology',
    capabilities: [
      {
        icon: 'Search',
        title: 'Technical SEO Foundations',
        desc: 'Deep audit and remediation of crawlability, indexability, site speed, canonical structures, Core Web Vitals, and mobile usability.'
      },
      {
        icon: 'Target',
        title: 'High-Intent Keyword Targeting',
        desc: 'Data-driven commercial keyword research targeting search queries that potential customers use right when they are ready to buy.'
      },
      {
        icon: 'FileCode',
        title: 'On-Page & Schema Optimization',
        desc: 'Precise optimization of headings, meta titles, descriptions, internal linking structure, and rich JSON-LD schema markup.'
      },
      {
        icon: 'MapPin',
        title: 'Local SEO & Google Business',
        desc: 'Google Business Profile optimization, local citation building, and review strategy to dominate local map pack rankings.'
      },
      {
        icon: 'BookOpen',
        title: 'Content Architecture & Strategy',
        desc: 'Topical authority clusters and high-value search articles that establish industry authority and capture long-tail organic search volume.'
      },
      {
        icon: 'BarChart3',
        title: 'Transparent KPI Reporting',
        desc: 'Monthly performance reports directly linking organic impressions, clicks, keyword rankings, and qualified enquiry conversions.'
      }
    ],
    process_steps: [
      {
        step: '01',
        title: 'Audit & Competitor Analysis',
        desc: 'Comprehensive technical crawl, backlink audit, and competitive search gap analysis to identify immediate ranking opportunities.'
      },
      {
        step: '02',
        title: 'Technical Fixes & On-Page Tuning',
        desc: 'Resolving indexation blockers, accelerating site speed, optimizing meta tags, and structuring semantic internal links.'
      },
      {
        step: '03',
        title: 'Content & Authority Scaling',
        desc: 'Deploying targeted topical content clusters and authority backlinks designed to elevate domain credibility.'
      },
      {
        step: '04',
        title: 'Continuous Monitoring & Growth',
        desc: 'Weekly tracking of keyword rankings, search impressions, and algorithm updates to maintain and expand rank dominance.'
      }
    ],
    packages: [
      {
        name: 'Local Starter SEO',
        badge: 'Local Businesses',
        price: '₹14,999',
        period: '/month',
        description: 'Engineered for local service businesses looking to capture high-intent customers in their city or region.',
        popular: false,
        inclusions: [
          'Google Business Profile optimization',
          'Local citation building & audit',
          'Up to 15 targeted local keywords',
          'On-page technical fixes & schema',
          'Google Search Console monitoring',
          'Monthly transparent KPI report'
        ],
        ctaLabel: 'Start Local SEO'
      },
      {
        name: 'Commercial Growth SEO',
        badge: 'Most Popular',
        price: '₹29,999',
        period: '/month',
        description: 'Comprehensive technical and content SEO designed to drive high-volume inbound commercial enquiries.',
        popular: true,
        inclusions: [
          'Up to 35 high-intent keywords',
          'Full technical SEO remediation',
          '2 publication-ready monthly SEO blogs',
          'Internal link architecture optimization',
          'Competitor rank tracking & alerts',
          'Bi-weekly ranking progress reviews'
        ],
        ctaLabel: 'Accelerate Growth'
      },
      {
        name: 'National Market Authority',
        badge: 'Enterprise Domination',
        price: '₹54,999+',
        period: '/month',
        description: 'Aggressive multi-region or national organic search strategy built to outrank established competitors.',
        popular: false,
        inclusions: [
          'Unlimited tracked keyword targets',
          'Comprehensive topical cluster strategy',
          '4 publication-ready SEO content assets/month',
          'High-authority outreach & link acquisition',
          'Core Web Vitals continuous tuning',
          'Dedicated senior SEO strategist'
        ],
        ctaLabel: 'Scale Authority'
      }
    ],
    faqs: [
      {
        question: 'How long does it take to see results from SEO?',
        answer: 'Initial technical improvements and indexing corrections often show positive signals within 2-4 weeks. Significant ranking jumps and organic traffic scaling typically compound over 3 to 6 months.'
      },
      {
        question: 'Do you guarantee #1 rankings on Google?',
        answer: 'No ethical SEO agency guarantees specific #1 rankings because Google algorithms are third-party and change constantly. We guarantee strict adherence to Google Search Essentials and a proven track record of rank growth.'
      },
      {
        question: 'What is the difference between Local SEO and Organic SEO?',
        answer: 'Local SEO focuses on ranking in Google Maps and local search queries (e.g. "near me" or specific cities). Organic SEO targets broader informational and commercial search terms across states or nationwide.'
      },
      {
        question: 'How do you measure SEO success?',
        answer: 'We measure true business impact: qualified impressions, organic clicks, primary commercial keyword positions, and most importantly, verified customer enquiry conversions.'
      }
    ],
    cta_section: {
      title: 'Ready to Capture High-Intent Organic Search Demand?',
      desc: 'Get an actionable, zero-obligation SEO performance audit of your website and discover your top growth opportunities.',
      buttonText: 'Request Free SEO Audit'
    },
    meta_title: 'Search Engine Optimization (SEO) Services | Dawnexus',
    meta_description: 'Comprehensive SEO services engineered for organic rank dominance, qualified search traffic, and sustainable business revenue.',
    og_image: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
    status: 'published',
    version: 1,
    updated_at: new Date().toISOString()
  },

  'ai-video-creation': {
    slug: 'ai-video-creation',
    title: 'AI Video Creation & Creative Production',
    canonical_url: 'https://www.dawnexus.in/services/ai-video-creation',
    hero_badge: 'Generative Visual Storytelling',
    hero_subtitle: 'Studio-Grade AI Video Production for High-Impact Advertising and Brand Storytelling',
    hero_description: 'Hyper-realistic generative AI video creation, cinematic product reveals, and conversion-focused video advertisements created in days, not months.',
    hero_primary_cta: 'Start Video Project',
    hero_secondary_cta: 'Explore Showcases',
    capabilities: [
      {
        icon: 'Video',
        title: 'Generative Commercial Videos',
        desc: 'Cinematic brand films and advertisements generated using state-of-the-art generative video models with custom lighting and camera choreography.'
      },
      {
        icon: 'Box',
        title: 'Product Concept Visualization',
        desc: 'Transform product blueprints or photos into photorealistic 3D-motion video showcases highlighting craftsmanship and key benefits.'
      },
      {
        icon: 'Mic',
        title: 'Studio Voiceover & Multi-Language Dubbing',
        desc: 'Lifelike neural voiceovers in English, Hindi, and regional languages with emotive intonation and flawless sound engineering.'
      },
      {
        icon: 'Share2',
        title: 'Social Ad Variations (Reels & Shorts)',
        desc: 'High-performing 9:16 vertical video ad creatives tested and formatted for Instagram Reels, YouTube Shorts, and TikTok.'
      },
      {
        icon: 'Film',
        title: 'Cinematic Visual Effects',
        desc: 'AI-assisted visual effects, dynamic text tracking, smooth transitions, and high-energy pacing designed to arrest scrolling thumbs.'
      },
      {
        icon: 'Zap',
        title: 'Rapid Iterative Production',
        desc: 'Produce multiple creative angles, hooks, and calls-to-action in a fraction of the time and cost required for traditional live-action shoots.'
      }
    ],
    process_steps: [
      {
        step: '01',
        title: 'Creative Concept & Scripting',
        desc: 'We draft high-converting hooks, persuasive narrative scripts, and visual storyboards tailored to your target demographic.'
      },
      {
        step: '02',
        title: 'Generative Visual Production',
        desc: 'We generate bespoke, cinematic video scenes using advanced diffusion models, maintaining consistent character and product fidelity.'
      },
      {
        step: '03',
        title: 'Voiceover & Audio Engineering',
        desc: 'Integrating neural voice narration, dynamic sound effects, and licensed background scores that evoke brand emotion.'
      },
      {
        step: '04',
        title: 'Final Polish & Multi-Format Delivery',
        desc: 'Color grading, motion graphics, caption styling, and multi-ratio exports ready for immediate ad campaign deployment.'
      }
    ],
    packages: [
      {
        name: 'Creative Social Sprint',
        badge: 'Short-Form Ads',
        price: '₹19,999',
        period: 'one-time',
        description: 'Pack of 3 high-impact vertical video ads (15-30s) designed for Instagram Reels and Meta ad campaigns.',
        popular: false,
        inclusions: [
          '3 unique short-form video creatives',
          'Hook variation testing options',
          'Studio neural voiceover included',
          'On-screen animated captions',
          'Licensed commercial music',
          'Delivered in 4-5 business days'
        ],
        ctaLabel: 'Order Social Pack'
      },
      {
        name: 'Commercial Product Showcase',
        badge: 'Most Popular',
        price: '₹34,999',
        period: 'one-time',
        description: 'Cinematic 60-second product explainer or brand showcase video with bespoke 3D effects and storytelling.',
        popular: true,
        inclusions: [
          'Full 60s cinematic brand video',
          '16:9 and 9:16 multi-ratio exports',
          'Photorealistic product 3D motion',
          'Custom narrative scriptwriting',
          'Multi-language voiceover options',
          '2 rounds of creative revisions'
        ],
        ctaLabel: 'Produce Showcase'
      },
      {
        name: 'Full Campaign Suite',
        badge: 'Monthly Scaling',
        price: '₹64,999+',
        period: '/month',
        description: 'Continuous monthly creative pipeline delivering 8-12 high-converting video assets for paid ad scaling.',
        popular: false,
        inclusions: [
          '8-12 monthly video ad variations',
          'Weekly creative fatigue replacement',
          'Rapid 48-hour turnarounds on iterations',
          'Multi-angle conversion testing',
          'Dedicated creative director',
          'Full commercial licensing rights'
        ],
        ctaLabel: 'Scale Video Pipeline'
      }
    ],
    faqs: [
      {
        question: 'Do I need to send physical products for filming?',
        answer: 'Not necessarily! We can generate photorealistic, studio-quality product videos directly from photos, packaging designs, or 3D models using our generative visual pipeline.'
      },
      {
        question: 'How realistic do the AI videos look?',
        answer: 'We utilize state-of-the-art generative video models combined with professional post-production compositing to produce cinematic, commercial-grade visual assets.'
      },
      {
        question: 'Do I own the commercial rights to the videos?',
        answer: 'Yes! You receive 100% full commercial ownership and usage rights for all generated videos, voiceovers, and promotional assets.'
      },
      {
        question: 'What video formats do you deliver?',
        answer: 'We deliver crystal-clear 1080p and 4K video exports in MP4/MOV formats, formatted in 16:9 (YouTube/Desktop), 9:16 (Instagram Reels/Shorts), and 1:1 (Feed ads).'
      }
    ],
    cta_section: {
      title: 'Ready to Bring Your Vision to Life with AI Video?',
      desc: 'Share your project goals and let us create captivating visual storytelling that commands customer attention.',
      buttonText: 'Start Your Video Project'
    },
    meta_title: 'AI Video Creation & Visual Production | Dawnexus',
    meta_description: 'Cinematic AI video creation, product showcases, and commercial advertisements engineered for captivating brand storytelling.',
    og_image: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
    status: 'published',
    version: 1,
    updated_at: new Date().toISOString()
  },

  'digital-marketing': {
    slug: 'digital-marketing',
    title: 'Performance Digital Marketing',
    canonical_url: 'https://www.dawnexus.in/services/digital-marketing',
    hero_badge: 'ROI-Driven Customer Acquisition',
    hero_subtitle: 'Precision Paid Media, Funnel Optimization & Multi-Channel Performance Marketing',
    hero_description: 'Data-backed digital advertising on Meta, Google, and LinkedIn engineered to maximize qualified leads and revenue efficiency.',
    hero_primary_cta: 'Book Strategy Session',
    hero_secondary_cta: 'View Growth Funnels',
    capabilities: [
      {
        icon: 'Megaphone',
        title: 'Google Search & Display Ads',
        desc: 'High-intent search advertising and smart display retargeting designed to capture ready-to-buy customers at optimal cost-per-click.'
      },
      {
        icon: 'TrendingUp',
        title: 'Meta & Instagram Advertising',
        desc: 'Behavioral audience segmentation, dynamic creative testing, and compelling social ad campaigns that convert interest into revenue.'
      },
      {
        icon: 'Filter',
        title: 'Conversion Rate Optimization (CRO)',
        desc: 'Systematic A/B testing of headlines, value propositions, CTA buttons, and form UX to maximize visitor-to-lead conversion rates.'
      },
      {
        icon: 'Target',
        title: 'Audience Retargeting Sequences',
        desc: 'Strategic multi-touch remarketing funnels that re-engage website visitors and overcome hesitation with social proof and urgency.'
      },
      {
        icon: 'PieChart',
        title: 'Multi-Touch Attribution & Tracking',
        desc: 'Robust server-side tracking, GA4 event modeling, and offline conversion integration for clear, transparent ROI reporting.'
      },
      {
        icon: 'Users',
        title: 'Lead Lifecycle Management',
        desc: 'Automating instant lead routing, CRM synchronization, and SMS/WhatsApp notifications to accelerate sales conversion.'
      }
    ],
    process_steps: [
      {
        step: '01',
        title: 'Audience & Market Research',
        desc: 'We analyze your target personas, competitor ad creatives, and historical ad spend to identify profitable conversion angles.'
      },
      {
        step: '02',
        title: 'Campaign Architecture & Creative',
        desc: 'We build high-converting landing pages, write persuasive ad copy, and produce thumb-stopping creative visual assets.'
      },
      {
        step: '03',
        title: 'Launch & Algorithmic Learning',
        desc: 'Deploying campaigns with disciplined budget allocation, testing creative variations, and feeding conversion signals to ad networks.'
      },
      {
        step: '04',
        title: 'Scaling & Cost Optimization',
        desc: 'Scaling winning audiences, aggressively cutting wasted spend, and lowering cost-per-acquisition as volume expands.'
      }
    ],
    packages: [
      {
        name: 'Launchpad Media',
        badge: 'Validation Sprint',
        price: '₹24,999',
        period: '/month',
        description: 'Ideal for businesses looking to launch targeted paid advertising on Google or Meta with clean tracking.',
        popular: false,
        inclusions: [
          'Management of 1 ad platform (Google or Meta)',
          'Complete conversion tracking & pixel setup',
          'Ad copywriting & 4 custom creative designs',
          'Audience targeting & negative keyword lists',
          'Ad spend management up to ₹1,00,000/mo',
          'Bi-weekly performance reporting'
        ],
        ctaLabel: 'Launch Campaigns'
      },
      {
        name: 'Scaled Acquisition',
        badge: 'Most Popular',
        price: '₹44,999',
        period: '/month',
        description: 'Multi-channel acquisition combining Google Search Ads with Meta social funnels and retargeting.',
        popular: true,
        inclusions: [
          'Google Ads + Meta (Instagram/Facebook)',
          'Multi-stage retargeting funnels',
          'Continuous creative A/B testing',
          'Landing page conversion rate audit',
          'Ad spend management up to ₹3,00,000/mo',
          'Weekly strategy calls & KPI dashboard'
        ],
        ctaLabel: 'Scale Acquisition'
      },
      {
        name: 'Full-Funnel Omnichannel',
        badge: 'Enterprise Growth',
        price: '₹79,999+',
        period: '/month',
        description: 'Aggressive growth system incorporating Google, Meta, YouTube, LinkedIn, and advanced CRO.',
        popular: false,
        inclusions: [
          'Full omnichannel campaign orchestration',
          'Dedicated copywriter & visual designer',
          'Custom landing page design & hosting',
          'Server-side Conversions API (CAPI)',
          'CRM pipeline & lead automation integration',
          'Unlimited ad spend management'
        ],
        ctaLabel: 'Consult Growth Team'
      }
    ],
    faqs: [
      {
        question: 'Is advertising budget included in your management fee?',
        answer: 'No. The management fee covers campaign strategy, copywriting, creative design, conversion tracking, optimization, and reporting. Ad spend is paid directly to Google/Meta.'
      },
      {
        question: 'Which platform is best for my business: Google or Meta?',
        answer: 'Google Ads excels at capturing high-intent users actively searching for your service right now. Meta (Instagram/Facebook) excels at generating interest, brand recognition, and visual discovery.'
      },
      {
        question: 'How do you prevent wasted ad spend?',
        answer: 'We implement rigorous negative keyword lists, tight geographical targeting, audience exclusions, and automated bid rules to ensure your budget is spent only on qualified prospects.'
      },
      {
        question: 'How quickly can campaigns go live?',
        answer: 'Once onboarding and access are completed, strategy and creative production typically take 3-5 business days before campaigns launch.'
      }
    ],
    cta_section: {
      title: 'Ready to Scale Your Customer Acquisition?',
      desc: 'Schedule a free 30-minute growth strategy session to review your current acquisition channels and discover scalable growth opportunities.',
      buttonText: 'Book Free Strategy Session'
    },
    meta_title: 'Performance Digital Marketing & Paid Advertising | Dawnexus',
    meta_description: 'Results-focused digital marketing campaigns combining Google Ads, Meta advertising, and conversion funnels to drive profitable revenue.',
    og_image: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
    status: 'published',
    version: 1,
    updated_at: new Date().toISOString()
  }
};

import { getDb } from './db.js';
import { pushWebsitePageToSupabase } from './supabase.js';

// In-memory cache for ultra-fast response without redundant DB hits
const contentCache = new Map<string, ServicePageContent>();

export class WebsiteContentService {
  /**
   * Clear in-memory cache for a page or all pages
   */
  public static clearCache(slug?: string) {
    if (slug) {
      contentCache.delete(slug);
    } else {
      contentCache.clear();
    }
  }

  /**
   * Get authoritative service page content
   * Checks in-memory cache -> SQLite -> Default fallback
   */
  public static getPage(slug: string): ServicePageContent {
    if (contentCache.has(slug)) {
      return contentCache.get(slug)!;
    }

    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM website_pages WHERE slug = ?').get(slug) as any;

      if (row) {
        const page: ServicePageContent = {
          id: row.id,
          slug: row.slug,
          title: row.title,
          canonical_url: row.canonical_url,
          hero_badge: row.hero_badge || '',
          hero_subtitle: row.hero_subtitle || '',
          hero_description: row.hero_description || '',
          hero_primary_cta: row.hero_primary_cta || '',
          hero_secondary_cta: row.hero_secondary_cta || '',
          capabilities: typeof row.capabilities_json === 'string' ? JSON.parse(row.capabilities_json) : (row.capabilities_json || []),
          process_steps: typeof row.process_steps_json === 'string' ? JSON.parse(row.process_steps_json) : (row.process_steps_json || []),
          packages: typeof row.packages_json === 'string' ? JSON.parse(row.packages_json) : (row.packages_json || []),
          faqs: typeof row.faqs_json === 'string' ? JSON.parse(row.faqs_json) : (row.faqs_json || []),
          cta_section: typeof row.cta_section_json === 'string' ? JSON.parse(row.cta_section_json) : (row.cta_section_json || {}),
          meta_title: row.meta_title || '',
          meta_description: row.meta_description || '',
          og_image: row.og_image || '',
          status: row.status || 'published',
          version: row.version || 1,
          updated_at: row.updated_at
        };
        contentCache.set(slug, page);
        return page;
      }
    } catch (err) {
      console.warn(`[WebsiteContent getPage Error for ${slug}]:`, err);
    }

    // Default fallback
    const fallback = DEFAULT_SERVICE_PAGES[slug];
    if (fallback) {
      contentCache.set(slug, fallback);
      return fallback;
    }

    throw new Error(`Service page [${slug}] not found.`);
  }

  /**
   * List all editable service pages with summaries
   */
  public static listAllPages(): Array<{
    slug: string;
    title: string;
    canonical_url: string;
    meta_title: string;
    status: string;
    version: number;
    updated_at: string;
  }> {
    const slugs = ['website-design', 'seo-services', 'ai-video-creation', 'digital-marketing'];
    return slugs.map(slug => {
      const page = this.getPage(slug);
      return {
        slug: page.slug,
        title: page.title,
        canonical_url: page.canonical_url,
        meta_title: page.meta_title,
        status: page.status,
        version: page.version,
        updated_at: page.updated_at
      };
    });
  }

  /**
   * Save draft content without publishing
   */
  public static async saveDraft(slug: string, updates: Partial<ServicePageContent>, changeSummary: string = 'Draft saved', actor: string = 'admin'): Promise<ServicePageContent> {
    const db = getDb();
    const existing = this.getPage(slug);
    const now = new Date().toISOString();

    // Prevent modifying protected title and canonical URL
    const merged: ServicePageContent = {
      ...existing,
      hero_badge: updates.hero_badge !== undefined ? updates.hero_badge : existing.hero_badge,
      hero_subtitle: updates.hero_subtitle !== undefined ? updates.hero_subtitle : existing.hero_subtitle,
      hero_description: updates.hero_description !== undefined ? updates.hero_description : existing.hero_description,
      hero_primary_cta: updates.hero_primary_cta !== undefined ? updates.hero_primary_cta : existing.hero_primary_cta,
      hero_secondary_cta: updates.hero_secondary_cta !== undefined ? updates.hero_secondary_cta : existing.hero_secondary_cta,
      capabilities: updates.capabilities || existing.capabilities,
      process_steps: updates.process_steps || existing.process_steps,
      packages: updates.packages || existing.packages,
      faqs: updates.faqs || existing.faqs,
      cta_section: updates.cta_section || existing.cta_section,
      meta_title: updates.meta_title || existing.meta_title,
      meta_description: updates.meta_description || existing.meta_description,
      status: 'draft',
      updated_at: now
    };

    // Record draft version in website_content_versions
    db.prepare(`
      INSERT INTO website_content_versions (
        page_slug, version_number, content_json, change_summary, created_by, is_published, published_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)
    `).run(slug, existing.version, JSON.stringify(merged), changeSummary, actor, now);

    // Update draft status in website_pages
    db.prepare(`
      UPDATE website_pages SET
        hero_badge = ?, hero_subtitle = ?, hero_description = ?,
        hero_primary_cta = ?, hero_secondary_cta = ?,
        capabilities_json = ?, process_steps_json = ?, packages_json = ?,
        faqs_json = ?, cta_section_json = ?, meta_title = ?, meta_description = ?,
        status = 'draft', updated_at = ?
      WHERE slug = ?
    `).run(
      merged.hero_badge,
      merged.hero_subtitle,
      merged.hero_description,
      merged.hero_primary_cta,
      merged.hero_secondary_cta,
      JSON.stringify(merged.capabilities),
      JSON.stringify(merged.process_steps),
      JSON.stringify(merged.packages),
      JSON.stringify(merged.faqs),
      JSON.stringify(merged.cta_section),
      merged.meta_title,
      merged.meta_description,
      now,
      slug
    );

    db.prepare(`
      INSERT INTO admin_audit_logs (
        action, target_type, target_id, actor, details_json, created_at
      ) VALUES ('save_draft', 'page', ?, ?, ?, ?)
    `).run(slug, actor, JSON.stringify({ summary: changeSummary }), now);

    this.clearCache(slug);
    return merged;
  }

  /**
   * Publish approved changes immediately
   * Increments version, sets status to 'published', updates Supabase, invalidates cache
   */
  public static async publishPage(slug: string, updates?: Partial<ServicePageContent>, changeSummary: string = 'Published update', actor: string = 'admin'): Promise<ServicePageContent> {
    const db = getDb();
    const existing = this.getPage(slug);
    const newVersion = (existing.version || 1) + 1;
    const now = new Date().toISOString();

    const merged: ServicePageContent = {
      ...existing,
      hero_badge: updates?.hero_badge !== undefined ? updates.hero_badge : existing.hero_badge,
      hero_subtitle: updates?.hero_subtitle !== undefined ? updates.hero_subtitle : existing.hero_subtitle,
      hero_description: updates?.hero_description !== undefined ? updates.hero_description : existing.hero_description,
      hero_primary_cta: updates?.hero_primary_cta !== undefined ? updates.hero_primary_cta : existing.hero_primary_cta,
      hero_secondary_cta: updates?.hero_secondary_cta !== undefined ? updates.hero_secondary_cta : existing.hero_secondary_cta,
      capabilities: updates?.capabilities || existing.capabilities,
      process_steps: updates?.process_steps || existing.process_steps,
      packages: updates?.packages || existing.packages,
      faqs: updates?.faqs || existing.faqs,
      cta_section: updates?.cta_section || existing.cta_section,
      meta_title: updates?.meta_title || existing.meta_title,
      meta_description: updates?.meta_description || existing.meta_description,
      status: 'published',
      version: newVersion,
      updated_at: now
    };

    // Update website_pages
    db.prepare(`
      UPDATE website_pages SET
        hero_badge = ?, hero_subtitle = ?, hero_description = ?,
        hero_primary_cta = ?, hero_secondary_cta = ?,
        capabilities_json = ?, process_steps_json = ?, packages_json = ?,
        faqs_json = ?, cta_section_json = ?, meta_title = ?, meta_description = ?,
        status = 'published', version = ?, updated_at = ?
      WHERE slug = ?
    `).run(
      merged.hero_badge,
      merged.hero_subtitle,
      merged.hero_description,
      merged.hero_primary_cta,
      merged.hero_secondary_cta,
      JSON.stringify(merged.capabilities),
      JSON.stringify(merged.process_steps),
      JSON.stringify(merged.packages),
      JSON.stringify(merged.faqs),
      JSON.stringify(merged.cta_section),
      merged.meta_title,
      merged.meta_description,
      newVersion,
      now,
      slug
    );

    // Save published version snapshot
    db.prepare(`
      INSERT INTO website_content_versions (
        page_slug, version_number, content_json, change_summary, created_by, is_published, published_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(slug, newVersion, JSON.stringify(merged), changeSummary, actor, now, now);

    // Log audit
    db.prepare(`
      INSERT INTO admin_audit_logs (
        action, target_type, target_id, actor, details_json, created_at
      ) VALUES ('publish_page', 'page', ?, ?, ?, ?)
    `).run(slug, actor, JSON.stringify({ version: newVersion, summary: changeSummary }), now);

    // Invalidate local in-memory cache
    this.clearCache(slug);

    // Sync to Supabase PostgreSQL asynchronously
    pushWebsitePageToSupabase(merged).catch(err => {
      console.warn('[WebsiteContent push to Supabase Notice]:', err);
    });

    return merged;
  }

  /**
   * Revert page to a previous version
   */
  public static async rollbackVersion(slug: string, versionNumber: number, actor: string = 'admin'): Promise<ServicePageContent> {
    const db = getDb();
    const verRow = db.prepare(`
      SELECT * FROM website_content_versions
      WHERE page_slug = ? AND version_number = ?
    `).get(slug, versionNumber) as any;

    if (!verRow) {
      throw new Error(`Version ${versionNumber} for page [${slug}] does not exist.`);
    }

    const restored: ServicePageContent = JSON.parse(verRow.content_json);
    return await this.publishPage(slug, restored, `Rollback to Version ${versionNumber}`, actor);
  }

  /**
   * Get version history for a page
   */
  public static getVersions(slug: string): ContentVersionRecord[] {
    const db = getDb();
    return db.prepare(`
      SELECT id, page_slug, version_number, content_json, change_summary, created_by, is_published, published_at, created_at
      FROM website_content_versions
      WHERE page_slug = ?
      ORDER BY version_number DESC
    `).all(slug) as any[];
  }
}
