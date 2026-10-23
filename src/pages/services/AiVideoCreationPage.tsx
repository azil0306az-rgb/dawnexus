import React, { useState } from 'react';
import { 
  ArrowRight, 
  Video, 
  Sparkles, 
  Clapperboard, 
  Play, 
  Layers, 
  Zap, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight,
  Film,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { usePageSeo } from '../../utils/seo';
import { navigateTo } from '../../utils/navigation';
import { usePageContent, ServicePageContent } from '../../utils/usePageContent';
import { getIconComponent } from '../../utils/iconMap';
import { tracker } from '../../utils/tracker';

const DEFAULT_CONTENT: ServicePageContent = {
  slug: 'ai-video-creation',
  title: 'AI Video Creation & Creative Production',
  canonical_url: 'https://www.dawnexus.in/services/ai-video-creation',
  hero_badge: 'CAPABILITIES // AI CREATIVE PRODUCTION',
  hero_subtitle: 'Turn Your Ideas Into Powerful Visual Stories.',
  hero_description: 'Video is the most compelling medium on the internet, but traditional video production is often slow and expensive. We unite cutting-edge AI creative pipelines with human directorial craft to produce high-impact videos at modern commercial speed.',
  hero_primary_cta: 'Plan Your Video Project',
  hero_secondary_cta: 'Explore Formats',
  capabilities: [
    {
      icon: 'Film',
      title: 'Promotional & Brand Videos',
      desc: 'High-impact introduction videos that articulate your brand mission, service value, and competitive edge in 30 to 90 seconds.'
    },
    {
      icon: 'Clapperboard',
      title: 'Short-Form Social Reels & Shorts',
      desc: 'Vertical video assets engineered specifically for Instagram Reels, TikTok, and YouTube Shorts to capture fleeting attention spans.'
    },
    {
      icon: 'Sliders',
      title: 'Product Walkthroughs & Feature Demos',
      desc: 'Crisp visual explanations of software features, hardware products, or service offerings that clarify complex workflows.'
    },
    {
      icon: 'Sparkles',
      title: 'AI-Accelerated Storyboarding',
      desc: 'Rapid conceptualization and multi-style visual treatments generated with AI assistance, reducing creative ideation bottlenecks.'
    },
    {
      icon: 'Zap',
      title: 'Rapid Creative Variation Testing',
      desc: 'Produce multiple hook variations, aspect ratios, and visual pacing options to test which creative drives the highest advertising response.'
    },
    {
      icon: 'Layers',
      title: 'Sound Design & Dynamic Typography',
      desc: 'Cinematic audio mixing, royalty-free licensing, voice synthesis or voiceover integration, and rhythmic motion typography.'
    }
  ],
  process_steps: [
    {
      step: '01',
      title: 'Creative Brief & Concept',
      desc: 'We define the campaign objective, target platform, message narrative, key emotional hooks, and desired viewer action.'
    },
    {
      step: '02',
      title: 'Scriptwriting & AI Storyboards',
      desc: 'We draft the dialogue or voiceover script and generate rapid AI-assisted visual mockups to align on aesthetic tone.'
    },
    {
      step: '03',
      title: 'Production & Motion Synthesis',
      desc: 'Combining AI visual generation tools with human editing, motion design, color grading, and typography in post-production.'
    },
    {
      step: '04',
      title: 'Multi-Format Delivery',
      desc: 'Rendering final deliverables in 16:9 widescreen, 9:16 vertical, and 1:1 square formats optimized for all distribution channels.'
    }
  ],
  packages: [],
  faqs: [
    {
      question: 'Does AI replace human video directors and editors?',
      answer: 'No. AI acts as an accelerator for concept rendering, motion assets, and rapid iteration. Every video is conceptualized, scripted, curated, edited, and sound-designed by human creative directors to ensure coherent storytelling and high brand standards.'
    },
    {
      question: 'What types of businesses benefit most from AI video creation?',
      answer: 'B2B technology brands, eCommerce companies, luxury retail, professional services, and startups seeking high-frequency creative output without large-scale on-location film shoot budgets.'
    },
    {
      question: 'How fast can a video deliverable be produced?',
      answer: 'Because our pipeline uses AI-assisted visualization and rapid prototyping, focused social reels and promotional videos can be delivered in as little as 5 to 10 business days from approved script.'
    },
    {
      question: 'What formats and resolutions do you deliver?',
      answer: 'We deliver in crisp 1080p and 4K resolution across all required aspect ratios: 16:9 (web and desktop), 9:16 (Instagram Reels, TikTok, YouTube Shorts), and 1:1 (feed posts).'
    }
  ],
  cta_section: {
    title: 'Ready to elevate your visual marketing?',
    desc: 'Share your concept or target campaign. We\'ll formulate a creative storyboard and production estimate tailored to your goals.',
    buttonText: 'Start Video Project'
  },
  meta_title: 'AI Video Creation & Visual Production | Dawnexus',
  meta_description: 'Creative AI-assisted video production, social reels, promotional videos, product demos, and visual storytelling engineered for high-engagement brand campaigns.',
  og_image: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png'
};

const sampleFormats = [
  {
    title: 'Brand Anthem Video',
    format: '16:9 Widescreen / 60s',
    aspect: 'Website Hero & YouTube',
    desc: 'Cinematic company overview communicating vision, technological capability, and value proposition.'
  },
  {
    title: 'Social Video Ad / Reel',
    format: '9:16 Vertical / 15-30s',
    aspect: 'Instagram Reels & TikTok',
    desc: 'Fast-paced, hook-driven short-form video designed for thumb-stopping feed retention and immediate conversion.'
  },
  {
    title: 'Product Feature Spotlight',
    format: '16:9 or 1:1 / 45s',
    aspect: 'SaaS Walkthroughs & eCommerce',
    desc: 'Highlighting UI interactions, product textures, or workflows in motion with synchronized voice and captions.'
  }
];

export const AiVideoCreationPage: React.FC = () => {
  const { content } = usePageContent('ai-video-creation', DEFAULT_CONTENT);

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
        '@type': 'Organization',
        '@id': 'https://www.dawnexus.in/#organization',
        'name': 'Dawnexus',
        'url': 'https://www.dawnexus.in/'
      },
      'description': content.meta_description || DEFAULT_CONTENT.meta_description,
      'url': DEFAULT_CONTENT.canonical_url
    }
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCtaClick = () => {
    tracker.trackCtaClick('cta-hero-plan-video', 'hero', content.hero_primary_cta);
    navigateTo('/#contact');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('select-service', { detail: 'AI Video Creation' }));
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
          <span className="text-[#C7FF4D]">AI Video Creation</span>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0B0B] border border-[#252525] text-xs font-semibold tracking-wider text-[#C7FF4D] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4D]" />
              <span>{content.hero_badge || 'CAPABILITIES // AI CREATIVE PRODUCTION'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              {content.hero_subtitle || 'Turn Your Ideas Into Powerful Visual Stories.'}
            </h1>

            <p className="text-lg text-[#A5A5A5] leading-relaxed max-w-2xl font-normal">
              {content.hero_description || 'Video is the most compelling medium on the internet, but traditional video production is often slow and expensive. We unite cutting-edge AI creative pipelines with human directorial craft to produce high-impact videos at modern commercial speed.'}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                onClick={handleCtaClick}
                data-analytics-id="cta-video-hero-primary"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
              >
                <span>{content.hero_primary_cta || 'Plan Your Video Project'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  tracker.trackCtaClick('cta-video-hero-secondary', 'hero', content.hero_secondary_cta);
                  const el = document.getElementById('formats');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                data-analytics-id="cta-video-hero-secondary"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#0B0B0B] text-white hover:text-[#C7FF4D] border border-[#252525] hover:border-[#C7FF4D]/40 text-sm font-medium transition-all"
              >
                <span>{content.hero_secondary_cta || 'Explore Formats'}</span>
              </button>
            </div>
          </div>

          {/* Hero Visual: Video Production Visualizer */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#C7FF4D]/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between pb-4 border-b border-[#252525] text-xs font-mono text-[#A5A5A5] mb-5">
                <span className="flex items-center gap-2">
                  <Clapperboard className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>AI VIDEO PIPELINE</span>
                </span>
                <span className="text-[#C7FF4D]">4K MULTI-FORMAT</span>
              </div>

              {/* Video Player Mockup */}
              <div className="space-y-4">
                <div className="aspect-video rounded-xl bg-[#050505] border border-[#252525] relative overflow-hidden flex items-center justify-center group/player">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  
                  {/* Play circle */}
                  <div className="w-14 h-14 rounded-full bg-[#C7FF4D] flex items-center justify-center text-[#050505] shadow-lg relative z-20 group-hover/player:scale-110 transition-transform">
                    <Play className="w-6 h-6 ml-1 fill-[#050505]" />
                  </div>

                  {/* Player bottom timeline */}
                  <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[11px] font-mono text-white/80">
                    <span>00:14 / 00:45</span>
                    <span className="text-[#C7FF4D]">PROCESSED BY DAWNEXUS</span>
                  </div>
                </div>

                {/* Timeline Tracks Mockup */}
                <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#A5A5A5]">
                    <span>Scene Synthesis Track</span>
                    <span className="text-[#C7FF4D]">Active</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-6">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded text-[9px] font-mono text-center flex items-center justify-center text-white/60">HOOK</div>
                    <div className="bg-[#1a1a1a] border border-[#333] rounded text-[9px] font-mono text-center flex items-center justify-center text-white/60">STORY</div>
                    <div className="bg-[#1a1a1a] border border-[#333] rounded text-[9px] font-mono text-center flex items-center justify-center text-white/60">DEMO</div>
                    <div className="bg-[#C7FF4D]/20 border border-[#C7FF4D]/60 rounded text-[9px] font-mono text-center flex items-center justify-center text-[#C7FF4D]">CTA</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* How AI Accelerates Production */}
      <section className="py-20 bg-[#0B0B0B] border-y border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
              // PRODUCTION ADVANTAGE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Human Direction Powered by AI Velocity
            </h2>
            <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
              We leverage modern AI generation models to replace logistical delays with creative agility, giving your brand the freedom to iterate and deploy video campaigns continuously.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-xl font-bold text-white mb-2">3x Faster Delivery</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                By bypassing physical location scouting and equipment setup, concept-to-final timelines shrink from months to days.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-xl font-bold text-white mb-2">Cost-Efficient Testing</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Produce multiple creative variations, visual hooks, and intros for advertising campaigns at a fraction of traditional production costs.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-[#050505] border border-[#252525]">
              <div className="text-xl font-bold text-white mb-2">Bespoke Visual Tone</div>
              <p className="text-sm text-[#A5A5A5] leading-relaxed">
                Whether minimal dark-mode tech, vibrant social lifestyle, or corporate narrative, styling is tailored to your exact brand guidelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Illustrative Formats Showcase */}
      <section id="formats" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
            // DELIVERABLE FORMATS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tailored Video Formats for Every Channel
          </h2>
          <p className="mt-3 text-[#A5A5A5] text-base leading-relaxed">
            Clearly labeled concept formats engineered for multi-platform distribution across websites, advertising, and organic social channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleFormats.map((fmt, idx) => (
            <div key={idx} className="p-7 rounded-2xl bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D]/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#A5A5A5] mb-4">
                  <span className="text-[#C7FF4D]">{fmt.format}</span>
                  <span className="bg-[#050505] px-2 py-0.5 rounded border border-[#252525]">{fmt.aspect}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{fmt.title}</h3>
                <p className="text-sm text-[#A5A5A5] leading-relaxed mb-6">{fmt.desc}</p>
              </div>

              <div className="pt-4 border-t border-[#252525] text-xs text-[#A5A5A5] font-mono">
                Illustrative Agency Format
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="py-20 bg-[#0B0B0B] border-t border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
              // PRODUCTION CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Full-Spectrum Creative Production
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c, i) => {
              const Icon = typeof c.icon === 'string' ? getIconComponent(c.icon) : (c.icon || Film);
              return (
                <div key={i} className="p-7 rounded-2xl bg-[#050505] border border-[#252525] hover:border-[#C7FF4D]/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#0B0B0B] border border-[#252525] flex items-center justify-center text-[#C7FF4D] mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2.5">{c.title}</h3>
                  <p className="text-sm text-[#A5A5A5] leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14">
          <span className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase mb-2 block">
            // PRODUCTION TIMELINE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            From Script to Master Deliverable
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {processSteps.map((step, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
              <div className="text-2xl font-mono font-bold text-[#C7FF4D] mb-3">{step.step}</div>
              <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
              <p className="text-xs text-[#A5A5A5] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              {content.cta_section?.title || 'Ready to elevate your visual marketing?'}
            </h3>
            <p className="text-sm text-[#A5A5A5] leading-relaxed">
              {content.cta_section?.desc || 'Share your concept or target campaign. We\'ll formulate a creative storyboard and production estimate tailored to your goals.'}
            </p>
          </div>

          <button
            onClick={() => {
              tracker.trackCtaClick('cta-video-bottom', 'bottom-cta', content.cta_section?.buttonText || 'Start Video Project');
              handleCtaClick();
            }}
            className="shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
          >
            <span>{content.cta_section?.buttonText || 'Start Video Project'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
