/**
 * DAWNEXUS WEBSITE COST ESTIMATOR - VERSION 5.8
 * Pure Pricing Calculation Engine & Config Schema
 */

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
  compatibleWith?: string[]; // If empty, compatible with all
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
  maxStandardPages: number; // Page counts exceeding this trigger custom quote
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

/**
 * DEFAULT DAWNEXUS PRICING CONFIGURATION (INR)
 */
export const DEFAULT_PRICING_CONFIG: CalculatorPricingConfig = {
  version: 1,
  currency: 'INR',
  currencySymbol: '₹',
  maxStandardPages: 30,
  websiteTypes: [
    {
      id: 'landing-page',
      name: 'Landing Page',
      description: 'High-converting single-page experience optimized for ad campaigns, product launches, and focused lead generation.',
      basePrice: 9999,
      includedPages: 1,
      additionalPagePrice: 1500,
      iconName: 'Sparkles',
      popular: false
    },
    {
      id: 'business-website',
      name: 'Business Website',
      description: 'Comprehensive multi-page corporate website establishing brand authority, detailing services, and capturing qualified client inquiries.',
      basePrice: 19999,
      includedPages: 5,
      additionalPagePrice: 1500,
      iconName: 'Globe',
      popular: true,
      badge: 'Most Popular'
    },
    {
      id: 'portfolio-website',
      name: 'Portfolio Website',
      description: 'Elegant visual showcase for creative agencies, architects, consultants, and photographers with interactive galleries and case studies.',
      basePrice: 15999,
      includedPages: 4,
      additionalPagePrice: 1500,
      iconName: 'Layers',
      popular: false
    },
    {
      id: 'ecommerce-website',
      name: 'E-commerce Website',
      description: 'Scalable online store with product catalog, cart, checkout, payment gateway, inventory management, and automated receipts.',
      basePrice: 34999,
      includedPages: 8,
      additionalPagePrice: 1800,
      iconName: 'ShoppingBag',
      popular: false
    },
    {
      id: 'booking-website',
      name: 'Booking Website',
      description: 'Service scheduling platform with live appointment booking, automated reminders, and calendar coordination.',
      basePrice: 29999,
      includedPages: 6,
      additionalPagePrice: 1800,
      iconName: 'CalendarCheck',
      popular: false
    },
    {
      id: 'custom-web-app',
      name: 'Custom Web Application',
      description: 'Bespoke web application, client portal, or SaaS MVP with custom database architecture, authenticated workflows, and API integrations.',
      basePrice: 49999,
      includedPages: 10,
      additionalPagePrice: 2500,
      iconName: 'CodeXml',
      popular: false,
      badge: 'High Performance'
    }
  ],
  features: [
    {
      id: 'seo-setup',
      name: 'Advanced SEO Architecture',
      description: 'Complete on-page technical SEO, schema markup, Open Graph tags, canonical URLs, and dynamic sitemap integration.',
      price: 4999,
      category: 'marketing'
    },
    {
      id: 'admin-panel',
      name: 'Administrative Content Panel',
      description: 'Secure admin portal to review customer leads, manage submissions, and update operational content without touching source code.',
      price: 9999,
      category: 'core'
    },
    {
      id: 'blog-cms',
      name: 'Blog & Content CMS',
      description: 'Full blogging engine with rich media support, keyword tagging, publication scheduler, and search engine structured data.',
      price: 6999,
      category: 'core'
    },
    {
      id: 'booking-system',
      name: 'Interactive Booking Engine',
      description: 'Integrated appointment scheduler, availability manager, and automatic email/WhatsApp confirmation triggers.',
      price: 8999,
      category: 'booking'
    },
    {
      id: 'payment-gateway',
      name: 'Secure Payment Gateway',
      description: 'Seamless integration with Razorpay / Stripe for credit cards, UPI, net banking, and automatic tax-compliant receipts.',
      price: 5999,
      category: 'ecommerce'
    },
    {
      id: 'customer-accounts',
      name: 'Customer Login & Member Accounts',
      description: 'Secure user registration, password reset flows, protected account dashboards, and session security.',
      price: 7999,
      category: 'core'
    },
    {
      id: 'analytics-integration',
      name: 'Performance & Analytics Suite',
      description: 'Google Analytics 4, Google Search Console, and privacy-compliant conversion tracking instrumentation.',
      price: 3499,
      category: 'marketing'
    }
  ],
  designTiers: [
    {
      id: 'Standard',
      name: 'Standard Design',
      description: 'Clean, modern, high-performance responsive layout crafted with Dawnexus UI components and fast loading times.',
      priceAdjustment: 0
    },
    {
      id: 'Premium',
      name: 'Premium Interactive Design',
      description: 'Elevated aesthetics with refined micro-interactions, custom typography rhythm, tailored animations, and bespoke styling.',
      priceAdjustment: 7500,
      badge: 'Recommended'
    },
    {
      id: 'Custom',
      name: 'Custom Figma Art Direction',
      description: 'Exclusive 100% custom UI/UX designed in Figma from wireframe to polished prototype before coding.',
      priceAdjustment: 15000
    }
  ],
  maintenanceOptions: [
    {
      id: 'None',
      name: 'No Ongoing Maintenance',
      description: 'Standard 30-day post-launch deployment warranty and bug-fix support included at zero charge.',
      amount: 0,
      period: 'none',
      features: ['30-day post-launch warranty', 'Code handover and deployment guide']
    },
    {
      id: 'Monthly',
      name: 'Monthly Care & Uptime Plan',
      description: 'Continuous server monitoring, automated database backups, core framework security patches, and 2 hours of monthly updates.',
      amount: 2499,
      period: 'month',
      features: ['24/7 Uptime monitoring', 'Weekly cloud database backups', 'Security patches', '2 hours priority content edits/month']
    },
    {
      id: 'Annual',
      name: 'Annual Agency Retainer (Save 17%)',
      description: 'Full year of proactive technical maintenance, continuous health audits, quarterly SEO reviews, and priority developer access.',
      amount: 24999,
      period: 'year',
      features: ['All Monthly Plan benefits', 'Quarterly SEO & speed audits', 'Dedicated priority support queue', 'Save ₹4,989 per year']
    }
  ],
  assumptions: [
    'Final website timeline commences once initial branding assets and core content are approved.',
    'Estimates include mobile, tablet, and desktop responsive layouts and SSL certificate configuration.',
    'Domain registration and third-party hosting charges (e.g. cloud servers or domain registrar fees) are billed directly by respective providers.',
    'Payment gateway accounts (Razorpay/Stripe) are registered under the client’s legal entity with standard verification.'
  ],
  exclusions: [
    'Third-party paid subscription licenses (e.g. premium SaaS APIs or paid font licenses).',
    'Professional stock photography licensing or bespoke video shoot production.',
    'Ongoing paid ad spend budgets for Google or Meta ad platforms.'
  ],
  disclaimer: 'This cost estimate is an indicative projection based on your selected parameters. A final binding proposal is confirmed after initial technical alignment with the Dawnexus engineering team.',
  updatedAt: new Date().toISOString()
};

