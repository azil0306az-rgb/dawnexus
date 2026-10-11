import React, { useState } from 'react';
import { 
  ArrowRight, 
  TrendingUp, 
  Search, 
  MapPin, 
  FileCode, 
  LineChart, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight,
  Target,
  BarChart3,
  Bot
} from 'lucide-react';
import { usePageSeo } from '../../utils/seo';
import { navigateTo } from '../../utils/navigation';

export const SeoServicesPage: React.FC = () => {
  usePageSeo({
    title: 'SEO Services & Search Visibility | Dawnexus',
    description: 'Structured search engine optimization, technical SEO audits, on-page optimization, and Google Business Profile management for sustainable organic discovery.',
    canonicalUrl: 'https://dawnexus.in/services/seo-services',
    ogImage: 'https://dawnexus.in/brand/dawnexus-logo-original.png',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Search Engine Optimization (SEO)',
      'provider': {
        '@type': 'ProfessionalService',
        'name': 'Dawnexus',
        'url': 'https://dawnexus.in/'
      },
      'description': 'Improve your organic search visibility with technical SEO, keyword mapping, on-page structure, and Google Business Profile optimization.',
      'url': 'https://dawnexus.in/services/seo-services'
    }
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCtaClick = () => {
    navigateTo('/#contact');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('select-service', { detail: 'Search Engine Optimization' }));
    }, 150);
  };

  const capabilities = [
    {
      icon: FileCode,
      title: 'Technical SEO Audits',
      desc: 'Fix crawlability errors, duplicate content, broken canonicals, XML sitemap validation, and mobile usability roadblocks that restrict search engine bots.'
    },
    {
      icon: Target,
      title: 'Keyword Research & Search Intent',
      desc: 'Identify commercially relevant search queries and customer intent patterns rather than chasing vanity search volume without buying interest.'
    },
    {
      icon: Search,
      title: 'On-Page Structure & Content Optimization',
      desc: 'Optimize heading hierarchy, semantic HTML tags, internal linking structure, and content clarity so Google understands page relevance.'
    },
    {
      icon: MapPin,
      title: 'Local SEO & Google Business Profile',
      desc: 'Optimize your Google Business Profile, business categories, local citations, and review management to capture high-intent local map pack searches.'
    },
    {
      icon: TrendingUp,
      title: 'Core Web Vitals & Site Speed',
      desc: 'Diagnose and resolve Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and interaction delays that harm organic rankings.'
    },
    {
      icon: LineChart,
      title: 'Transparent Performance Monitoring',
      desc: 'Ongoing tracking of impressions, average rankings, click-through rates, and organic conversion funnels using Google Search Console and analytics.'
    }
  ];

  const processSteps = [
    {
      step: '01',
      title: 'Audit & Benchmark',
      desc: 'Complete crawl of your existing web assets to identify indexing barriers, keyword footprint, competitor landscape, and technical debt.'
    },
    {
      step: '02',
      title: 'Strategy & Keyword Mapping',
      desc: 'Mapping target commercial queries to specific destination pages with structured intent prioritization.'
    },
    {
      step: '03',
      title: 'On-Page & Technical Remediation',
      desc: 'Implementation of metadata, schema markup, Core Web Vitals optimizations, and internal link restructuring.'
    },
    {
      step: '04',
      title: 'Monitoring & Continuous Refinement',
      desc: 'Analyzing monthly ranking shifts, user queries, search algorithm adjustments, and expanding content coverage.'
    }
  ];

  const faqs = [
    {
      q: 'Do you guarantee #1 ranking on Google?',
      a: 'No ethical SEO agency can guarantee a #1 ranking, as search engine algorithms are proprietary and constantly evolving. We focus on rigorous technical excellence, high-intent keyword alignment, and sustainable organic gains designed for compounding commercial ROI.'
    },
    {
      q: 'How long before we see organic search improvements?',
      a: 'SEO is a compounding strategy. Technical remediations and local profile optimizations often show initial traction within 30 to 60 days, while competitive organic search queries typically mature over 3 to 6 months of consistent execution.'
    },
    {
      q: 'What is the difference between Technical SEO and On-Page SEO?',
      a: 'Technical SEO ensures search engines can efficiently crawl, render, and index your website (speed, sitemaps, schema, status codes). On-Page SEO focuses on making content and HTML elements (headings, keywords, copy) relevant to specific search intent.'
    },
    {
      q: 'How does Google Business Profile optimization help my business?',
      a: 'An optimized Google Business Profile allows your business to appear prominently in the Google Maps 3-Pack and localized search queries, driving immediate phone calls, website clicks, and foot traffic from customers in your area.'
    }
  ];

  return (
    <div className="bg-[#050505] text-[#FFFFFF] min-h-screen pt-28 pb-20">
      
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <nav className="flex items-center gap-2 text-xs font-mono text-[#A5A5A5]">
          <button onClick={() => navigateTo('/')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigateTo('/#services')} className="hover:text-white transition-colors">Services</button>
          <span>/</span>
          <span className="text-[#C7FF4D]">SEO Services</span>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0B0B] border border-[#252525] text-xs font-semibold tracking-wider text-[#C7FF4D] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4D]" />
              <span>CAPABILITIES // ORGANIC SEARCH STRATEGY</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              Get Found by the People Searching for You.
            </h1>

            <p className="text-lg text-[#A5A5A5] leading-relaxed max-w-2xl font-normal">
              High search visibility is not about algorithm tricks—it is about technical excellence, clear content architecture, and matching user intent. We build disciplined SEO foundations that earn sustainable organic traffic.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                onClick={handleCtaClick}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
              >
                <span>Request an SEO Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  const el = document.getElementById('capabilities');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#0B0B0B] text-white hover:text-[#C7FF4D] border border-[#252525] hover:border-[#C7FF4D]/40 text-sm font-medium transition-all"
              >
                <span>View Methodology</span>
              </button>
            </div>
          </div>

          {/* Hero Visual Mockup: Search Analytics Dashboard */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#C7FF4D]/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between pb-4 border-b border-[#252525] text-xs font-mono text-[#A5A5A5] mb-5">
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>ORGANIC VISIBILITY METRICS</span>
                </span>
                <span className="text-[#C7FF4D] font-bold">LIVE TELEMETRY</span>
              </div>

              {/* Analytics Metric Cards */}
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#A5A5A5] block">High-Intent Impressions</span>
                    <span className="text-xl font-bold text-white font-mono">+128% <span className="text-xs text-[#C7FF4D]">YoY</span></span>
                  </div>
                  <BarChart3 className="w-6 h-6 text-[#C7FF4D]" />
                </div>

                <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A5A5A5]">Core Web Vitals Pass Rate</span>
                    <span className="text-[#C7FF4D] font-mono font-bold">100% Passed</span>
                  </div>
                  <div className="w-full bg-[#161616] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#C7FF4D] h-full w-full" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#A5A5A5] block">Indexed Status</span>
                    <span className="text-white font-medium">Valid XML Sitemap & Canonical</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C7FF4D]" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SEO Explained Simply */}
      <section className="py-20 bg-[#0B0B0B] border-y border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
              // HOW SEO WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Search optimization in clear, practical terms.
            </h2>
            <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
              When prospective customers search for services you offer, search engines evaluate three primary factors before deciding which websites to show:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-xl font-bold text-white mb-2">1. Crawlability & Speed</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Can search bots access, render, and index your pages quickly without encountering errors or mobile layout bugs?
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-xl font-bold text-white mb-2">2. Search Intent Relevance</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Does your content directly answer the question or need the user typed into the search bar with clear structure?
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-xl font-bold text-white mb-2">3. Local & Domain Authority</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Does your business have accurate local presence details, customer reviews, and consistent industry signals?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="capabilities" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
            // OUR SEO SCOPE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comprehensive Search Strategy
          </h2>
          <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
            We address the technical infrastructure, content architecture, and local listings that determine organic discoverability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="p-7 rounded-2xl bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D]/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-center text-[#C7FF4D] mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2.5">{c.title}</h3>
                <p className="text-sm text-[#A5A5A5] leading-relaxed">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-[#0B0B0B] border-t border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
              // METHODOLOGY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Structured 4-Phase SEO Execution
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
                <div className="text-2xl font-mono font-bold text-[#C7FF4D] mb-3">{step.step}</div>
                <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
                <p className="text-xs text-[#A5A5A5] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
            // FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl bg-[#0B0B0B] border border-[#252525] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-white hover:text-[#C7FF4D] transition-colors"
              >
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#C7FF4D]" /> : <ChevronDown className="w-4 h-4 text-[#A5A5A5]" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-xs text-[#A5A5A5] leading-relaxed border-t border-[#252525]/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-10 sm:p-14 rounded-2xl bg-gradient-to-br from-[#0B0B0B] via-[#0e0e0e] to-[#050505] border border-[#252525] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to attract customers who are actively searching?
            </h3>
            <p className="text-sm text-[#A5A5A5] leading-relaxed">
              Schedule an organic search review with our team. We'll audit your technical status and formulate a sustainable visibility roadmap.
            </p>
          </div>

          <button
            onClick={handleCtaClick}
            className="shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
          >
            <span>Request an SEO Consultation</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
