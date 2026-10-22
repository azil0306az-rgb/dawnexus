export interface EnquiryRecord {
  id: number;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  requested_services: string; // JSON string array
  budget: string;
  project_details: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Completed' | 'Archived';
  admin_notes: string;
  estimate_ref_id?: string | null;
  estimate_data?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryStats {
  total: number;
  new: number;
  inProgress: number;
  contacted: number;
  completed: number;
  archived: number;
}

export interface EnquiryFormData {
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  requested_services: string[];
  budget: string;
  project_details: string;
  website_hp?: string;
}

export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  description: string;
  deliverables: string[];
  icon: string;
  route?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  client: string;
  tagline: string;
  industry: string;
  services: string[];
  deliverables: string[];
  metrics: string;
  description: string;
  accent: string;
}

export type BlogStatus = 'Draft' | 'Scheduled' | 'Published' | 'Failed' | 'Archived';

export interface BlogRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  image_alt: string;
  author: string;
  category: string;
  tags: string; // JSON string array
  primary_keyword: string;
  secondary_keywords: string; // JSON string array
  target_location: string;
  search_intent: string;
  target_audience: string;
  target_questions: string; // JSON string array
  seo_title: string;
  meta_description: string;
  canonical_url: string;
  status: BlogStatus;
  scheduled_at: string | null;
  published_at: string | null;
  publication_error: string;
  admin_notes: string;
  seo_report?: string | null;
  content_revision?: string | null;
  // Version 8.3.0: Information Gain, E-E-A-T & Citation Answer Blocks
  firsthand_observations?: string;
  project_examples?: string;
  case_studies?: string;
  original_research_data?: string;
  implementation_process?: string;
  external_sources?: string; // JSON string array
  limitations_lessons?: string;
  author_role?: string;
  author_bio?: string;
  author_credentials?: string;
  reviewer_name?: string;
  editorial_notes?: string;
  citation_answer_blocks?: string; // JSON CitationAnswerBlockData[]
  review_cycle_days?: number;
  last_reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogStats {
  total: number;
  published: number;
  scheduled: number;
  drafts: number;
  failed: number;
}

export interface BlogInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  image_alt?: string;
  author?: string;
  category?: string;
  tags?: string[];
  primary_keyword?: string;
  secondary_keywords?: string[];
  target_location?: string;
  search_intent?: string;
  target_audience?: string;
  target_questions?: string[];
  seo_title?: string;
  meta_description?: string;
  canonical_url?: string;
  status?: BlogStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  admin_notes?: string;
  // Version 8.3.0: Information Gain, E-E-A-T & Citation Answer Blocks
  firsthand_observations?: string;
  project_examples?: string;
  case_studies?: string;
  original_research_data?: string;
  implementation_process?: string;
  external_sources?: string[] | string;
  limitations_lessons?: string;
  author_role?: string;
  author_bio?: string;
  author_credentials?: string;
  reviewer_name?: string;
  editorial_notes?: string;
  citation_answer_blocks?: CitationAnswerBlockData[] | string;
  review_cycle_days?: number;
  last_reviewed_at?: string | null;
}

export interface CitationAnswerBlockData {
  id: string;
  question: string;
  answer: string;
  supporting_details?: string;
  heading_tag?: 'h2' | 'h3';
}

export interface InformationGainCriterion {
  id: string;
  label?: string;
  name?: string;
  status?: 'pass' | 'warning' | 'needs_evidence';
  score: number; // 0 - 10
  maxScore?: number;
  weight?: number;
  feedback?: string;
  evidenceFound?: string;
  missingInformation?: string;
  recommendation?: string;
}

export interface InformationGainReport {
  score?: number; // 0 - 100
  overall_score?: number;
  overallScore?: number;
  ai_readiness_score?: number;
  answer_blocks_count?: number;
  has_original_data?: boolean;
  boilerplate_penalty?: number;
  criteria: InformationGainCriterion[];
  strengths?: string[];
  missingEvidence?: string[];
  actionableFixes?: string[];
  recommendations?: string[];
  overlapWarning?: {
    similarSlug?: string;
    similarTitle?: string;
    overlapReason?: string;
  };
  topical_depth?: string;
  disclaimer?: string;
}

export interface CitationAnswerBlockConfig {
  id?: string;
  heading_text: string;
  heading_level?: 'h2' | 'h3';
  concise_answer: string;
  supporting_points?: string[];
  source_reference?: string;
}
export type CitationAnswerBlockData = CitationAnswerBlockConfig;

export interface AiCitationObservation {
  id: number;
  article_slug: string;
  ai_platform?: string;
  source_ai: string;
  query_prompt: string;
  observed_date: string;
  observed_at?: string;
  citation_url?: string;
  cited_snippet?: string;
  notes?: string;
  recorded_by?: string;
  created_at?: string;
}

export interface ContextualCtaConfig {
  id: number;
  service_key: 'website-design' | 'seo-services' | 'ai-video-creation' | 'digital-marketing';
  title: string;
  headline: string;
  description: string;
  button_text: string;
  target_url: string;
  is_active: boolean | number;
  scroll_threshold?: number;
  dwell_time_seconds?: number;
}

