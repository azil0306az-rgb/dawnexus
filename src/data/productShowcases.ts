export interface ProductShowcaseItem {
  id: string;
  slug?: string;
  name: string;
  subtitle?: string;
  shortDescription: string;
  category: string;
  status: 'In Development' | 'Demo Available' | 'Coming Soon' | 'Live';
  badge?: string;
  thumbnailUrl: string;
  demoUrl?: string; // Only displayed if genuine and verified
  websiteUrl?: string;
  inquiryService: string;
  techStack?: string[];
  isFeatured?: boolean;
}

export const PRODUCT_SHOWCASES_DATA: ProductShowcaseItem[] = [
  {
    id: 'appointment-booking-automation',
    slug: 'appointment-booking-automation',
    name: 'Appointment Booking Automation',
    subtitle: 'Smart Self-Service Scheduling',
    shortDescription: 'Appointment requests, scheduling, and manual confirmation.',
    category: 'Automation & Operations',
    status: 'In Development',
    badge: 'Operations',
    thumbnailUrl: '/showcases/appointment-booking.webp',
    inquiryService: 'Website Design & Development',
    techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    isFeatured: true
  },
  {
    id: 'website-quotation-builder',
    slug: 'website-quotation-builder',
    name: 'Website Quotation Builder',
    subtitle: 'Interactive Cost Estimator',
    shortDescription: 'Live interactive cost estimation allowing prospective clients to configure website parameters, select feature add-ons, view itemized pricing, and receive instant downloadable PDF estimates.',
    category: 'Business Systems',
    status: 'Live',
    badge: 'Live Tool',
    thumbnailUrl: '/showcases/website-quotation-builder.webp',
    demoUrl: '/website-cost-calculator',
    inquiryService: 'Website Design & Development',
    techStack: ['React 19', 'jsPDF', 'Node.js', 'Tailwind CSS'],
    isFeatured: true
  },
  {
    id: 'festival-theme-system',
    slug: 'festival-theme-system',
    name: 'Festival Theme System',
    subtitle: 'Automated Campaign Styling',
    shortDescription: 'Scheduled festival themes, campaign visuals, and interactive website effects.',
    category: 'Creative Marketing',
    status: 'In Development',
    badge: 'Seasonal',
    thumbnailUrl: '/showcases/festival-theme-system.webp',
    inquiryService: 'AI-Integrated Advertising',
    techStack: ['React', 'Canvas API', 'Tailwind CSS', 'TypeScript']
  },
  {
    id: 'ai-seo-management',
    slug: 'ai-seo-management',
    name: 'AI-Powered SEO Management',
    subtitle: 'Autonomous Search Intelligence',
    shortDescription: 'SEO analysis, recommendations, and content preparation for approval.',
    category: 'Search Optimization',
    status: 'In Development',
    badge: 'AI Powered',
    thumbnailUrl: '/showcases/ai-seo-management.webp',
    inquiryService: 'Search Engine Optimization',
    techStack: ['Gemini 2.5', 'Claude MCP', 'Google Search Console API'],
    isFeatured: true
  },
  {
    id: 'interactive-3d-real-estate',
    slug: 'interactive-3d-real-estate',
    name: 'Interactive 3D Real Estate Showcase',
    subtitle: 'Virtual Property Explorer',
    shortDescription: 'Property and plot exploration, enquiries, and site-visit requests.',
    category: 'Immersive Experiences',
    status: 'Coming Soon',
    badge: 'WebGL',
    thumbnailUrl: '/showcases/3d-real-estate-showcase.webp',
    inquiryService: 'Website Design & Development',
    techStack: ['Three.js', 'WebGL', 'GLTF/GLB', 'React Three Fiber']
  },
  {
    id: 'digital-warranty-service',
    slug: 'digital-warranty-service',
    name: 'Digital Warranty & Service Management',
    subtitle: 'Paperless Warranty & Claims',
    shortDescription: 'Product registration, warranty information, manuals, and service requests.',
    category: 'Customer Operations',
    status: 'Coming Soon',
    badge: 'QR Code',
    thumbnailUrl: '/showcases/digital-warranty-service.webp',
    inquiryService: 'Website Design & Development',
    techStack: ['React', 'Node.js', 'Supabase Storage', 'PostgreSQL']
  },
  {
    id: '3d-product-configurator',
    slug: '3d-product-configurator',
    name: '3D Product Configurator',
    subtitle: 'Real-Time Customization',
    shortDescription: 'Interactive product exploration and customization.',
    category: 'Immersive Experiences',
    status: 'Coming Soon',
    badge: '3D PBR',
    thumbnailUrl: '/showcases/3d-product-configurator.webp',
    inquiryService: 'Website Design & Development',
    techStack: ['Three.js', 'WebGL', 'React', 'Tailwind CSS']
  },
  {
    id: 'digital-3d-showroom',
    slug: 'digital-3d-showroom',
    name: 'Digital 3D Showroom',
    subtitle: 'Virtual Retail Environment',
    shortDescription: 'Virtual product exploration and quotation requests.',
    category: 'Virtual Commerce',
    status: 'Coming Soon',
    badge: 'Spatial Commerce',
    thumbnailUrl: '/showcases/digital-3d-showroom.webp',
    inquiryService: 'Website Design & Development',
    techStack: ['Three.js', 'React', 'WebGL', 'Tailwind CSS']
  },
  {
    id: 'website-visitor-analytics',
    slug: 'website-visitor-analytics',
    name: 'Website Visitor Analytics',
    subtitle: 'First-Party Journey Telemetry',
    shortDescription: 'Visitor journeys, engagement, and enquiry conversion tracking.',
    category: 'Analytics & Insights',
    status: 'In Development',
    badge: 'Privacy-First',
    thumbnailUrl: '/showcases/website-visitor-analytics.webp',
    inquiryService: 'AI-Integrated Advertising',
    techStack: ['TypeScript', 'SQLite', 'Express', 'Tailwind CSS']
  },
  {
    id: 'customer-review-management',
    slug: 'customer-review-management',
    name: 'Customer Review Management',
    subtitle: 'Reputation & Feedback Automation',
    shortDescription: 'Feedback collection, review requests, moderation, and satisfaction tracking.',
    category: 'Reputation & Growth',
    status: 'Coming Soon',
    badge: 'Reputation',
    thumbnailUrl: '/showcases/customer-review-management.webp',
    inquiryService: 'Google Business Profile Optimization',
    techStack: ['React', 'Node.js', 'Google My Business API', 'Tailwind CSS']
  },
  {
    id: 'crm-for-businesses',
    slug: 'crm-for-businesses',
    name: 'CRM for Businesses',
    subtitle: 'Lead & Pipeline Management',
    shortDescription: 'Contacts, enquiries, sales pipelines, tasks, and follow-ups.',
    category: 'Business Systems',
    status: 'In Development',
    badge: 'Pipelines',
    thumbnailUrl: '/showcases/business-crm.webp',
    inquiryService: 'Website Design & Development',
    techStack: ['React', 'PostgreSQL', 'Express', 'TypeScript']
  }
];
