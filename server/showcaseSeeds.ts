export interface SeedShowcaseItem {
  title: string;
  slug: string;
  card_heading: string;
  full_heading: string;
  short_description: string;
  detailed_description: string;
  category: string;
  tagline: string;
  display_order: number;
  is_featured: number;
  is_visible: number;
  status: 'Live' | 'In Development' | 'Coming Soon';
  launch_date: string;
  project_url: string;
  link_label: string;
  is_link_enabled: number;
  open_in_new_tab: number;
  inquiry_service: string;
  screenshot_url: string;
  screenshot_alt: string;
  features: Array<{ id: string; title: string; description: string; display_order: number; icon?: string }>;
  workflow_steps: Array<{ step_number: number; title: string; description: string; icon?: string }>;
  tech_stack: string[];
  intended_audience: string;
  publication_status: 'Draft' | 'Published' | 'Archived';
}

export const SEED_SHOWCASES: SeedShowcaseItem[] = [
  {
    title: 'Appointment Booking Automation',
    slug: 'appointment-booking-automation',
    card_heading: 'Smart Self-Service Scheduling',
    full_heading: 'Intelligent Appointment Booking & Automated Reservation Engine',
    short_description: 'Appointment requests, scheduling, and manual confirmation.',
    detailed_description: 'End-to-end booking automation eliminating phone tag and scheduling friction. Empowers clients to explore services, choose open dates, select real-time availability slots, submit project requirements, and receive automated notifications.',
    category: 'Automation & Operations',
    tagline: 'Zero Friction Booking Workflow',
    display_order: 1,
    is_featured: 1,
    is_visible: 1,
    status: 'In Development',
    launch_date: 'Q1 2027',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/appointment-booking.webp',
    screenshot_alt: 'Appointment booking automation dashboard showing calendar slots and service choices',
    features: [
      { id: 'feat-1', title: 'Multi-Service Selection', description: 'Clients choose service tiers, duration, and custom requirements.', display_order: 1 },
      { id: 'feat-2', title: 'Real-Time Calendar Availability', description: 'Prevents double booking with dynamic buffer intervals and timezone intelligence.', display_order: 2 },
      { id: 'feat-3', title: 'Automated Multi-Channel Reminders', description: 'Instant confirmation via WhatsApp and email notifications.', display_order: 3 },
      { id: 'feat-4', title: 'Admin Master Control', description: 'Customizable working hours, holiday blackouts, and manual approval mode.', display_order: 4 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Service Selection', description: 'Customer selects a consultation package or bespoke service.' },
      { step_number: 2, title: 'Calendar Date Selection', description: 'Customer chooses an available date on the real-time calendar.' },
      { step_number: 3, title: 'Slot Allocation', description: 'Available time slots are dynamically calculated and displayed.' },
      { step_number: 4, title: 'Requirement Intake', description: 'Customer submits contact details and specific project notes.' },
      { step_number: 5, title: 'Automated Confirmation', description: 'System confirms reservation, logs details in CRM, and alerts the ops team.' }
    ],
    tech_stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
    intended_audience: 'Healthcare clinics, legal consultancies, salons, and enterprise B2B service firms',
    publication_status: 'Published'
  },
  {
    title: 'Website Quotation Builder',
    slug: 'website-quotation-builder',
    card_heading: 'Interactive Cost Estimator',
    full_heading: 'Dynamic Pricing Calculator & Instant Proposal Generator',
    short_description: 'Live interactive cost estimation allowing prospective clients to configure website parameters, select feature add-ons, view itemized pricing, and receive instant downloadable PDF estimates.',
    detailed_description: 'Transparent, algorithmic quoting engine transforming ambiguous web development pricing into clear, predictable investments. Supports design tiers, custom page volumes, e-commerce integrations, and maintenance options with instant PDF proposal generation.',
    category: 'Business Systems',
    tagline: 'Instant Algorithmic Pricing',
    display_order: 2,
    is_featured: 1,
    is_visible: 1,
    status: 'Live',
    launch_date: '',
    project_url: '/website-cost-calculator',
    link_label: 'Launch Cost Calculator',
    is_link_enabled: 1,
    open_in_new_tab: 0,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/website-quotation-builder.webp',
    screenshot_alt: 'Website quotation builder interface calculating transparent web development estimates',
    features: [
      { id: 'feat-1', title: 'Algorithmic Scope Calculation', description: 'Calculates development fees, add-on modules, and maintenance tiers in real time.', display_order: 1 },
      { id: 'feat-2', title: 'Branded PDF Generation', description: 'Generates professional itemized PDF estimates for client download in seconds.', display_order: 2 },
      { id: 'feat-3', title: 'Dynamic Currency & Tier Logic', description: 'Configurable design tiers (Standard, Premium, Custom) with clear breakdowns.', display_order: 3 },
      { id: 'feat-4', title: 'Direct CRM Pipeline Sync', description: 'Submitted calculations create structured enquiry records with idempotency.', display_order: 4 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Select Website Archetype', description: 'Choose between corporate, landing page, catalog, or custom application.' },
      { step_number: 2, title: 'Configure Scope & Pages', description: 'Define expected page counts, design tier, and bespoke integrations.' },
      { step_number: 3, title: 'Select Maintenance Level', description: 'Choose ongoing support and performance monitoring packages.' },
      { step_number: 4, title: 'Generate Estimate & PDF', description: 'View instantaneous pricing breakdown and download a formal proposal PDF.' }
    ],
    tech_stack: ['React 19', 'jsPDF', 'Node.js', 'Tailwind CSS', 'Vite'],
    intended_audience: 'Businesses and founders looking for upfront, transparent web development pricing',
    publication_status: 'Published'
  },
  {
    title: 'Festival Theme System',
    slug: 'festival-theme-system',
    card_heading: 'Automated Campaign Styling',
    full_heading: 'Dynamic Cultural & Seasonal Festive Decorator',
    short_description: 'Scheduled festival themes, campaign visuals, and interactive website effects.',
    detailed_description: 'Autonomous seasonal theming platform activating Diwali, Pongal, New Year, and custom promotional atmospheres with celebratory visual flair, decorative accents, and greeting banners without redeploying code.',
    category: 'Creative Marketing',
    tagline: 'Celebrate & Engage Audiences',
    display_order: 3,
    is_featured: 0,
    is_visible: 1,
    status: 'In Development',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'AI-Integrated Advertising',
    screenshot_url: '/showcases/festival-theme-system.webp',
    screenshot_alt: 'Festival theme system showing Diwali and Pongal animated accents on web layout',
    features: [
      { id: 'feat-1', title: 'Calendar Scheduling', description: 'Pre-schedule festival themes to automatically activate and expire at midnight.', display_order: 1 },
      { id: 'feat-2', title: 'Zero Code Deployment', description: 'Switch visual presets directly through the admin dashboard.', display_order: 2 },
      { id: 'feat-3', title: 'Accessible Visual Effects', description: 'CSS-powered ambient particles with respect for prefers-reduced-motion.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Select Festival Preset', description: 'Pick from verified cultural themes (Diwali, Pongal, New Year, Independence Day).' },
      { step_number: 2, title: 'Configure Active Window', description: 'Define start and end timestamps in local Indian Standard Time.' },
      { step_number: 3, title: 'Preview & Deploy', description: 'Preview on staging, approve, and allow the system to switch automatically.' }
    ],
    tech_stack: ['React', 'Canvas API', 'Tailwind CSS', 'TypeScript'],
    intended_audience: 'E-commerce brands, retail stores, and service companies targeting regional Indian festivals',
    publication_status: 'Published'
  },
  {
    title: 'AI-Powered SEO Management',
    slug: 'ai-seo-management',
    card_heading: 'Autonomous Search Intelligence',
    full_heading: 'Agentic SEO Intelligence & Continuous Content Optimization',
    short_description: 'SEO analysis, recommendations, and content preparation for approval.',
    detailed_description: 'Integrated Search Console analytics, striking-distance query identification, keyword cannibalization detection, and automated SEO draft creation with strict human-in-the-loop editorial approval.',
    category: 'Search Optimization',
    tagline: 'Dominant Organic Visibility',
    display_order: 4,
    is_featured: 1,
    is_visible: 1,
    status: 'In Development',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Search Engine Optimization',
    screenshot_url: '/showcases/ai-seo-management.webp',
    screenshot_alt: 'AI SEO management system showing query opportunities and content audit scores',
    features: [
      { id: 'feat-1', title: 'GSC Opportunity Discovery', description: 'Detects high-impression striking distance queries ranked positions 11-20.', display_order: 1 },
      { id: 'feat-2', title: '100-Point SEO Scorer', description: 'Deterministic audit assessing title tags, keyword placement, headings, and internal linking.', display_order: 2 },
      { id: 'feat-3', title: 'Human Approval Gate', description: 'All AI-generated content is saved as Drafts requiring administrator sign-off.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Data Ingestion', description: 'Connects to Google Search Console to ingest real user search queries.' },
      { step_number: 2, title: 'Opportunity Scoring', description: 'Identifies high-potential topics with search volume and conversion intent.' },
      { step_number: 3, title: 'Draft Generation', description: 'Prepares comprehensive draft articles optimized for conventional SEO.' },
      { step_number: 4, title: 'Human Editorial Sign-Off', description: 'Editor reviews, refines, and schedules publication.' }
    ],
    tech_stack: ['Gemini 2.5 Flash', 'Claude MCP', 'Google Search Console API', 'Express'],
    intended_audience: 'Content marketing teams, business owners, and SEO agencies',
    publication_status: 'Published'
  },
  {
    title: 'Interactive 3D Real Estate Showcase',
    slug: 'interactive-3d-real-estate',
    card_heading: 'Virtual Property Explorer',
    full_heading: 'Photorealistic 3D Architectural & Layout Walkthrough',
    short_description: 'Property and plot exploration, enquiries, and site-visit requests.',
    detailed_description: 'Three.js / WebGL-powered spatial walkthroughs enabling buyers to inspect layouts, sun orientations, surrounding infrastructure, floor plans, and schedule private on-site inspections.',
    category: 'Immersive Experiences',
    tagline: 'Spatial Architecture on the Web',
    display_order: 5,
    is_featured: 0,
    is_visible: 1,
    status: 'Coming Soon',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/3d-real-estate-showcase.webp',
    screenshot_alt: 'Interactive 3D architectural real estate layout with camera orbit controls',
    features: [
      { id: 'feat-1', title: '360° Orbit & Floor Plan View', description: 'Fluid camera navigation across exterior elevations and interior layouts.', display_order: 1 },
      { id: 'feat-2', title: 'Unit Availability Highlighting', description: 'Color-coded plot availability reflecting booked and available inventory.', display_order: 2 },
      { id: 'feat-3', title: 'Instant Site Visit Booking', description: 'Direct call-to-action for scheduling accompanied site visits.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Master Plan Exploration', description: 'Visitor orbits master property layout and zooms into individual towers or plots.' },
      { step_number: 2, title: 'Unit Specification', description: 'Inspects square footage, room dimensions, ventilation, and pricing range.' },
      { step_number: 3, title: 'Request Site Visit', description: 'Submits date request for a physical walkthrough with real estate advisors.' }
    ],
    tech_stack: ['Three.js', 'WebGL', 'GLTF/GLB', 'React Three Fiber', 'Tailwind CSS'],
    intended_audience: 'Real estate developers, property promoters, and architectural firms in Coimbatore & Tamil Nadu',
    publication_status: 'Published'
  },
  {
    title: 'Digital Warranty & Service Management',
    slug: 'digital-warranty-service',
    card_heading: 'Paperless Warranty & Claims',
    full_heading: 'Centralized Customer Warranty Registration & Ticket Portal',
    short_description: 'Product registration, warranty information, manuals, and service requests.',
    detailed_description: 'QR-code driven post-purchase customer portal allowing consumers to register appliances or textiles, check remaining warranty coverage, download technical user manuals, and submit repair requests directly.',
    category: 'Customer Operations',
    tagline: 'Seamless Post-Purchase Service',
    display_order: 6,
    is_featured: 0,
    is_visible: 1,
    status: 'Coming Soon',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/digital-warranty-service.webp',
    screenshot_alt: 'Digital warranty management interface with QR scanning and claim ticket tracking',
    features: [
      { id: 'feat-1', title: 'QR Code Registration', description: 'Instant onboarding directly from product packaging.', display_order: 1 },
      { id: 'feat-2', title: 'Live Warranty Countdown', description: 'Shows active warranty period, invoice copy, and renewal options.', display_order: 2 },
      { id: 'feat-3', title: 'Service Ticket System', description: 'Upload fault photos and track repair status transparently.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Scan Product QR', description: 'Customer scans QR on product or enters serial number.' },
      { step_number: 2, title: 'Activate Warranty', description: 'Customer enters invoice date and registers warranty coverage.' },
      { step_number: 3, title: 'Raise Service Request', description: 'If an issue occurs, customer raises a ticket with photo attachments.' },
      { step_number: 4, title: 'Technician Dispatch', description: 'Service center schedules technician visit and updates progress.' }
    ],
    tech_stack: ['React', 'Node.js', 'Supabase Storage', 'PostgreSQL'],
    intended_audience: 'Electronics brands, machine tool manufacturers, and textile equipment makers',
    publication_status: 'Published'
  },
  {
    title: '3D Product Configurator',
    slug: '3d-product-configurator',
    card_heading: 'Real-Time Customization',
    full_heading: 'Interactive 360° Material, Color & Component Configurator',
    short_description: 'Interactive product exploration and customization.',
    detailed_description: 'Low-latency 3D component customization allowing buyers to inspect finishes, adjust dimensions, swap hardware materials, view dynamic price updates, and send finalized specifications directly into the order queue.',
    category: 'Immersive Experiences',
    tagline: 'Customized in 3D',
    display_order: 7,
    is_featured: 0,
    is_visible: 1,
    status: 'Coming Soon',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/3d-product-configurator.webp',
    screenshot_alt: '3D product configurator showcasing material swapping and live price adjustments',
    features: [
      { id: 'feat-1', title: 'Photorealistic PBR Materials', description: 'Physically based rendering with realistic metal, wood, and fabric shaders.', display_order: 1 },
      { id: 'feat-2', title: 'Dynamic Price Recalculation', description: 'Every selected component updates total unit cost instantly.', display_order: 2 },
      { id: 'feat-3', title: 'Mobile Touch Optimized', description: 'Smooth 60fps interaction on standard smartphone browsers.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Select Base Model', description: 'Choose product variant and baseline form factor.' },
      { step_number: 2, title: 'Customize Finishes', description: 'Swap textures, body paint colors, and trim materials.' },
      { step_number: 3, title: 'Review 360° Rendering', description: 'Orbit in 3D and zoom into intricate finish details.' },
      { step_number: 4, title: 'Request Final Quotation', description: 'Submit customized configuration directly to manufacturer.' }
    ],
    tech_stack: ['Three.js', 'WebGL', 'React', 'Tailwind CSS'],
    intended_audience: 'Furniture makers, textile apparel brands, industrial hardware companies',
    publication_status: 'Published'
  },
  {
    title: 'Digital 3D Showroom',
    slug: 'digital-3d-showroom',
    card_heading: 'Virtual Retail Environment',
    full_heading: 'Browser-Based Spatial E-Commerce & Virtual Boutique',
    short_description: 'Virtual product exploration and quotation requests.',
    detailed_description: 'Spatial digital showroom letting retail and B2B customers navigate physical-feel exhibits, inspect curated product displays, view high-res textures, and request bulk enterprise quotations.',
    category: 'Virtual Commerce',
    tagline: 'Next-Gen Spatial Commerce',
    display_order: 8,
    is_featured: 0,
    is_visible: 1,
    status: 'Coming Soon',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/digital-3d-showroom.webp',
    screenshot_alt: 'Digital 3D showroom with virtual boutique walkthrough and product hotspots',
    features: [
      { id: 'feat-1', title: 'Interactive Hotspots', description: 'Clickable product badges opening specs, pricing, and video demos.', display_order: 1 },
      { id: 'feat-2', title: 'Ambient Lighting & Acoustics', description: 'Immersive soundscapes and realistic directional lighting.', display_order: 2 },
      { id: 'feat-3', title: 'Instant Sample Request', description: 'Order physical fabric or material swatches directly from the virtual tour.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Enter Virtual Space', description: 'Customer launches showroom directly in mobile or desktop browser.' },
      { step_number: 2, title: 'Navigate Display Galleries', description: 'Explore seasonal collections and inspect spatial arrangements.' },
      { step_number: 3, title: 'Interact with Products', description: 'Click hotspot indicators to view specifications and bulk pricing tiers.' },
      { step_number: 4, title: 'Initiate Inquiry', description: 'Export selection into a formal quote request.' }
    ],
    tech_stack: ['Three.js', 'React', 'WebGL', 'Tailwind CSS'],
    intended_audience: 'Textile exporters, luxury boutiques, and industrial component manufacturers',
    publication_status: 'Published'
  },
  {
    title: 'Website Visitor Analytics',
    slug: 'website-visitor-analytics',
    card_heading: 'First-Party Journey Telemetry',
    full_heading: 'Privacy-First First-Party Behaviour Analytics & Funnel Diagnostics',
    short_description: 'Visitor journeys, engagement, and enquiry conversion tracking.',
    detailed_description: 'Cookie-less, GDPR-compliant first-party telemetry tracking real visitor scroll depth, engagement velocity, conversion funnel leakages, and enquiry attribution without relying on third-party tracking scripts.',
    category: 'Analytics & Insights',
    tagline: 'Actionable Conversion Insights',
    display_order: 9,
    is_featured: 0,
    is_visible: 1,
    status: 'In Development',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'AI-Integrated Advertising',
    screenshot_url: '/showcases/website-visitor-analytics.webp',
    screenshot_alt: 'Website visitor analytics dashboard showing session recordings, scroll depth, and conversion drops',
    features: [
      { id: 'feat-1', title: 'Privacy-First Architecture', description: 'Zero third-party tracking cookies; hashes IP addresses on ingestion.', display_order: 1 },
      { id: 'feat-2', title: 'Conversion Funnel Leakage', description: 'Pinpoints exact steps where users abandon quotes or contact forms.', display_order: 2 },
      { id: 'feat-3', title: 'Scroll & Attention Heatmaps', description: 'Visualizes where real visitors focus and where they disengage.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Lightweight Script Injection', description: '12KB asynchronous collector tracks events without slowing page loads.' },
      { step_number: 2, title: 'Session Batching', description: 'Batches client interactions and transmits telemetry at page transitions.' },
      { step_number: 3, title: 'Behaviour Aggregation', description: 'Aggregates bounce rates, duration, and conversion rates by traffic source.' },
      { step_number: 4, title: 'Actionable CRO Advice', description: 'Surfaces concrete copy and layout modifications to improve conversion.' }
    ],
    tech_stack: ['TypeScript', 'SQLite', 'Express', 'Tailwind CSS'],
    intended_audience: 'Companies spending on Google Ads, Meta Ads, and organic SEO looking to maximize enquiry conversion',
    publication_status: 'Published'
  },
  {
    title: 'Customer Review Management',
    slug: 'customer-review-management',
    card_heading: 'Reputation & Feedback Automation',
    full_heading: 'Automated Review Gathering, Sentiment Filtering & Verification',
    short_description: 'Feedback collection, review requests, moderation, and satisfaction tracking.',
    detailed_description: 'Streamlined customer satisfaction engine routing delighted clients to Google Business Profile for public 5-star reviews while routing private feedback to internal ops for rapid resolution.',
    category: 'Reputation & Growth',
    tagline: 'Build Authentic Trust',
    display_order: 10,
    is_featured: 0,
    is_visible: 1,
    status: 'Coming Soon',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Google Business Profile Optimization',
    screenshot_url: '/showcases/customer-review-management.webp',
    screenshot_alt: 'Customer review management dashboard with sentiment analysis and Google Business Profile sync',
    features: [
      { id: 'feat-1', title: 'Smart Sentiment Routing', description: 'Happy customers get 1-click Google review links; dissatisfied clients reach management.', display_order: 1 },
      { id: 'feat-2', title: 'Automated SMS/WhatsApp Triggers', description: 'Dispatches polite feedback invitations after service completion.', display_order: 2 },
      { id: 'feat-3', title: 'Verified Testimonial Badges', description: 'Embeds authentic reviews on service landing pages with structured data.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Order / Service Completion', description: 'Triggered when project status is marked complete in CRM.' },
      { step_number: 2, title: 'Feedback Request Sent', description: 'Friendly message sent via WhatsApp or email asking for a 1-to-5 star rating.' },
      { step_number: 3, title: 'Sentiment Filter', description: '4 & 5-star ratings directed to Google Reviews; 1-3 star ratings routed to internal support.' },
      { step_number: 4, title: 'Reputation Dashboard', description: 'Real-time monitoring of average rating, response rate, and new testimonials.' }
    ],
    tech_stack: ['React', 'Node.js', 'Google My Business API', 'Tailwind CSS'],
    intended_audience: 'Local businesses, dentists, textile suppliers, hotels, and professional service practices',
    publication_status: 'Published'
  },
  {
    title: 'CRM for Businesses',
    slug: 'crm-for-businesses',
    card_heading: 'Lead & Pipeline Management',
    full_heading: 'Lightweight Sales Pipeline, Contact Records & Lead Tracking CRM',
    short_description: 'Contacts, enquiries, sales pipelines, tasks, and follow-ups.',
    detailed_description: 'Unified client intelligence repository organizing website form leads, phone inquiries, deal stages, quotation histories, and scheduled automated follow-up reminders in one intuitive interface.',
    category: 'Business Systems',
    tagline: 'Close Deals Faster',
    display_order: 11,
    is_featured: 0,
    is_visible: 1,
    status: 'In Development',
    launch_date: '',
    project_url: '',
    link_label: 'Explore Live Demo',
    is_link_enabled: 0,
    open_in_new_tab: 1,
    inquiry_service: 'Website Design & Development',
    screenshot_url: '/showcases/business-crm.webp',
    screenshot_alt: 'CRM for businesses showing Kanban sales pipeline, client interaction history, and follow-up alerts',
    features: [
      { id: 'feat-1', title: 'Kanban Deal Stages', description: 'Drag-and-drop enquiries from New to In Progress, Quoted, and Closed.', display_order: 1 },
      { id: 'feat-2', title: 'Automated Follow-Up Reminders', description: 'Alerts sales team when a prospect hasn\'t been contacted within 24 hours.', display_order: 2 },
      { id: 'feat-3', title: 'Complete Client Audit History', description: 'Chronological timeline of all website visits, quotes, and emails.', display_order: 3 }
    ],
    workflow_steps: [
      { step_number: 1, title: 'Lead Capture', description: 'Inbound enquiry captured from website form, phone, or quotation tool.' },
      { step_number: 2, title: 'Qualification & Routing', description: 'Categorized by service requirements, budget size, and location.' },
      { step_number: 3, title: 'Proposal & Follow-Up', description: 'Sales rep issues quote and tracks client engagement.' },
      { step_number: 4, title: 'Project Kickoff', description: 'Deal converted into an active client project in the portfolio.' }
    ],
    tech_stack: ['React', 'TypeScript', 'SQLite', 'PostgreSQL', 'Tailwind CSS'],
    intended_audience: 'MSMEs, manufacturing exporters, consulting agencies, and expanding service firms',
    publication_status: 'Published'
  }
];

export function seedInitialShowcases(db: any): void {
  const insertStmt = db.prepare(`
    INSERT INTO showcases (
      title, slug, card_heading, full_heading, short_description, detailed_description,
      category, tagline, display_order, is_featured, is_visible, status, launch_date,
      project_url, link_label, is_link_enabled, open_in_new_tab, inquiry_service,
      screenshot_url, screenshot_source_url, screenshot_captured_at, screenshot_alt,
      features, workflow_steps, capabilities, benefits, tech_stack, intended_audience,
      use_cases, project_challenges, implementation_approach, outcome_results,
      gallery_images, faq_items, publication_status, published_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const now = new Date().toISOString();

  for (const item of SEED_SHOWCASES) {
    try {
      insertStmt.run(
        item.title,
        item.slug,
        item.card_heading,
        item.full_heading,
        item.short_description,
        item.detailed_description,
        item.category,
        item.tagline,
        item.display_order,
        item.is_featured,
        item.is_visible,
        item.status,
        item.launch_date,
        item.project_url,
        item.link_label,
        item.is_link_enabled,
        item.open_in_new_tab,
        item.inquiry_service,
        item.screenshot_url,
        item.project_url || '',
        item.screenshot_url ? now : null,
        item.screenshot_alt,
        JSON.stringify(item.features),
        JSON.stringify(item.workflow_steps),
        JSON.stringify([]),
        JSON.stringify([]),
        JSON.stringify(item.tech_stack),
        item.intended_audience,
        JSON.stringify([]),
        '',
        '',
        '',
        JSON.stringify([]),
        JSON.stringify([]),
        item.publication_status,
        now,
        now,
        now
      );
    } catch (err: any) {
      console.warn(`[Showcases Seed Notice] Skipping "${item.title}":`, err?.message || err);
    }
  }
  console.log(`[Showcases Seed] Seeded ${SEED_SHOWCASES.length} initial products & showcases.`);
}

