export interface ProductShowcaseItem {
  id: string;
  name: string;
  shortDescription: string;
  category: string;
  status: 'In Development' | 'Demo Available' | 'Coming Soon';
  thumbnailUrl: string;
  demoUrl?: string; // Only displayed if genuine and verified
  inquiryService: string;
}

export const PRODUCT_SHOWCASES_DATA: ProductShowcaseItem[] = [
  {
    id: 'website-quotation-builder',
    name: 'Website Quotation Builder',
    shortDescription: 'Interactive website configuration, budget estimation, and professional quotation generation.',
    category: 'Commercial Tools',
    status: 'Demo Available',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    demoUrl: '/website-cost-calculator',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'festival-theme-system',
    name: 'Festival Theme System',
    shortDescription: 'Scheduled festival themes, campaign visuals, and interactive website effects.',
    category: 'Creative Marketing',
    status: 'In Development',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'AI-Integrated Advertising'
  },
  {
    id: 'ai-seo-management',
    name: 'AI-Powered SEO Management',
    shortDescription: 'SEO analysis, recommendations, and content preparation for approval.',
    category: 'Search Optimization',
    status: 'In Development',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571786256017-aee7a0c009b6?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Search Engine Optimization'
  },
  {
    id: 'interactive-3d-real-estate',
    name: 'Interactive 3D Real Estate Showcase',
    shortDescription: 'Property and plot exploration, enquiries, and site-visit requests.',
    category: 'Immersive Experiences',
    status: 'Coming Soon',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'digital-warranty-service',
    name: 'Digital Warranty & Service Management',
    shortDescription: 'Product registration, warranty information, manuals, and service requests.',
    category: 'Customer Operations',
    status: 'Coming Soon',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'appointment-booking-automation',
    name: 'Appointment Booking Automation',
    shortDescription: 'Appointment requests, scheduling, and manual confirmation.',
    category: 'Automation & Operations',
    status: 'In Development',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Website Design & Development'
  },
  {
    id: '3d-product-configurator',
    name: '3D Product Configurator',
    shortDescription: 'Interactive product exploration and customization.',
    category: 'Immersive Experiences',
    status: 'Coming Soon',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'digital-3d-showroom',
    name: 'Digital 3D Showroom',
    shortDescription: 'Virtual product exploration and quotation requests.',
    category: 'Virtual Commerce',
    status: 'Coming Soon',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'website-visitor-analytics',
    name: 'Website Visitor Analytics',
    shortDescription: 'Visitor journeys, engagement, and enquiry conversion tracking.',
    category: 'Analytics & Insights',
    status: 'In Development',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'AI-Integrated Advertising'
  },
  {
    id: 'customer-review-management',
    name: 'Customer Review Management',
    shortDescription: 'Feedback collection, review requests, moderation, and satisfaction tracking.',
    category: 'Reputation & Growth',
    status: 'Coming Soon',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Google Business Profile Optimization'
  },
  {
    id: 'crm-for-businesses',
    name: 'CRM for Businesses',
    shortDescription: 'Contacts, enquiries, sales pipelines, tasks, and follow-ups.',
    category: 'Business Systems',
    status: 'In Development',
    thumbnailUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    inquiryService: 'Website Design & Development'
  }
];
