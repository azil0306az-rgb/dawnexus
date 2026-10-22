import React, { useMemo, useState } from 'react';
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
  TrendingUp,
  AlertOctagon,
  Award,
  BookOpen,
  HelpCircle,
  Cpu,
  Layers
} from 'lucide-react';
import { analyzeSeo, SeoAnalysisInput } from '../../utils/seoAnalyzer';
import { analyzeInformationGain } from '../../utils/seoQuality';

interface SeoWritingAssistantProps {
  input: SeoAnalysisInput;
  blogData?: {
    firsthand_observations?: string;
    project_examples?: string;
    case_studies?: string;
    original_research_data?: string;
    implementation_process?: string;
    external_sources?: string[] | string;
    limitations_lessons?: string;
    author_role?: string;
    author_credentials?: string;
    citation_answer_blocks?: any[] | string;
  };
  onInsertText?: (text: string) => void;
}

export const SeoWritingAssistant: React.FC<SeoWritingAssistantProps> = ({
  input,
  blogData,
  onInsertText
}) => {
  const [activeTab, setActiveTab] = useState<'info_gain' | 'technical'>('info_gain');

  // Traditional technical SEO analysis
  const technicalAudit = useMemo(() => analyzeSeo(input), [input]);

  // Information Gain & AI Discovery audit
  const infoGainAudit = useMemo(() => {
    return analyzeInformationGain({
      title: input.title,
      content: input.content,
      firsthand_observations: blogData?.firsthand_observations,
      project_examples: blogData?.project_examples,
      case_studies: blogData?.case_studies,
      original_research_data: blogData?.original_research_data,
      implementation_process: blogData?.implementation_process,
      external_sources: blogData?.external_sources,
      limitations_lessons: blogData?.limitations_lessons,
      author_role: blogData?.author_role,
      author_credentials: blogData?.author_credentials,
      citation_answer_blocks: blogData?.citation_answer_blocks
    });
  }, [input, blogData]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-[#C7FF4D]/10', border: 'border-[#C7FF4D]/30', text: 'text-[#C7FF4D]', label: 'Optimized' };
    if (score >= 50) return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Needs Polish' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Needs Improvement' };
  };

  const activeScore = activeTab === 'info_gain' ? (infoGainAudit.overall_score || infoGainAudit.score || 0) : technicalAudit.score;
  const scoreStyle = getScoreColor(activeScore);

  return (
    <div className="bg-[#0D0D0D] border border-[#252525] rounded-xl p-5 space-y-5 text-sm">
      {/* Header & Score Gauge */}
      <div className="flex items-center justify-between pb-4 border-b border-[#202020]">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-[#C7FF4D]" />
          <div>
            <h3 className="font-semibold text-white tracking-wide">SEO & Quality Assistant</h3>
            <span className="text-[11px] text-neutral-400">v8.3.0 Information Gain Engine</span>
          </div>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${scoreStyle.bg} ${scoreStyle.border}`}>
          <span className={`text-base font-bold ${scoreStyle.text}`}>{activeScore}/100</span>
          <span className={`text-xs uppercase tracking-wider font-medium ${scoreStyle.text}`}>
            {scoreStyle.label}
          </span>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex rounded-lg bg-[#141414] p-1 border border-[#222]">
        <button
          type="button"
          onClick={() => setActiveTab('info_gain')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
            activeTab === 'info_gain'
              ? 'bg-[#C7FF4D] text-black font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Information Gain & AI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('technical')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition ${
            activeTab === 'technical'
              ? 'bg-[#C7FF4D] text-black font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Technical SEO</span>
        </button>
      </div>

      {activeTab === 'info_gain' ? (
        <div className="space-y-4">
          {/* Information Gain Pillars Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <span className="text-neutral-400 block text-[11px]">Direct Answers</span>
              <span className="text-white font-semibold">
                {infoGainAudit.answer_blocks_count || 0} {(infoGainAudit.answer_blocks_count || 0) === 1 ? 'block' : 'blocks'}
              </span>
            </div>
            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <span className="text-neutral-400 block text-[11px]">Original Data/Cases</span>
              <span className="text-white font-semibold">
                {infoGainAudit.has_original_data ? 'Documented' : 'None provided'}
              </span>
            </div>
            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <span className="text-neutral-400 block text-[11px]">Author Credibility</span>
              <span className="text-white font-semibold">
                {blogData?.author_credentials ? 'Verified' : 'Pending credentials'}
              </span>
            </div>
            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <span className="text-neutral-400 block text-[11px]">AI Discovery Status</span>
              <span className={(infoGainAudit.ai_readiness_score || 0) >= 70 ? 'text-[#C7FF4D] font-semibold' : 'text-amber-400 font-semibold'}>
                {(infoGainAudit.ai_readiness_score || 0) >= 70 ? 'Ready for Citation' : 'Add Answers'}
              </span>
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Information Gain Criteria
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {(infoGainAudit.criteria || []).map(crit => {
                const maxSc = crit.maxScore || 10;
                let Icon = CheckCircle2;
                let iconColor = 'text-[#C7FF4D]';
                if (crit.score === 0) {
                  Icon = XCircle;
                  iconColor = 'text-red-400';
                } else if (crit.score < maxSc) {
                  Icon = AlertTriangle;
                  iconColor = 'text-amber-400';
                }
                return (
                  <div
                    key={crit.id}
                    className="flex items-start space-x-2.5 p-2 bg-[#121212] rounded-lg border border-[#1e1e1e]"
                  >
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white text-xs">{crit.name || crit.label}</span>
                        <span className="text-[11px] text-neutral-500">
                          {crit.score}/{maxSc}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{crit.feedback || crit.evidenceFound || crit.recommendation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boilerplate Warnings */}
          {(infoGainAudit.boilerplate_penalty || 0) > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1">
              <div className="flex items-center space-x-2 text-red-400 font-medium text-xs">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Boilerplate Clichés Detected (-{infoGainAudit.boilerplate_penalty} pts)</span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Replace generic introductory clichés (e.g. "In today's fast-paced digital world") with concrete, firsthand observations or specific data.
              </p>
            </div>
          )}

          {/* Recommendations */}
          {(infoGainAudit.recommendations || []).length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#202020]">
              <div className="text-xs font-semibold text-neutral-300">E-E-A-T & Quality Steps</div>
              <ul className="space-y-1">
                {(infoGainAudit.recommendations || []).slice(0, 3).map((rec: string, i: number) => (
                  <li key={i} className="text-xs text-neutral-400 flex items-start space-x-1.5">
                    <span className="text-[#C7FF4D] font-bold leading-none mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Real-time Content Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                <span>Word Count</span>
              </div>
              <div className="text-base font-bold text-white">{technicalAudit.wordCount}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                ~{technicalAudit.readingTimeMinutes} min
              </div>
            </div>

            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-neutral-400" />
                <span>Primary KW</span>
              </div>
              <div className="text-base font-bold text-white">
                {technicalAudit.keywordCounts[0]?.count || 0}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                {technicalAudit.wordCount > 0 && technicalAudit.keywordCounts[0]
                  ? `${((technicalAudit.keywordCounts[0].count / technicalAudit.wordCount) * 100).toFixed(1)}% density`
                  : '0% density'}
              </div>
            </div>

            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
                <Heading className="w-3.5 h-3.5 text-neutral-400" />
                <span>Headings</span>
              </div>
              <div className="text-base font-bold text-white">
                {technicalAudit.headingsCount.h2 + technicalAudit.headingsCount.h3}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                {technicalAudit.headingsCount.h2} H2, {technicalAudit.headingsCount.h3} H3
              </div>
            </div>

            <div className="bg-[#121212] border border-[#202020] rounded-lg p-2.5">
              <div className="flex items-center space-x-1.5 text-xs text-neutral-400 mb-1">
                <Link2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Internal Links</span>
              </div>
              <div className="text-base font-bold text-white">{technicalAudit.internalLinksCount}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                {technicalAudit.internalLinksCount > 0 ? 'Linked' : 'None'}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {technicalAudit.warnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
              <div className="flex items-center space-x-2 text-amber-400 font-medium text-xs">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Technical Alerts</span>
              </div>
              {technicalAudit.warnings.map((warn, i) => (
                <p key={i} className="text-xs text-neutral-300 pl-6">
                  {warn}
                </p>
              ))}
            </div>
          )}

          {/* Checklist Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Technical On-Page Signals
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {technicalAudit.checks.map(check => {
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
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{check.message}</p>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
};