export interface HtmlPayloadAuditResult {
  url: string;
  uncompressedBytes: number;
  uncompressedKb: number;
  thresholdBytes: number;
  isExceedingThreshold: boolean;
  domNodeCountEstimate: number;
  hasLargeBase64: boolean;
  recommendations: string[];
  measuredAt: string;
}

export interface SeoCheck {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  message: string;
  score: number; // 0 to 10
}

export interface SeoAuditResult {
  score: number; // 0 to 100
  checks: SeoCheck[];
  wordCount: number;
  readingTimeMinutes: number;
  headingsCount: { h1: number; h2: number; h3: number };
  keywordCounts: { keyword: string; count: number; inTitle: boolean; inHeading: boolean; inIntro: boolean }[];
  internalLinksCount: number;
  outboundLinksCount: number;
  hasImagesWithAlt: boolean;
  warnings: string[];
  recommendations: string[];
}

export interface NotificationSettingsData {
  id: number;
  active_email: string | null;
  is_verified: number;
  verified_at: string | null;
  pending_email: string | null;
  provider_status: 'resend' | 'smtp' | 'none';
  updated_at: string;
}

export interface WebsiteTypeConfig {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  includedPages: number;
  additionalPagePrice: number;
  iconName: string;
  badge?: string;
  popular?: boolean;
}

export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'core' | 'ecommerce' | 'booking' | 'marketing';
  compatibleWith?: string[];
}

export interface DesignTierConfig {
  id: 'Standard' | 'Premium' | 'Custom';
  name: string;
  description: string;
  priceAdjustment: number;
  badge?: string;
}

export interface MaintenanceOptionConfig {
  id: 'None' | 'Monthly' | 'Annual';
  name: string;
  description: string;
  amount: number;
  period: 'month' | 'year' | 'none';
  features: string[];
}

export interface CalculatorPricingConfig {
  version: number;
  currency: string;
  currencySymbol: string;
  websiteTypes: WebsiteTypeConfig[];
  features: FeatureConfig[];
  designTiers: DesignTierConfig[];
  maintenanceOptions: MaintenanceOptionConfig[];
  maxStandardPages: number;
  disclaimer: string;
  assumptions: string[];
  exclusions: string[];
  updatedAt: string;
}

export interface CalculatorSelections {
  websiteType: string;
  pageCount: number;
  selectedFeatures: string[];
  ecommerceDetails?: {
    productCatalogSize?: '1-20' | '21-100' | '100+';
    multiZoneShipping?: boolean;
  };
  bookingDetails?: {
    multiStaffOrLocation?: boolean;
    twoWayCalendarSync?: boolean;
  };
  customAppDetails?: {
    complexityTier?: 'MVP' | 'Advanced' | 'Enterprise';
    externalApiSync?: boolean;
  };
  designTier: 'Standard' | 'Premium' | 'Custom';
  maintenanceOption?: 'None' | 'Monthly' | 'Annual';
  timelinePreference?: 'Flexible' | 'Standard' | 'Urgent';
  contentReadiness?: 'Ready' | 'Needs Copywriting' | 'Rough Drafts';
  projectNotes?: string;
}

export interface CalculationBreakdownItem {
  id: string;
  label: string;
  description?: string;
  amount: number;
  isIncluded?: boolean;
  type: 'base' | 'pages' | 'feature' | 'design' | 'addon';
}

export interface CalculationResult {
  referenceId: string;
  websiteType: {
    id: string;
    name: string;
    description: string;
  };
  pageCount: number;
  includedPages: number;
  additionalPages: number;
  additionalPagePrice: number;
  additionalPagesTotal: number;
  designTier: {
    id: string;
    name: string;
    priceAdjustment: number;
  };
  items: CalculationBreakdownItem[];
  subtotalOneTime: number;
  recurringMaintenance: {
    type: string;
    name: string;
    amount: number;
    period: 'month' | 'year' | 'none';
  };
  isCustomQuoteRequired: boolean;
  customQuoteReasons: string[];
  currency: string;
  currencySymbol: string;
  estimatedDeliveryWeeks: {
    min: number;
    max: number;
  };
  assumptions: string[];
  exclusions: string[];
  disclaimer: string;
  configVersion: number;
  calculatedAt: string;
}

export interface Ga4ConnectionStatus {
  featureEnabled: boolean;
  hasGoogleCredentials: boolean;
  isConnected: boolean;
  hasGa4Scope: boolean;
  connectionStatus: 'Connected' | 'Missing GA4 Scope' | 'Disconnected' | 'Error';
  googleEmail: string | null;
  selectedProperty: string | null;
  selectedPropertyName: string | null;
  lastSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  redirectUri: string;
  diagnosticMessage?: string;
}

export interface Ga4OverviewTotals {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  avgEngagementDurationSeconds: number;
  screenPageViews: number;
  eventCount: number;
  conversions: number;
}


