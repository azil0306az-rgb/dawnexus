import React from 'react';
import { Search, Map, Rocket, LineChart } from 'lucide-react';

export const Process: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Discover',
      icon: Search,
      desc: 'We conduct a comprehensive review of your brand, current web assets, market positioning, target audience, and primary growth bottlenecks.'
    },
    {
      num: '02',
      title: 'Strategize',
      icon: Map,
      desc: 'We formulate a tailored roadmap defining website architecture, AI creative production formats, targeted paid campaigns, and organic SEO milestones.'
    },
    {
      num: '03',
      title: 'Build & Launch',
      icon: Rocket,
      desc: 'Our engineering and creative teams develop your responsive site, craft AI-driven promotional videos, configure analytics, and execute seamless deployment.'
    },
    {
      num: '04',
      title: 'Optimize & Improve',
      icon: LineChart,
      desc: 'We actively monitor engagement, test advertising variations, fine-tune search rankings, and optimize conversion funnels for compounding returns.'
    }
  ];

  return (
    <section className="py-24 bg-[#050505] border-t border-[#252525]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase mb-3">
            // OUR SYSTEMATIC METHODOLOGY
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
            From strategic vision to measurable execution.
          </h2>
          <p className="mt-4 text-[#A5A5A5] text-lg leading-relaxed">
            A structured four-phase process engineered to eliminate friction and deliver dependable results at every stage.
          </p>
        </div>

        {/* Steps Timeline / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 relative group hover:border-[#C7FF4D]/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-mono font-bold text-[#252525] group-hover:text-[#C7FF4D] transition-colors">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-[#050505] border border-[#252525] flex items-center justify-center text-[#C7FF4D]">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#FFFFFF] mb-3 group-hover:text-white">
                    {step.title}
                  </h3>

                  <p className="text-[#A5A5A5] text-sm leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#252525]/60 flex items-center justify-between text-xs text-[#A5A5A5] font-mono">
                  <span>Phase {step.num}</span>
                  <span className="w-2 h-2 rounded-full bg-[#252525] group-hover:bg-[#C7FF4D] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

