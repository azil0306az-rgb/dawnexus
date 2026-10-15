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
    id: 'festival-theme-system',
    name: 'Festival Theme System',
    shortDescription: 'Scheduled festival themes, campaign visuals, and interactive website effects.',
    category: 'Creative Marketing',
    status: 'In Development',
    thumbnailUrl: '/showcases/festival-theme-system.webp',
    inquiryService: 'AI-Integrated Advertising'
  },
  {
    id: 'ai-seo-management',
    name: 'AI-Powered SEO Management',
    shortDescription: 'SEO analysis, recommendations, and content preparation for approval.',
    category: 'Search Optimization',
    status: 'In Development',
    thumbnailUrl: '/showcases/ai-seo-management.webp',
    inquiryService: 'Search Engine Optimization'
  },
  {
    id: 'interactive-3d-real-estate',
    name: 'Interactive 3D Real Estate Showcase',
    shortDescription: 'Property and plot exploration, enquiries, and site-visit requests.',
    category: 'Immersive Experiences',
    status: 'Coming Soon',
    thumbnailUrl: '/showcases/3d-real-estate-showcase.webp',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'digital-warranty-service',
    name: 'Digital Warranty & Service Management',
    shortDescription: 'Product registration, warranty information, manuals, and service requests.',
    category: 'Customer Operations',
    status: 'Coming Soon',
    thumbnailUrl: '/showcases/digital-warranty-service.webp',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'appointment-booking-automation',
    name: 'Appointment Booking Automation',
    shortDescription: 'Appointment requests, scheduling, and manual confirmation.',
    category: 'Automation & Operations',
    status: 'In Development',
    thumbnailUrl: '/showcases/appointment-booking.webp',
    inquiryService: 'Website Design & Development'
  },
  {
    id: '3d-product-configurator',
    name: '3D Product Configurator',
    shortDescription: 'Interactive product exploration and customization.',
    category: 'Immersive Experiences',
    status: 'Coming Soon',
    thumbnailUrl: '/showcases/3d-product-configurator.webp',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'digital-3d-showroom',
    name: 'Digital 3D Showroom',
    shortDescription: 'Virtual product exploration and quotation requests.',
    category: 'Virtual Commerce',
    status: 'Coming Soon',
    thumbnailUrl: '/showcases/digital-3d-showroom.webp',
    inquiryService: 'Website Design & Development'
  },
  {
    id: 'website-visitor-analytics',
    name: 'Website Visitor Analytics',
    shortDescription: 'Visitor journeys, engagement, and enquiry conversion tracking.',
    category: 'Analytics & Insights',
    status: 'In Development',
    thumbnailUrl: '/showcases/website-visitor-analytics.webp',
    inquiryService: 'AI-Integrated Advertising'
  },
  {
    id: 'customer-review-management',
    name: 'Customer Review Management',
    shortDescription: 'Feedback collection, review requests, moderation, and satisfaction tracking.',
    category: 'Reputation & Growth',
    status: 'Coming Soon',
    thumbnailUrl: '/showcases/customer-review-management.webp',
    inquiryService: 'Google Business Profile Optimization'
  },
  {
    id: 'crm-for-businesses',
    name: 'CRM for Businesses',
    shortDescription: 'Contacts, enquiries, sales pipelines, tasks, and follow-ups.',
    category: 'Business Systems',
    status: 'In Development',
    thumbnailUrl: '/showcases/business-crm.webp',
    inquiryService: 'Website Design & Development'
  }
];

