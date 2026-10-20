import React, { useState } from 'react';
import { 
  ArrowRight, 
  Target, 
  BarChart, 
  Megaphone, 
  TrendingUp, 
  MapPin, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight,
  Layers,
  PieChart,
  Search,
  DollarSign
} from 'lucide-react';
import { usePageSeo } from '../../utils/seo';
import { navigateTo } from '../../utils/navigation';
import { usePageContent, ServicePageContent } from '../../utils/usePageContent';
import { getIconComponent } from '../../utils/iconMap';
import { tracker } from '../../utils/tracker';

const DEFAULT_CONTENT: ServicePageContent = {
  slug: 'digital-marketing',
  title: 'Digital Marketing & Paid Advertising',
  canonical_url: 'https://www.dawnexus.in/services/digital-marketing',
  hero_badge: 'CAPABILITIES // INTEGRATED DIGITAL GROWTH',
  hero_subtitle: 'Smarter Digital Marketing. Meaningful Business Growth.',
  hero_description: 'Sustainable digital growth doesn’t come from isolated tactics. We coordinate targeted paid advertising, high-velocity creative testing, and organic search visibility into an integrated customer acquisition engine.',
  hero_primary_cta: 'Discuss Your Campaign',
  hero_secondary_cta: 'How Channels Connect',
  capabilities: [
    {
      icon: 'Target',
      title: 'Google Ads (Search & Performance Max)',
      desc: 'Capture high-intent prospects actively looking for your solutions through structured keyword bidding, responsive search ads, and conversion tracking.'
    },
    {
      icon: 'Megaphone',
      title: 'Meta Ads (Facebook & Instagram)',
      desc: 'Targeted visual ad campaigns powered by audience interest modeling, demographic segmentation, and video creative testing that drives brand discovery.'
    },
    {
      icon: 'Layers',
      title: 'Creative Ad Development & Testing',
      desc: 'Iterative production of video hooks, ad graphics, and persuasive copywriting to combat ad fatigue and lower customer acquisition costs.'
    },
    {
      icon: 'Search',
      title: 'Paid & Organic Channel Synergy',
      desc: 'Coordinating paid search data with organic SEO keyword strategy so you capture immediate traffic while building long-term search equity.'
    },
    {
      icon: 'MapPin',
      title: 'Local Google Presence & Maps',
      desc: 'Synchronizing local map pack optimization with localized ad extensions to capture local buyers searching on mobile devices.'
    },
    {
      icon: 'BarChart',
      title: 'Analytics & Attribution Tracking',
      desc: 'Accurate event tracking via Google Analytics 4, Meta Pixel, and server-side conversion APIs for clear commercial attribution.'
    }
  ],
  process_steps: [
    {
      step: '01',
      title: 'Audience & Channel Audit',
      desc: 'We analyze your customer profiles, past marketing performance, competitors, and unit economics to select the right channel mix.'
    },
    {
      step: '02',
      title: 'Campaign Architecture & Tracking',
      desc: 'Setting up rigorous conversion tracking, pixels, event triggers, audience lists, and negative keyword databases.'
    },
    {
      step: '03',
      title: 'Creative Production & Launch',
      desc: 'Developing tailored video creatives, ad copy variations, and conversion-optimized landing page funnels.'
    },
    {
      step: '04',
      title: 'Data-Driven Bid Optimization',
      desc: 'Weekly testing of creative variations, audience adjustments, and budget reallocation toward top-performing segments.'
    }
  ],
  packages: [],
  faqs: [
    {
      question: 'Do you guarantee a specific return on ad spend (ROAS)?',
      answer: 'We do not make misleading guarantees of specific sales or ROAS multipliers. Results depend on market demand, competitive bids, your offer, and pricing. We guarantee disciplined campaign setup, rigorous budget controls, continuous creative testing, and transparent attribution reporting.'
    },
    {
      question: 'How much budget do I need to start paid advertising?',
      answer: 'Budget depends on your industry and average customer value. We recommend starting with a controlled test budget that allows sufficient click data to identify winning creative variations and target keywords before scaling.'
    },
    {
      question: 'Should my business use Google Ads or Meta Ads?',
      answer: 'Google Ads is ideal for capturing existing intent (people actively searching for an immediate solution). Meta Ads excels at generating interest, demonstrating products visually, and retargeting warm audiences. Many businesses benefit from a coordinated balance of both.'
    },
    {
      question: 'Who pays for the actual advertising spend?',
      answer: 'Ad spend is paid directly to Google or Meta from your own billing account. Dawnexus manages strategy, campaign setup, creative production, tracking, and continuous management.'
    }
  ],
  cta_section: {
    title: 'Ready to scale your digital customer acquisition?',
    desc: 'Let\'s review your market, existing advertising metrics, and growth objectives to identify your highest-leverage acquisition channels.',
    buttonText: 'Request a Strategy Call'
  },
  meta_title: 'Digital Marketing & Paid Advertising | Dawnexus',
  meta_description: 'Coordinated digital marketing, Google Ads management, Meta Ads advertising, audience targeting, local discovery, and continuous performance analytics.',
  og_image: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png'
};

