import React from 'react';
import { Compass, Lightbulb, Zap, Check } from 'lucide-react';

export const WhyUs: React.FC = () => {
  const pillars = [
    {
      icon: Compass,
      title: 'Strategy First',
      eyebrow: 'FOUNDATION',
      description:
        'Every campaign and platform we build begins with understanding your business model, customer psychology, and competitive landscape. We reject template-based guesswork in favor of deliberate objectives.',
      points: [
        'Audience mapping and intent analysis',
        'Clear commercial positioning',
        'Data-grounded KPI milestones'
      ]
    },
    {
      icon: Lightbulb,
      title: 'Creativity With Purpose',
      eyebrow: 'DESIGN & MEDIA',
      description:
        'Visuals, copy, and video shouldn’t merely look attractive—they must communicate value, establish credibility, and guide visitors toward decisive action with clarity.',
      points: [
        'Narrative-driven video storytelling',
        'Conversion-focused visual hierarchy',
        'Consistent, memorable brand touchpoints'
      ]
    },
    {
      icon: Zap,
      title: 'Smarter Execution',
      eyebrow: 'TECHNOLOGY & AI',
      description:
        'We harness modern AI-accelerated workflows to produce high-velocity creative variations, accelerate development cycles, and continually refine targeting for optimal return on effort.',
      points: [
        'AI-accelerated production pipelines',
        'Rapid iteration on ads and landing pages',
        'Continuous performance auditing'
      ]
    }
  ];

  return (
    <section id="approach" className="py-24 bg-[#0B0B0B] border-t border-[#252525] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase mb-3">
            // THE DAWNEXUS DIFFERENCE
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
            More than digital presence. Built for progress.
          </h2>
          <p className="mt-4 text-[#A5A5A5] text-lg leading-relaxed">
            We unite commercial strategy, purposeful creative direction, and AI-powered execution into a single, cohesive engine for business growth.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className="bg-[#050505] border border-[#252525] rounded-2xl p-8 flex flex-col justify-between hover:border-[#C7FF4D]/40 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#252525] group-hover:border-[#C7FF4D]/40 text-[#C7FF4D] transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono text-[#A5A5A5] tracking-wider uppercase">
                      {pillar.eyebrow}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-[#FFFFFF] mb-3 group-hover:text-[#C7FF4D] transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-[#A5A5A5] text-sm leading-relaxed mb-6 font-normal">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-[#252525]">
                  <ul className="space-y-2.5">
                    {pillar.points.map((pt, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-[#FFFFFF]/80">
                        <Check className="w-3.5 h-3.5 text-[#C7FF4D] shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

