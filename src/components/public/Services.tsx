import React from 'react';
import { 
  Monitor, 
  Video, 
  Target, 
  TrendingUp, 
  MapPin, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import type { ServiceItem } from '../../types';

export const servicesData: ServiceItem[] = [
  {
    id: 'web-development',
    number: '01',
    title: 'Website Design & Development',
    description: 'Modern, responsive websites designed around your brand, business goals, and customer experience.',
    deliverables: [
      'Responsive & High-Performance Websites',
      'High-Converting Landing Pages',
      'Corporate & Brand Websites',
      'Website Redesigns & Modernization',
      'Conversion Rate Optimization (CRO)'
    ],
    icon: 'Monitor'
  },
  {
    id: 'ai-video',
    number: '02',
    title: 'AI Video Creation',
    description: 'Creative, AI-assisted video content that helps businesses communicate, promote, and capture attention.',
    deliverables: [
      'High-Impact Promotional Videos',
      'Product Showcases & Feature Demos',
      'Social Media Reels & TikTok Assets',
      'Business Introduction & Brand Stories',
      'AI-Assisted Visual Production'
    ],
    icon: 'Video'
  },
  {
    id: 'ai-advertising',
    number: '03',
    title: 'AI-Integrated Advertising',
    description: 'Smarter advertising campaigns supported by AI-assisted creative production, analytics, and ongoing optimization.',
    deliverables: [
      'Google Ads (Search, Display & Performance Max)',
      'Meta Ads (Facebook & Instagram)',
      'Creative Variations & Copy Testing',
      'Audience Targeting & Retargeting',
      'Continuous ROI & Bid Optimization'
    ],
    icon: 'Target'
  },
  {
    id: 'seo',
    number: '04',
    title: 'Search Engine Optimization',
    description: 'Improve your organic search visibility with a structured SEO strategy designed for sustainable growth.',
    deliverables: [
      'Targeted Keyword & Competitor Research',
      'Technical SEO Audits & Core Web Vitals',
      'On-Page Structure & Content Optimization',
      'Authority & Link Architecture Strategy',
      'Organic Search Performance Monitoring'
    ],
    icon: 'TrendingUp'
  },
  {
    id: 'gbp',
    number: '05',
    title: 'Google Business Profile Optimization',
    description: 'Help customers discover your business on Google Search and Google Maps through an accurate, optimized business profile.',
    deliverables: [
      'Complete Profile Setup & Verification',
      'Primary & Secondary Category Optimization',
      'Business Details & Attributes Enhancement',
      'High-Quality Photo & Visual Asset Guidance',
      'Review Acquisition & Local Map Pack SEO'
    ],
    icon: 'MapPin'
  }
];

export const Services: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Monitor': return <Monitor className="w-6 h-6 text-[#C7FF4D]" />;
      case 'Video': return <Video className="w-6 h-6 text-[#C7FF4D]" />;
      case 'Target': return <Target className="w-6 h-6 text-[#C7FF4D]" />;
      case 'TrendingUp': return <TrendingUp className="w-6 h-6 text-[#C7FF4D]" />;
      case 'MapPin': return <MapPin className="w-6 h-6 text-[#C7FF4D]" />;
      default: return <Monitor className="w-6 h-6 text-[#C7FF4D]" />;
    }
  };

  const handleSelectService = (serviceTitle: string) => {
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: 'smooth' });
      // Dispatch a custom event to check this service in the contact form
      window.dispatchEvent(new CustomEvent('select-service', { detail: serviceTitle }));
    }
  };

  return (
    <section id="services" className="py-24 bg-[#050505] border-t border-[#252525]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase mb-3">
            // OUR CORE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
            Everything your business needs to grow online.
          </h2>
          <p className="mt-4 text-[#A5A5A5] text-lg leading-relaxed">
            From modern engineering to cutting-edge AI creative production and targeted acquisition campaigns, we engineer the digital solutions that scale your presence.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesData.map((service, index) => {
            const isFeatured = index === 0;
            return (
              <div
                key={service.id}
                className={`group rounded-2xl bg-[#0B0B0B] border border-[#252525] p-8 flex flex-col justify-between transition-all duration-300 hover:border-[#C7FF4D]/50 hover:bg-[#0e0e0e] relative overflow-hidden ${
                  isFeatured ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
              >
                {/* Subtle top lime indicator */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-[#C7FF4D] transition-colors duration-300" />

                <div>
                  {/* Top Bar with Number and Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-mono text-[#A5A5A5] group-hover:text-[#C7FF4D] transition-colors">
                      {service.number}
                    </span>
                    <div className="p-3 rounded-xl bg-[#050505] border border-[#252525] group-hover:border-[#C7FF4D]/40 transition-colors">
                      {getIcon(service.icon)}
                    </div>
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-2xl font-bold text-[#FFFFFF] mb-3 group-hover:text-white transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-[#A5A5A5] text-base leading-relaxed mb-6 font-normal">
                    {service.description}
                  </p>

                  {/* Deliverables List */}
                  <ul className="space-y-2.5 mb-8">
                    {service.deliverables.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#A5A5A5]">
                        <CheckCircle2 className="w-4 h-4 text-[#C7FF4D] mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Action */}
                <div className="pt-4 border-t border-[#252525] flex items-center justify-between">
                  <button
                    onClick={() => handleSelectService(service.title)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFFFFF] group-hover:text-[#C7FF4D] transition-colors"
                  >
                    <span>Request Service</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                  <span className="text-xs text-[#A5A5A5] font-mono">Tailored Scope</span>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

