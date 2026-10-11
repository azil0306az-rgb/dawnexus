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