/**
 * Generate human-readable Reference ID: DNX-EST-YYYYMMDD-XXXX
 */
export function generateEstimateReferenceId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DNX-EST-${dateStr}-${randomChars}`;
}

/**
 * Server-authoritative calculation engine
 */
export function calculateWebsiteCost(
  config: CalculatorPricingConfig,
  selections: CalculatorSelections
): CalculationResult {
  const referenceId = generateEstimateReferenceId();
  const customQuoteReasons: string[] = [];

  // 1. Resolve Website Type
  const typeConfig = config.websiteTypes.find(t => t.id === selections.websiteType) || config.websiteTypes[0];
  const items: CalculationBreakdownItem[] = [];

  // Base package
  items.push({
    id: `base-${typeConfig.id}`,
    label: `${typeConfig.name} Package`,
    description: `Includes base architecture and first ${typeConfig.includedPages} page${typeConfig.includedPages > 1 ? 's' : ''}`,
    amount: typeConfig.basePrice,
    isIncluded: true,
    type: 'base'
  });

  // 2. Resolve Pages
  const rawPageCount = Math.max(1, Math.floor(Number(selections.pageCount) || 1));
  const additionalPages = Math.max(0, rawPageCount - typeConfig.includedPages);
  const additionalPagesTotal = additionalPages * typeConfig.additionalPagePrice;

  if (additionalPages > 0) {
    items.push({
      id: 'additional-pages',
      label: `Additional Pages (${additionalPages} × ${config.currencySymbol}${typeConfig.additionalPagePrice.toLocaleString('en-IN')})`,
      description: `${rawPageCount} total pages requested (${typeConfig.includedPages} included in base package)`,
      amount: additionalPagesTotal,
      type: 'pages'
    });
  }

  // Check if page count exceeds standard threshold
  if (rawPageCount > config.maxStandardPages) {
    customQuoteReasons.push(`High page volume (${rawPageCount} pages exceeds standard ${config.maxStandardPages} page calculator ceiling)`);
  }

  // 3. Resolve Selected Features
  const selectedFeaturesSet = new Set(selections.selectedFeatures || []);
  for (const feat of config.features) {
    if (selectedFeaturesSet.has(feat.id)) {
      items.push({
        id: feat.id,
        label: feat.name,
        description: feat.description,
        amount: feat.price,
        type: 'feature'
      });
    }
  }

  // 4. Resolve Conditional Add-ons
  // E-commerce conditional questions
  if (typeConfig.id === 'ecommerce-website' && selections.ecommerceDetails) {
    if (selections.ecommerceDetails.productCatalogSize === '21-100') {
      items.push({
        id: 'ecommerce-catalog-medium',
        label: 'Medium Product Catalog (21–100 products setup)',
        description: 'Bulk CSV import, category taxonomies, and variant management configuration',
        amount: 5000,
        type: 'addon'
      });
    } else if (selections.ecommerceDetails.productCatalogSize === '100+') {
      items.push({
        id: 'ecommerce-catalog-large',
        label: 'Large Product Catalog (100+ items / ERP sync ready)',
        description: 'Advanced relational inventory structure, faceted search filters, and bulk asset pipelines',
        amount: 12000,
        type: 'addon'
      });
    }

    if (selections.ecommerceDetails.multiZoneShipping) {
      items.push({
        id: 'ecommerce-multizone-shipping',
        label: 'Dynamic Multi-Zone Shipping Calculator',
        description: 'Courier API integration (Shiprocket/Delhivery) with pincode serviceability checks',
        amount: 3500,
        type: 'addon'
      });
    }
  }

  // Booking website conditional questions
  if (typeConfig.id === 'booking-website' && selections.bookingDetails) {
    if (selections.bookingDetails.multiStaffOrLocation) {
      items.push({
        id: 'booking-multi-staff',
        label: 'Multi-Staff & Multi-Location Scheduling Matrix',
        description: 'Individual staff availability rosters, break schedules, and departmental routing',
        amount: 6000,
        type: 'addon'
      });
    }

    if (selections.bookingDetails.twoWayCalendarSync) {
      items.push({
        id: 'booking-calendar-sync',
        label: 'Two-Way Google & Outlook Calendar Sync',
        description: 'Real-time synchronization preventing double-bookings across personal schedules',
        amount: 2500,
        type: 'addon'
      });
    }
  }

  // Custom web app conditional questions
  if (typeConfig.id === 'custom-web-app' && selections.customAppDetails) {
    if (selections.customAppDetails.complexityTier === 'Advanced') {
      items.push({
        id: 'app-complexity-advanced',
        label: 'Advanced Relational Data Architecture & RBAC',
        description: 'Granular role-based access control, audit logs, and complex relational entities',
        amount: 15000,
        type: 'addon'
      });
    } else if (selections.customAppDetails.complexityTier === 'Enterprise') {
      customQuoteReasons.push('Enterprise-tier architecture requires tailored scoping and security compliance review');
    }

    if (selections.customAppDetails.externalApiSync) {
      items.push({
        id: 'app-external-api-sync',
        label: 'Custom Webhooks & Third-Party ERP/CRM Sync',
        description: 'Bidirectional background synchronization pipelines with automated retry handling',
        amount: 10000,
        type: 'addon'
      });
    }
  }

  // 5. Resolve Design Tier
  const designTierConfig = config.designTiers.find(d => d.id === selections.designTier) || config.designTiers[0];
  if (designTierConfig.priceAdjustment > 0) {
    items.push({
      id: `design-${designTierConfig.id.toLowerCase()}`,
      label: designTierConfig.name,
      description: designTierConfig.description,
      amount: designTierConfig.priceAdjustment,
      type: 'design'
    });
  }

  // Calculate One-Time Total
  const subtotalOneTime = items.reduce((sum, item) => sum + item.amount, 0);

  // 6. Resolve Maintenance Package
  const maintenanceSelected = config.maintenanceOptions.find(m => m.id === selections.maintenanceOption) || config.maintenanceOptions[0];

  // 7. Estimate Delivery Timeline
  let minWeeks = 1;
  let maxWeeks = 2;

  if (typeConfig.id === 'landing-page') {
    minWeeks = 1;
    maxWeeks = 2;
  } else if (typeConfig.id === 'business-website' || typeConfig.id === 'portfolio-website') {
    minWeeks = 2;
    maxWeeks = 4;
  } else if (typeConfig.id === 'booking-website') {
    minWeeks = 3;
    maxWeeks = 5;
  } else if (typeConfig.id === 'ecommerce-website') {
    minWeeks = 4;
    maxWeeks = 6;
  } else if (typeConfig.id === 'custom-web-app') {
    minWeeks = 5;
    maxWeeks = 8;
  }

  if (additionalPages > 10) {
    minWeeks += 1;
    maxWeeks += 2;
  }

  if (selections.timelinePreference === 'Urgent') {
    minWeeks = Math.max(1, minWeeks - 1);
    maxWeeks = Math.max(2, maxWeeks - 1);
  }

  return {
    referenceId,
    websiteType: {
      id: typeConfig.id,
      name: typeConfig.name,
      description: typeConfig.description
    },
    pageCount: rawPageCount,
    includedPages: typeConfig.includedPages,
    additionalPages,
    additionalPagePrice: typeConfig.additionalPagePrice,
    additionalPagesTotal,
    designTier: {
      id: designTierConfig.id,
      name: designTierConfig.name,
      priceAdjustment: designTierConfig.priceAdjustment
    },
    items,
    subtotalOneTime,
    recurringMaintenance: {
      type: maintenanceSelected.id,
      name: maintenanceSelected.name,
      amount: maintenanceSelected.amount,
      period: maintenanceSelected.period
    },
    isCustomQuoteRequired: customQuoteReasons.length > 0,
    customQuoteReasons,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
    estimatedDeliveryWeeks: {
      min: minWeeks,
      max: maxWeeks
    },
    assumptions: config.assumptions,
    exclusions: config.exclusions,
    disclaimer: config.disclaimer,
    configVersion: config.version,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Validate selections payload on server
 */
export function validateCalculatorSelections(data: any): { valid: boolean; error?: string; selections?: CalculatorSelections } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid selections payload' };
  }

  const websiteType = typeof data.websiteType === 'string' ? data.websiteType.trim() : 'business-website';
  const pageCount = parseInt(data.pageCount, 10);
  if (isNaN(pageCount) || pageCount < 1) {
    return { valid: false, error: 'Number of pages must be a positive integer of at least 1.' };
  }

  const selectedFeatures = Array.isArray(data.selectedFeatures)
    ? data.selectedFeatures.filter((f: any) => typeof f === 'string')
    : [];

  const allowedDesignTiers = ['Standard', 'Premium', 'Custom'];
  const designTier = allowedDesignTiers.includes(data.designTier) ? data.designTier : 'Standard';

  const allowedMaintenance = ['None', 'Monthly', 'Annual'];
  const maintenanceOption = allowedMaintenance.includes(data.maintenanceOption) ? data.maintenanceOption : 'None';

  return {
    valid: true,
    selections: {
      websiteType,
      pageCount,
      selectedFeatures,
      ecommerceDetails: data.ecommerceDetails,
      bookingDetails: data.bookingDetails,
      customAppDetails: data.customAppDetails,
      designTier,
      maintenanceOption,
      timelinePreference: data.timelinePreference,
      contentReadiness: data.contentReadiness,
      projectNotes: typeof data.projectNotes === 'string' ? data.projectNotes.slice(0, 1000) : ''
    }
  };
}

