/**
 * Dawnexus Version 8.3.0 — Reusable Citation Answer Block Component
 * 
 * Semantic HTML structure optimized for human clarity and AI discovery:
 * 1. Meaningful question in <h2> or <h3>
 * 2. Immediately followed by a standard <p> containing direct, factual 40-60 word answer
 * 3. Optional supporting details outside the primary answer paragraph
 * 
 * STRICT COMPLIANCE: 100% visible to human readers. No cloaking or hidden text.
 */

import React from 'react';
import { HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export interface CitationAnswerBlockProps {
  question: string;
  answer: string;
  supportingDetails?: string | string[];
  headingTag?: 'h2' | 'h3';
  categoryBadge?: string;
  className?: string;
}

export const CitationAnswerBlock: React.FC<CitationAnswerBlockProps> = ({
  question,
  answer,
  supportingDetails,
  headingTag = 'h3',
  categoryBadge,
  className = ''
}) => {
  const HeadingComponent = headingTag;

  // Split supporting details if string with newlines or bullets
  let parsedDetails: string[] = [];
  if (Array.isArray(supportingDetails)) {
    parsedDetails = supportingDetails.filter(Boolean);
  } else if (typeof supportingDetails === 'string' && supportingDetails.trim()) {
    parsedDetails = supportingDetails
      .split('\n')
      .map(s => s.replace(/^[•\-\*\d\.]+\s*/, '').trim())
      .filter(Boolean);
  }

  // Calculate approximate word count for editorial reference
  const answerWordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div
      className={`citation-answer-block my-8 p-6 sm:p-8 rounded-2xl bg-[#0D0D0D] border border-[#252525] relative overflow-hidden transition hover:border-[#353535] ${className}`}
      data-testid="citation-answer-block"
    >
      {/* Decorative Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C7FF4D]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#303030] text-[11px] font-mono text-[#C7FF4D]">
          <Sparkles className="w-3 h-3" />
          <span>DIRECT ANSWER</span>
        </div>
        {categoryBadge && (
          <span className="text-[11px] font-mono text-neutral-400">
            {categoryBadge}
          </span>
        )}
      </div>

      {/* Meaningful Question Heading */}
      <HeadingComponent className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-3">
        {question}
      </HeadingComponent>

      {/* Primary Direct Answer Paragraph (immediately following heading) */}
      <p className="text-neutral-200 text-base sm:text-lg leading-relaxed font-normal mb-4">
        {answer}
      </p>

      {/* Optional Supporting Information Outside Primary Answer */}
      {parsedDetails.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#202020] space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
            Key Supporting Factors & Nuances
          </span>
          <ul className="space-y-2 text-sm text-neutral-300">
            {parsedDetails.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C7FF4D] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
