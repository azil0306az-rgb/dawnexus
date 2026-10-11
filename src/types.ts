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