const channelSynergies = [
  {
    channel: 'Google Search Ads',
    role: 'Immediate High-Intent Demand',
    desc: 'Connects directly with buyers who have high purchasing intent right now.'
  },
  {
    channel: 'Meta Social Campaigns',
    role: 'Audience Awareness & Retargeting',
    desc: 'Introduces your brand visually and re-engages previous website visitors.'
  },
  {
    channel: 'Organic SEO & Local Maps',
    role: 'Compounding Long-Term Authority',
    desc: 'Builds permanent credibility and sustainable search volume over time.'
  }
];

export const DigitalMarketingPage: React.FC = () => {
  const { content } = usePageContent('digital-marketing', DEFAULT_CONTENT);

  usePageSeo({
    title: content.meta_title || DEFAULT_CONTENT.meta_title,
    description: content.meta_description || DEFAULT_CONTENT.meta_description,
    canonicalUrl: DEFAULT_CONTENT.canonical_url,
    ogImage: content.og_image || DEFAULT_CONTENT.og_image,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': DEFAULT_CONTENT.title,
      'provider': {
        '@type': 'ProfessionalService',
        'name': 'Dawnexus',
        'url': 'https://www.dawnexus.in/'
      },
      'description': content.meta_description || DEFAULT_CONTENT.meta_description,
      'url': DEFAULT_CONTENT.canonical_url
    }
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCtaClick = () => {
    tracker.trackCtaClick('cta-digital-marketing-hero', 'hero', content.hero_primary_cta);
    navigateTo('/#contact');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('select-service', { detail: 'AI-Integrated Advertising' }));
    }, 150);
  };

  const capabilities = content.capabilities || DEFAULT_CONTENT.capabilities;
  const processSteps = content.process_steps || DEFAULT_CONTENT.process_steps;
  const faqs = content.faqs || DEFAULT_CONTENT.faqs;

  return (
    <div className="bg-[#050505] text-[#FFFFFF] min-h-screen pt-28 pb-20">
      
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <nav className="flex items-center gap-2 text-xs font-mono text-[#A5A5A5]">
          <button onClick={() => navigateTo('/')} className="hover:text-white transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigateTo('/#services')} className="hover:text-white transition-colors">Services</button>
          <span>/</span>
          <span className="text-[#C7FF4D]">Digital Marketing</span>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0B0B] border border-[#252525] text-xs font-semibold tracking-wider text-[#C7FF4D] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4D]" />
              <span>{content.hero_badge || 'CAPABILITIES // INTEGRATED DIGITAL GROWTH'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              {content.hero_subtitle || 'Smarter Digital Marketing. Meaningful Business Growth.'}
            </h1>

            <p className="text-lg text-[#A5A5A5] leading-relaxed max-w-2xl font-normal">
              {content.hero_description || 'Sustainable digital growth doesn’t come from isolated tactics. We coordinate targeted paid advertising, high-velocity creative testing, and organic search visibility into an integrated customer acquisition engine.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                onClick={handleCtaClick}
                data-analytics-id="cta-digital-marketing-hero-primary"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
              >
                <span>{content.hero_primary_cta || 'Discuss Your Campaign'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  tracker.trackCtaClick('cta-digital-marketing-channels', 'hero', content.hero_secondary_cta);
                  const el = document.getElementById('channels');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                data-analytics-id="cta-digital-marketing-hero-secondary"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#0B0B0B] text-white hover:text-[#C7FF4D] border border-[#252525] hover:border-[#C7FF4D]/40 text-sm font-medium transition-all"
              >
                <span>{content.hero_secondary_cta || 'How Channels Connect'}</span>
              </button>
            </div>
          </div>

          {/* Hero Visual: Marketing Performance Hub */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#C7FF4D]/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between pb-4 border-b border-[#252525] text-xs font-mono text-[#A5A5A5] mb-5">
                <span className="flex items-center gap-2">
                  <PieChart className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>CAMPAIGN ATTRIBUTION ENGINE</span>
                </span>
                <span className="text-[#C7FF4D]">OPTIMIZED</span>
              </div>

              {/* Marketing Dashboard Mockup */}
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#A5A5A5] block">Conversion Efficiency</span>
                    <span className="text-xl font-bold text-white font-mono">+34.8% <span className="text-xs text-[#C7FF4D]">Pacing</span></span>
                  </div>
                  <TrendingUp className="w-6 h-6 text-[#C7FF4D]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525]">
                    <span className="text-[11px] text-[#A5A5A5] block">Google Search Ads</span>
                    <span className="text-sm font-bold text-white font-mono mt-1 block">High Intent</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525]">
                    <span className="text-[11px] text-[#A5A5A5] block">Meta Retargeting</span>
                    <span className="text-sm font-bold text-white font-mono mt-1 block">Re-Engagement</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#A5A5A5] block">Attribution Model</span>
                    <span className="text-white font-medium">Data-Driven Multi-Touch</span>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C7FF4D]" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* How Services Work Together */}
      <section id="channels" className="py-20 bg-[#0B0B0B] border-y border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
              // INTEGRATED APPROACH
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why coordinated marketing outperforms random tactics.
            </h2>
            <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
              Running ads without optimizing your website reduces conversion rates. Doing SEO without testing ad copy delays learning. We unite these channels into a complementary system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {channelSynergies.map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
                <div className="text-xs font-mono text-[#C7FF4D] uppercase tracking-wider mb-2">{item.role}</div>
                <h3 className="text-xl font-bold text-white mb-2">{item.channel}</h3>
                <p className="text-sm text-[#A5A5A5] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
            // CORE MARKETING CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            End-to-End Campaign Execution
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((c, i) => {
            const Icon = typeof c.icon === 'string' ? getIconComponent(c.icon) : (c.icon || Target);
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
              // CAMPAIGN EXECUTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Disciplined Performance Process
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
          {faqs.map((faq, i) => {
            const question = faq.question || (faq as any).q;
            const answer = faq.answer || (faq as any).a;
            return (
              <div key={i} className="rounded-xl bg-[#0B0B0B] border border-[#252525] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-white hover:text-[#C7FF4D] transition-colors"
                >
                  <span>{question}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#C7FF4D]" /> : <ChevronDown className="w-4 h-4 text-[#A5A5A5]" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-[#A5A5A5] leading-relaxed border-t border-[#252525]/50 pt-3">
                    {answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-10 sm:p-14 rounded-2xl bg-gradient-to-br from-[#0B0B0B] via-[#0e0e0e] to-[#050505] border border-[#252525] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {content.cta_section?.title || 'Ready to scale your digital customer acquisition?'}
            </h3>
            <p className="text-sm text-[#A5A5A5] leading-relaxed">
              {content.cta_section?.desc || 'Let\'s review your market, existing advertising metrics, and growth objectives to identify your highest-leverage acquisition channels.'}
            </p>
          </div>

          <button
            onClick={() => {
              tracker.trackCtaClick('cta-digital-marketing-bottom', 'bottom-cta', content.cta_section?.buttonText || 'Request a Strategy Call');
              handleCtaClick();
            }}
            className="shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
          >
            <span>{content.cta_section?.buttonText || 'Request a Strategy Call'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
