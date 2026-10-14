import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Laptop, 
  Smartphone, 
  Sparkles, 
  Code2, 
  Layout, 
  Gauge, 
  ShieldCheck, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { usePageSeo } from '../../utils/seo';
import { navigateTo } from '../../utils/navigation';

export const WebsiteDesignPage: React.FC = () => {
  usePageSeo({
    title: 'Website Design & Development | Dawnexus',
    description: 'Custom, high-performance responsive website design and development engineered for brand credibility, lightning-fast speed, and conversion growth.',
    canonicalUrl: 'https://dawnexus.in/services/website-design',
    ogImage: 'https://dawnexus.in/brand/dawnexus-logo-original.png',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Website Design & Development',
      'provider': {
        '@type': 'ProfessionalService',
        'name': 'Dawnexus',
        'url': 'https://dawnexus.in/'
      },
      'description': 'Modern responsive websites designed around your brand, business goals, and customer conversion experience.',
      'url': 'https://dawnexus.in/services/website-design'
    }
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCtaClick = () => {
    navigateTo('/#contact');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('select-service', { detail: 'Website Design & Development' }));
    }, 150);
  };

  const capabilities = [
    {
      icon: Layout,
      title: 'Responsive Business Websites',
      desc: 'Fluid, cross-device layouts that deliver an intuitive and polished experience on smartphones, tablets, laptops, and ultra-wide desktops.'
    },
    {
      icon: Gauge,
      title: 'Conversion-Focused Landing Pages',
      desc: 'Targeted single-page funnels designed with deliberate visual hierarchy, persuasive copywriting structure, and friction-free user flows.'
    },
    {
      icon: Code2,
      title: 'Modern Front-End Engineering',
      desc: 'Built with clean semantic markup, modular component architecture, and modern frameworks that ensure rapid loading and long-term maintainability.'
    },
    {
      icon: Sparkles,
      title: 'Brand Visual Modernization',
      desc: 'Complete redesigns for outdated websites, transitioning legacy sites into contemporary, credible brand assets that build immediate trust.'
    },
    {
      icon: ShieldCheck,
      title: 'Technical Foundation & SEO Ready',
      desc: 'Engineered with clean metadata, Core Web Vitals optimization, accessible semantic tags, and schema readiness out of the box.'
    },
    {
      icon: Layers,
      title: 'Intuitive Content Architecture',
      desc: 'Clear navigation hierarchies and thoughtful content layout that guide visitors smoothly toward taking decisive commercial action.'
    }
  ];

  const processSteps = [
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
      desc: 'Rigorous testing of forms, analytics tracking, mobile layouts, and SSL security followed by smooth deployment.'
    }
  ];

  const faqs = [
    {
      q: 'How long does a website project typically take?',
      a: 'A focused landing page or business website typically requires 2 to 4 weeks from discovery to deployment, depending on content availability, scope complexity, and feedback cycles.'
    },
    {
      q: 'Will my website be mobile-friendly and fast?',
      a: 'Yes. Every website we build is mobile-first, responsive across all screen dimensions, and tested for swift load times and clean Core Web Vitals.'
    },
    {
      q: 'Can you redesign our existing company website?',
      a: 'Absolutely. We regularly audit and modernize outdated web platforms, preserving valuable SEO equity while dramatically elevating design quality, user flow, and conversion rates.'
    },
    {
      q: 'Do you build on custom code or templates?',
      a: 'We avoid generic, bloated commercial themes. We build tailored, modern front-ends using clean frameworks and modular CSS to ensure high performance and bespoke brand alignment.'
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
          <span className="text-[#C7FF4D]">Website Design</span>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0B0B] border border-[#252525] text-xs font-semibold tracking-wider text-[#C7FF4D] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4D]" />
              <span>CAPABILITIES // WEB DESIGN & DEVELOPMENT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              Websites Designed to Move Your Business Forward.
            </h1>

            <p className="text-lg text-[#A5A5A5] leading-relaxed max-w-2xl font-normal">
              Your website is the center of your digital credibility. We craft high-performance, conversion-focused websites engineered around your brand identity, business objectives, and customer journey.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                onClick={handleCtaClick}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
              >
                <span>Start Your Project</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  const el = document.getElementById('capabilities');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#0B0B0B] text-white hover:text-[#C7FF4D] border border-[#252525] hover:border-[#C7FF4D]/40 text-sm font-medium transition-all"
              >
                <span>Explore Capabilities</span>
              </button>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#C7FF4D]/10 blur-3xl rounded-full pointer-events-none" />
              
              {/* Browser chrome header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#252525] text-xs font-mono text-[#A5A5A5] mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-white/60">dawnexus.in/preview</span>
                </div>
                <span className="text-[#C7FF4D]">100% RESPONSIVE</span>
              </div>

              {/* Mockup screen composition */}
              <div className="space-y-4">
                <div className="h-28 rounded-xl bg-[#050505] border border-[#252525] p-4 flex flex-col justify-between">
                  <div className="w-24 h-3 rounded bg-[#C7FF4D]/30" />
                  <div className="space-y-1.5">
                    <div className="w-3/4 h-4 rounded bg-white/40" />
                    <div className="w-1/2 h-3 rounded bg-white/20" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="h-20 rounded-xl bg-[#050505] border border-[#252525] p-3 flex flex-col justify-between">
                    <Laptop className="w-4 h-4 text-[#C7FF4D]" />
                    <div className="w-10 h-2 bg-white/30 rounded" />
                  </div>
                  <div className="h-20 rounded-xl bg-[#050505] border border-[#252525] p-3 flex flex-col justify-between">
                    <Smartphone className="w-4 h-4 text-[#C7FF4D]" />
                    <div className="w-10 h-2 bg-white/30 rounded" />
                  </div>
                  <div className="h-20 rounded-xl bg-[#050505] border border-[#252525] p-3 flex flex-col justify-between">
                    <Gauge className="w-4 h-4 text-[#C7FF4D]" />
                    <div className="w-12 h-2 bg-[#C7FF4D]/50 rounded" />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between text-xs">
                  <span className="text-[#A5A5A5]">Performance Benchmark</span>
                  <span className="font-mono text-[#C7FF4D] font-bold">Grade A (98+)</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Why a Professional Website Matters */}
      <section className="py-20 bg-[#0B0B0B] border-y border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
              // VALUE PROPOSITION
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Why professional web design matters for your growth.
            </h2>
            <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
              Visitors decide whether to trust your brand in less than 5 seconds. A templated or clunky website creates friction, lowers conversion rates, and reduces the ROI of your marketing spend.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-2xl font-bold text-white mb-2">Immediate Credibility</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Modern aesthetics and clean typography signal to prospects, enterprise partners, and clients that your business is authoritative and dependable.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-2xl font-bold text-white mb-2">Conversion Efficiency</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Intentional design guides user attention toward your value proposition and action triggers, turning casual visitors into qualified enquiries.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-2xl font-bold text-white mb-2">Speed & Retention</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Fast-loading pages prevent drop-offs and provide smooth interaction across slow mobile networks, directly improving search rankings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="capabilities" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
            // SCOPE & DELIVERABLES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comprehensive Web Design Solutions
          </h2>
          <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
            From single-page high-converting campaign destinations to corporate multi-section platforms, every build is crafted to your specifications.
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
              // HOW WE WORK
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The Web Development Process
            </h2>
            <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
              A collaborative, disciplined workflow engineered for rapid delivery without compromising visual craftsmanship.
            </p>
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

      {/* Interactive Estimator Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-[#0d1406] via-[#0B0B0B] to-[#0B0B0B] border border-[#C7FF4D]/30 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C7FF4D]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="space-y-2 relative z-10 max-w-2xl">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase block">
              // INSTANT BUDGET CALCULATOR
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Curious what your ideal website will cost?
            </h3>
            <p className="text-sm text-[#A5A5A5] leading-relaxed">
              Use our interactive estimator to configure your website requirements, select design tiers, and get an itemized budget calculation in under 60 seconds.
            </p>
          </div>
          <button
            onClick={() => navigateTo('/website-cost-calculator')}
            className="shrink-0 relative z-10 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(199,255,77,0.25)]"
          >
            <span>Calculate Your Website Cost</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-10 sm:p-14 rounded-2xl bg-gradient-to-br from-[#0B0B0B] via-[#0e0e0e] to-[#050505] border border-[#252525] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to build a website that delivers results?
            </h3>
            <p className="text-sm text-[#A5A5A5] leading-relaxed">
              Tell us about your brand goals and timeline. We'll outline a tailored roadmap and transparent proposal for your next stage of growth.
            </p>
          </div>

          <button
            onClick={handleCtaClick}
            className="shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
          >
            <span>Request a Consultation</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
