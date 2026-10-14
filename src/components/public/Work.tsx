import React, { useState } from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import type { PortfolioItem } from '../../types';

export const conceptProjects: PortfolioItem[] = [
  {
    id: 'nexus-automata',
    title: 'Nexus Automata Platform',
    client: 'Concept Project / B2B SaaS',
    tagline: 'High-Converting Web Platform & Interactive Product Tour',
    industry: 'Enterprise AI & Automation',
    services: ['Website Design & Development', 'AI Video Creation'],
    deliverables: [
      'Responsive React/TypeScript Platform',
      'AI Product Walkthrough Video Suite',
      'SEO-Optimized Documentation Center',
      'Conversion Rate Architecture'
    ],
    metrics: 'Concept Spec: 42% Target Demo Bookings Lift',
    description:
      'A sleek, dark-mode SaaS web ecosystem designed for complex workflow visualization, rapid onboarding demos, and enterprise client qualification.',
    accent: '#C7FF4D'
  },
  {
    id: 'lumina-retail',
    title: 'Lumina Aesthetic Studio',
    client: 'Concept Project / Modern Retail',
    tagline: 'AI Social Video Engine & Google Business Profile Domination',
    industry: 'Luxury Retail & Aesthetics',
    services: ['AI Video Creation', 'Google Business Profile Optimization'],
    deliverables: [
      '20+ Short-form AI Reels for Instagram & TikTok',
      'Local Map Pack Optimization Strategy',
      'Customer Review Acquisition Playbook',
      'Visual Category Asset Redesign'
    ],
    metrics: 'Concept Spec: #1 Local Map Pack Target Rank',
    description:
      'Multi-channel visual branding blending AI-generated cinematic micro-videos with high-precision Google Maps local SEO to drive foot traffic.',
    accent: '#FFFFFF'
  },
  {
    id: 'vanguard-capital',
    title: 'Vanguard Growth Advisory',
    client: 'Concept Project / Fintech',
    tagline: 'AI-Integrated Performance Advertising & Technical SEO',
    industry: 'Financial Services & Wealth Tech',
    services: ['AI-Integrated Advertising', 'Search Engine Optimization'],
    deliverables: [
      'Google Search & Display Campaign Architecture',
      'AI-Generated Creative Variations & A/B Testing',
      'Deep Technical SEO & Schema Integration',
      'Dedicated High-Intent Landing Pages'
    ],
    metrics: 'Concept Spec: 3.8x Target ROAS Efficiency',
    description:
      'Comprehensive customer acquisition infrastructure engineered to lower cost-per-lead through machine-learning bidding models and organic search authority.',
    accent: '#C7FF4D'
  }
];

export interface ClientShowcaseItem {
  id: number;
  client_name: string;
  website_url: string;
  logo_url: string;
  hero_preview_url: string;
  service_category?: string;
  description?: string;
  display_order: number;
}

