import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Sparkles,
  Link2,
  Heading,
  FileText,
  Clock,
  MapPin,
  TrendingUp,
  AlertOctagon
} from 'lucide-react';
import { analyzeSeo, SeoAnalysisInput } from '../../utils/seoAnalyzer';

interface SeoWritingAssistantProps {
  input: SeoAnalysisInput;
  onInsertText?: (text: string) => void;
}

export const SeoWritingAssistant: React.FC<SeoWritingAssistantProps> = ({ input, onInsertText }) => {
  const audit = useMemo(() => analyzeSeo(input), [input]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-[#C7FF4D]/10', border: 'border-[#C7FF4D]/30', text: 'text-[#C7FF4D]', label: 'Optimized' };
    if (score >= 50) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Needs Polish' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Needs Improvement' };
  };

  const scoreStyle = getScoreColor(audit.score);

  return (
    <div className="bg-[#0D0D0D] border border-[#252525] rounded-xl p-5 space-y-6 text-sm">
      {/* Header & Score Gauge */}
      <div className="flex items-center justify-between pb-4 border-b border-[#202020]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#C7FF4D]" />
          <h3 className="font-semibold text-white tracking-wide">SEO Writing Assistant</h3>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${scoreStyle.bg} ${scoreStyle.border}`}>
          <span className={`text-base font-bold ${scoreStyle.text}`}>{audit.score}/100</span>
          <span className={`text-xs uppercase tracking-wider font-medium ${scoreStyle.text}`}>
            {scoreStyle.label}
          </span>
        </div>
      </div>

      {/* Real-time Content Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121212] border border-[#202020] rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span>Word Count</span>
          </div>
          <div className="text-lg font-bold text-white">{audit.wordCount}</div>
          <div className="text-[11px] text-neutral-500 flex items-center space-x-1 mt-0.5">
            <Clock className="w-3 h-3 inline" />
            <span>~{audit.readingTimeMinutes} min read</span>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#202020] rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
            <span>Primary KW</span>
          </div>
          <div className="text-lg font-bold text-white">
            {audit.keywordCounts[0]?.count || 0}
            <span className="text-xs font-normal text-neutral-400 ml-1">times</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {audit.wordCount > 0 && audit.keywordCounts[0]
              ? `${((audit.keywordCounts[0].count / audit.wordCount) * 100).toFixed(1)}% density`
              : '0% density'}
          </div>
        </div>

        <div className="bg-[#121212] border border-[#202020] rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
            <Heading className="w-3.5 h-3.5 text-neutral-400" />
            <span>Headings</span>
          </div>
          <div className="text-lg font-bold text-white">
            {audit.headingsCount.h2 + audit.headingsCount.h3}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {audit.headingsCount.h2} H2s, {audit.headingsCount.h3} H3s
          </div>
        </div>

        <div className="bg-[#121212] border border-[#202020] rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
            <Link2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Internal Links</span>
          </div>
          <div className="text-lg font-bold text-white">{audit.internalLinksCount}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {audit.internalLinksCount > 0 ? 'Service linked' : 'None detected'}
          </div>
        </div>
      </div>

      {/* Warnings & Critical Over-optimization notices */}
      {audit.warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1.5">
          <div className="flex items-center space-x-2 text-amber-400 font-medium text-xs">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Optimization Alert</span>
          </div>
          {audit.warnings.map((warn, i) => (
            <p key={i} className="text-xs text-neutral-300 pl-6">
              {warn}
            </p>
          ))}
        </div>
      )}

      {/* Checklist Breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          SEO Signals & Readiness
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {audit.checks.map(check => {
            let Icon = CheckCircle2;
            let iconColor = 'text-[#C7FF4D]';
            if (check.status === 'fail') {
              Icon = XCircle;
              iconColor = 'text-red-400';
            } else if (check.status === 'warning') {
              Icon = AlertTriangle;
              iconColor = 'text-amber-400';
            } else if (check.status === 'info') {
              Icon = Info;
              iconColor = 'text-blue-400';
            }

            return (
              <div
                key={check.id}
                className="flex items-start space-x-2.5 p-2 bg-[#121212] rounded-lg border border-[#1e1e1e]"
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white text-xs">{check.label}</span>
                    <span className="text-[11px] text-neutral-500">{check.score}/10</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">{check.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyword Distribution Status */}
      {input.primary_keyword && (
        <div className="p-3 bg-[#121212] border border-[#202020] rounded-lg space-y-2">
          <div className="text-xs font-medium text-neutral-300">
            Keyword Distribution: <span className="text-white font-semibold">{input.primary_keyword}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className={`p-1.5 rounded ${audit.keywordCounts[0]?.inTitle ? 'bg-[#C7FF4D]/10 text-[#C7FF4D]' : 'bg-red-500/10 text-red-400'}`}>
              Title: {audit.keywordCounts[0]?.inTitle ? 'Included' : 'Missing'}
            </div>
            <div className={`p-1.5 rounded ${audit.keywordCounts[0]?.inIntro ? 'bg-[#C7FF4D]/10 text-[#C7FF4D]' : 'bg-amber-500/10 text-amber-400'}`}>
              Intro: {audit.keywordCounts[0]?.inIntro ? 'Included' : 'Missing'}
            </div>
            <div className={`p-1.5 rounded ${audit.keywordCounts[0]?.inHeading ? 'bg-[#C7FF4D]/10 text-[#C7FF4D]' : 'bg-amber-500/10 text-amber-400'}`}>
              Headings: {audit.keywordCounts[0]?.inHeading ? 'Included' : 'Missing'}
            </div>
          </div>
        </div>
      )}

      {/* Quick Insert Dawnexus Internal Links */}
      {onInsertText && (
        <div className="space-y-2 pt-2 border-t border-[#202020]">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium">Quick Insert Internal Links</span>
            <span className="text-[11px] text-neutral-500">Click to append</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onInsertText('<p>Explore our <a href="/services/website-design">Website Design & Development</a> solutions.</p>')}
              className="text-[11px] px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white rounded border border-[#282828] transition"
            >
              + Website Design
            </button>
            <button
              type="button"
              onClick={() => onInsertText('<p>Discover our proven <a href="/services/seo-services">SEO Services</a> for organic visibility.</p>')}
              className="text-[11px] px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white rounded border border-[#282828] transition"
            >
              + SEO Services
            </button>
            <button
              type="button"
              onClick={() => onInsertText('<p>Learn about our <a href="/services/ai-video-creation">AI Video Creation</a> workflow.</p>')}
              className="text-[11px] px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white rounded border border-[#282828] transition"
            >
              + AI Video
            </button>
            <button
              type="button"
              onClick={() => onInsertText('<p>Grow your brand with our <a href="/services/digital-marketing">Digital Marketing</a> campaigns.</p>')}
              className="text-[11px] px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-neutral-300 hover:text-white rounded border border-[#282828] transition"
            >
              + Digital Marketing
            </button>
            <button
              type="button"
              onClick={() => onInsertText('<p>Ready to scale your business? <a href="#contact">Contact Dawnexus</a> today.</p>')}
              className="text-[11px] px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] text-[#C7FF4D] rounded border border-[#C7FF4D]/30 transition"
            >
              + Contact CTA
            </button>
          </div>
        </div>
      )}

      {/* High Priority Recommendations */}
      {audit.recommendations.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[#202020]">
          <div className="text-xs font-semibold text-neutral-300">Actionable Suggestions</div>
          <ul className="space-y-1">
            {audit.recommendations.slice(0, 4).map((rec, i) => (
              <li key={i} className="text-xs text-neutral-400 flex items-start space-x-1.5">
                <span className="text-[#C7FF4D] font-bold leading-none mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
