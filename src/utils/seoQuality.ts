/**
 * Dawnexus Version 8.3.0 — Client Information Gain & Content Quality Analyzer
 */

import { InformationGainReport, InformationGainCriterion } from '../types';

const BOILERPLATE_PATTERNS = [
  /in today'?s fast-?paced (digital|business) world/i,
  /it is important to remember that/i,
  /without further ado/i,
  /in conclusion, it can be said that/i,
  /a dime a dozen/i,
  /in the modern era/i,
  /revolutionize the way we/i,
  /game-?changer for businesses/i
];

export function analyzeInformationGain(article: {
  title: string;
  content: string;
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
}): InformationGainReport {
  const content = article.content || '';
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;

  let extSources: string[] = [];
  try {
    extSources = typeof article.external_sources === 'string'
      ? JSON.parse(article.external_sources)
      : (article.external_sources || []);
  } catch {}

  let answerBlocks: any[] = [];
  try {
    answerBlocks = typeof article.citation_answer_blocks === 'string'
      ? JSON.parse(article.citation_answer_blocks)
      : (article.citation_answer_blocks || []);
  } catch {}

  const criteria: InformationGainCriterion[] = [];
  const strengths: string[] = [];
  const missingEvidence: string[] = [];
  const actionableFixes: string[] = [];

  // 1. Firsthand Observations & Project Context
  const obs = (article.firsthand_observations || '').trim();
  const proj = (article.project_examples || '').trim();
  if (obs.length >= 80 || proj.length >= 80) {
    criteria.push({
      id: 'firsthand_expertise',
      label: 'Firsthand Field Observations',
      status: 'pass',
      score: 10,
      evidenceFound: 'Verified firsthand technical observations or project context provided.',
      missingInformation: 'None',
      recommendation: 'Ensure field observations highlight specific implementation nuances.'
    });
    strengths.push('Original firsthand technical observations documented.');
  } else if (obs.length > 0 || proj.length > 0) {
    criteria.push({
      id: 'firsthand_expertise',
      label: 'Firsthand Field Observations',
      status: 'warning',
      score: 6,
      evidenceFound: 'Brief observations recorded (<80 chars).',
      missingInformation: 'Specific delivery challenges or engineering notes are sparse.',
      recommendation: 'Expand with specific real-world obstacles and solutions from client delivery.'
    });
    actionableFixes.push('Elaborate on firsthand challenges encountered during real deployments.');
  } else {
    criteria.push({
      id: 'firsthand_expertise',
      label: 'Firsthand Field Observations',
      status: 'needs_evidence',
      score: 2,
      evidenceFound: 'No dedicated firsthand observation or field scenario provided.',
      missingInformation: 'Missing firsthand project evidence. Generic summaries provide low information gain.',
      recommendation: 'Add at least one real field observation or project scenario under Original Evidence.'
    });
    missingEvidence.push('Firsthand field observations or project scenarios');
    actionableFixes.push('Add firsthand technical observations under the Original Evidence tab.');
  }

  // 2. Case Studies & Research Data
  const cases = (article.case_studies || '').trim();
  const research = (article.original_research_data || '').trim();
  if (cases.length >= 80 || research.length >= 80) {
    criteria.push({
      id: 'case_study_data',
      label: 'Original Case Studies & Data',
      status: 'pass',
      score: 10,
      evidenceFound: 'Original case studies or verified benchmark figures included.',
      missingInformation: 'None',
      recommendation: 'Verify metrics align with client-approved case summaries.'
    });
    strengths.push('Original case study or internal data figures attached.');
  } else if (cases.length > 0 || research.length > 0) {
    criteria.push({
      id: 'case_study_data',
      label: 'Original Case Studies & Data',
      status: 'warning',
      score: 6,
      evidenceFound: 'Brief case study notes provided.',
      missingInformation: 'Measurable outcomes or baseline before/after numbers.',
      recommendation: 'Include measurable results (e.g. % load time reduction, conversion lift).'
    });
  } else {
    criteria.push({
      id: 'case_study_data',
      label: 'Original Case Studies & Data',
      status: 'needs_evidence',
      score: 4,
      evidenceFound: 'No case study or proprietary benchmark data attached.',
      missingInformation: 'Optional for purely conceptual guides, but valuable for commercial trust.',
      recommendation: 'Attach an anonymized or approved client case study if available.'
    });
    missingEvidence.push('Verified case study or proprietary benchmark data');
  }

  // 3. Actionable Implementation Process
  const proc = (article.implementation_process || '').trim();
  const hasNumberedLists = /<ol[^>]*>|1\.\s+[A-Z]/i.test(content);
  if (proc.length >= 80 || (hasNumberedLists && h2Count >= 2)) {
    criteria.push({
      id: 'actionable_steps',
      label: 'Actionable Implementation Steps',
      status: 'pass',
      score: 10,
      evidenceFound: 'Procedural steps or step-by-step workflow detected.',
      missingInformation: 'None',
      recommendation: 'Keep steps numbered and easy to execute.'
    });
    strengths.push('Provides concrete procedural steps or structured implementation workflow.');
  } else {
    criteria.push({
      id: 'actionable_steps',
      label: 'Actionable Implementation Steps',
      status: 'warning',
      score: 5,
      evidenceFound: 'Theoretical content without concrete implementation milestones.',
      missingInformation: 'Step-by-step execution roadmap.',
      recommendation: 'Outline a 3-to-5 step actionable implementation process under Original Evidence.'
    });
    actionableFixes.push('Add an actionable step-by-step implementation guide.');
  }

  // 4. Primary External Sources & Authoritative Citations
  const hasOutbound = /<a[^>]+href=["'](https?:\/\/(?!www\.dawnexus\.in|dawnexus\.in)[^"']+)["'][^>]*>/i.test(content);
  if (extSources.length > 0 || hasOutbound) {
    criteria.push({
      id: 'external_references',
      label: 'Primary Sources & Technical Docs',
      status: 'pass',
      score: 9,
      evidenceFound: `Cited ${extSources.length} external source(s) or primary documentation link(s).`,
      missingInformation: 'None',
      recommendation: 'Ensure URLs point to official documentation.'
    });
    strengths.push('Cites primary documentation or authoritative external sources.');
  } else {
    criteria.push({
      id: 'external_references',
      label: 'Primary Sources & Technical Docs',
      status: 'warning',
      score: 5,
      evidenceFound: 'No outbound documentation citations detected.',
      missingInformation: 'Links to official standards (Google Search Central, MDN, W3C).',
      recommendation: 'Support technical claims with links to official documentation or primary research.'
    });
    missingEvidence.push('Links to official primary documentation (MDN, W3C, Google)');
    actionableFixes.push('Link to primary documentation to verify technical statements.');
  }

  // 5. Trade-offs, Edge Cases & Limitations
  const limits = (article.limitations_lessons || '').trim();
  if (limits.length >= 50) {
    criteria.push({
      id: 'limitations_lessons',
      label: 'Nuance & Limitations Acknowledged',
      status: 'pass',
      score: 10,
      evidenceFound: 'Acknowledges constraints, trade-offs, and boundary conditions.',
      missingInformation: 'None',
      recommendation: 'Transparent trade-offs reinforce author credibility.'
    });
    strengths.push('Acknowledges trade-offs and scenarios where this approach is suboptimal.');
  } else {
    criteria.push({
      id: 'limitations_lessons',
      label: 'Nuance & Limitations Acknowledged',
      status: 'warning',
      score: 4,
      evidenceFound: 'Presents a universal solution without trade-offs or constraints.',
      missingInformation: 'When does this method fail? What are the cost/complexity trade-offs?',
      recommendation: 'Document real constraints under Lessons Learned in the Original Evidence tab.'
    });
    actionableFixes.push('State when this strategy might not apply (e.g. low budget, high complexity).');
  }

  // 6. Fluff & Cliché Elimination
  let fillerCount = 0;
  for (const regex of BOILERPLATE_PATTERNS) {
    if (regex.test(content)) fillerCount++;
  }
  if (fillerCount === 0) {
    criteria.push({
      id: 'boilerplate_cleanliness',
      label: 'Direct Phrasing & Zero Fluff',
      status: 'pass',
      score: 10,
      evidenceFound: 'Value-dense prose with zero detected filler clichés.',
      missingInformation: 'None',
      recommendation: 'Preserve immediate, direct answers.'
    });
  } else {
    criteria.push({
      id: 'boilerplate_cleanliness',
      label: 'Direct Phrasing & Zero Fluff',
      status: 'warning',
      score: Math.max(3, 10 - (fillerCount * 3)),
      evidenceFound: `Detected ${fillerCount} filler/cliché phrase(s).`,
      missingInformation: 'Direct, factual phrasing in introductory sentences.',
      recommendation: 'Replace generic filler (e.g. "In today\'s fast-paced world") with immediate answers.'
    });
    actionableFixes.push('Eliminate generic introductory filler phrases.');
  }

  // 7. AI Discovery & Citation Answer Blocks
  if (answerBlocks.length > 0) {
    criteria.push({
      id: 'citation_blocks',
      label: 'Citation Answer Blocks (AI Discovery)',
      status: 'pass',
      score: 10,
      evidenceFound: `Configured ${answerBlocks.length} structured direct Citation Answer Block(s).`,
      missingInformation: 'None',
      recommendation: 'Ensure answers stay within 40-60 words for concise clarity.'
    });
    strengths.push(`Structured with ${answerBlocks.length} Citation Answer Block(s) for AI discoverability.`);
  } else {
    criteria.push({
      id: 'citation_blocks',
      label: 'Citation Answer Blocks (AI Discovery)',
      status: 'warning',
      score: 5,
      evidenceFound: 'No dedicated Citation Answer Block configured.',
      missingInformation: 'Direct 40-60 word answer to main question in an H2/H3 + <p> format.',
      recommendation: 'Add at least one Citation Answer Block under the Citation Blocks tab.'
    });
    actionableFixes.push('Add a Citation Answer Block to answer the primary query directly in 40-60 words.');
  }

  // 8. Author Role & Credibility (E-E-A-T)
  const role = (article.author_role || '').trim();
  const creds = (article.author_credentials || '').trim();
  if (role && creds) {
    criteria.push({
      id: 'author_eeat',
      label: 'E-E-A-T Author Role & Credentials',
      status: 'pass',
      score: 10,
      evidenceFound: `Author verified with professional role (${role}) and credentials (${creds}).`,
      missingInformation: 'None',
      recommendation: 'Keep author biography updated.'
    });
    strengths.push('Author credentials and verified engineering role documented.');
  } else {
    criteria.push({
      id: 'author_eeat',
      label: 'E-E-A-T Author Role & Credentials',
      status: 'warning',
      score: 5,
      evidenceFound: 'Basic author name provided without specific verified credentials.',
      missingInformation: 'Author role, technical background, or credentials.',
      recommendation: 'Specify author role and credentials under the Original Evidence tab.'
    });
    missingEvidence.push('Verified author credentials or engineering role');
  }

  // Calculate weighted score
  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxScore = criteria.length * 10;
  const overallScore = Math.round((totalScore / maxScore) * 100);

  const enrichedCriteria = criteria.map(c => ({
    ...c,
    name: c.label,
    maxScore: 10,
    feedback: c.evidenceFound || c.recommendation || ''
  }));

  const hasData = Boolean(
    article.firsthand_observations ||
    article.project_examples ||
    article.case_studies ||
    article.original_research_data
  );

  return {
    score: overallScore,
    overall_score: overallScore,
    overallScore,
    ai_readiness_score: Math.min(100, Math.round((answerBlocks.length * 35) + (hasData ? 30 : 0))),
    answer_blocks_count: answerBlocks.length,
    has_original_data: hasData,
    boilerplate_penalty: boilerplateCount * 5,
    criteria: enrichedCriteria,
    strengths,
    missingEvidence,
    actionableFixes,
    recommendations: actionableFixes,
    disclaimer: 'Internal editorial quality assessment designed to maximize information gain and technical rigor. This is NOT an official Google ranking factor.'
  };
}