export const Work: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [clients, setClients] = useState<ClientShowcaseItem[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data?.items && Array.isArray(data.items)) {
          setClients(data.items);
        }
      })
      .catch(err => console.warn('Failed to load published clients:', err))
      .finally(() => {
        if (isMounted) setIsLoadingClients(false);
      });
    return () => { isMounted = false; };
  }, []);

  const filterOptions = [
    'All',
    'Website Design & Development',
    'AI Video Creation',
    'AI-Integrated Advertising',
    'Search Engine Optimization'
  ];

  const filteredProjects = selectedFilter === 'All'
    ? conceptProjects
    : conceptProjects.filter(p => p.services.includes(selectedFilter));

  const filteredClients = selectedFilter === 'All'
    ? clients
    : clients.filter(c => !c.service_category || c.service_category === selectedFilter || c.service_category.includes(selectedFilter));

  return (
    <section id="work" className="py-24 bg-[#0B0B0B] border-t border-[#252525]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ============================================================== */}
        {/* 1. FEATURED CLIENT SHOWCASE (REAL CLIENTS FROM CMS)           */}
        {/* ============================================================== */}
        {clients.length > 0 && (
          <div className="mb-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="max-w-2xl">
                <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase mb-3">
                  // OUR WORK &bull; CLIENT SHOWCASE
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
                  Building digital experiences for ambitious businesses.
                </h2>
                <p className="mt-4 text-[#A5A5A5] text-lg leading-relaxed">
                  Real client websites and custom digital infrastructure designed, engineered, and scaled by Dawnexus.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#050505] border border-[#252525] text-xs text-[#C7FF4D] font-mono shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#C7FF4D] animate-pulse" />
                <span>Verified Client Deployments</span>
              </div>
            </div>

            {/* Client Showcase Grid */}
            {filteredClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-[#050505] border border-[#252525] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#C7FF4D]/40 transition-all duration-300 group shadow-lg"
                >
                  <div>
                    {/* Website Hero Preview Frame */}
                    <div className="relative aspect-[16/10] bg-[#121212] overflow-hidden border-b border-[#252525]">
                      {client.hero_preview_url ? (
                        <img
                          src={client.hero_preview_url}
                          alt={`${client.client_name} website preview`}
                          loading="lazy"
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-[#737373]">
                          <span className="text-xs font-mono">Website Preview</span>
                          <span className="text-sm font-semibold text-white mt-1">{client.client_name}</span>
                        </div>
                      )}
                      
                      {/* Service Category Badge */}
                      {client.service_category && (
                        <div className="absolute top-3 right-3 bg-[#050505]/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-[#C7FF4D] border border-[#252525]">
                          {client.service_category}
                        </div>
                      )}
                    </div>

                    {/* Client Identity & Description */}
                    <div className="p-6">
                      <div className="flex items-center gap-3.5 mb-3.5">
                        {client.logo_url ? (
                          <div className="w-10 h-10 rounded-xl bg-[#0B0B0B] border border-[#252525] p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={client.logo_url}
                              alt={`${client.client_name} logo`}
                              loading="lazy"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#0B0B0B] border border-[#252525] flex items-center justify-center font-bold text-white text-sm shrink-0">
                            {client.client_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-[#C7FF4D] transition-colors">
                            {client.client_name}
                          </h3>
                          <div className="text-xs font-mono text-[#A5A5A5] truncate max-w-[200px]">
                            {client.website_url.replace(/^https?:\/\/(www\.)?/, '')}
                          </div>
                        </div>
                      </div>

                      {client.description && (
                        <p className="text-xs text-[#A5A5A5] leading-relaxed line-clamp-2 mt-2">
                          {client.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Visit Website Link */}
                  <div className="px-6 py-3.5 bg-[#0B0B0B] border-t border-[#252525] flex items-center justify-between text-xs">
                    <span className="text-[#A5A5A5] font-mono">Client Deployment</span>
                    <a
                      href={client.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFFFFF] group-hover:text-[#C7FF4D] flex items-center gap-1.5 font-medium transition-colors"
                    >
                      <span>Visit Website</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="py-12 px-6 rounded-2xl bg-[#050505] border border-[#252525] text-center">
                <p className="text-sm text-[#A5A5A5]">
                  No client showcase projects matching &ldquo;<span className="text-white font-medium">{selectedFilter}</span>&rdquo; yet.
                </p>
                <button
                  onClick={() => setSelectedFilter('All')}
                  className="mt-3 text-xs text-[#C7FF4D] hover:underline font-mono"
                >
                  View all showcase clients &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. CASE STUDIES & CONCEPT WORK SECTION                         */}
        {/* ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase mb-3">
              // CASE STUDIES & CONCEPT ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
              Crafted with precision. Built for impact.
            </h2>
            <p className="mt-4 text-[#A5A5A5] text-lg leading-relaxed">
              Explore how we translate business requirements into high-performing websites, AI video assets, and systematic marketing campaigns.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#050505] border border-[#252525] text-xs text-[#A5A5A5] font-mono shrink-0">
            <Tag className="w-3.5 h-3.5 text-[#C7FF4D]" />
            <span>Clearly Labeled Agency Concept Projects</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedFilter === filter
                  ? 'bg-[#C7FF4D] text-[#050505] font-bold shadow'
                  : 'bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Concept Portfolio Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-[#050505] border border-[#252525] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#C7FF4D]/40 transition-all duration-300 group"
            >
              <div className="p-7">
                {/* Header Tag and Client */}
                <div className="flex items-center justify-between text-xs font-mono mb-4 text-[#A5A5A5]">
                  <span className="text-[#C7FF4D]">{project.industry}</span>
                  <span className="bg-[#0B0B0B] px-2.5 py-1 rounded border border-[#252525]">
                    {project.client}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-white transition-colors">
                  {project.title}
                </h3>
                <p className="text-sm text-[#C7FF4D] font-medium mb-4">
                  {project.tagline}
                </p>

                <p className="text-sm text-[#A5A5A5] leading-relaxed mb-6 font-normal">
                  {project.description}
                </p>

                {/* Deliverables */}
                <div className="space-y-2 pt-4 border-t border-[#252525]">
                  <span className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider block">
                    Key Deliverables:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {project.deliverables.map((item, i) => (
                      <span
                        key={i}
                        className="text-xs bg-[#0B0B0B] text-[#FFFFFF]/80 px-2.5 py-1 rounded-md border border-[#252525]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="px-7 py-4 bg-[#0B0B0B] border-t border-[#252525] flex items-center justify-between text-xs">
                <span className="text-[#C7FF4D] font-mono font-medium">
                  {project.metrics}
                </span>
                <span className="text-[#A5A5A5] group-hover:text-white flex items-center gap-1 transition-colors">
                  <span>Explore Architecture</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

