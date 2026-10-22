/**
 * Dawnexus Client-Side Google Analytics 4 (GA4) & Conversion Tracking
 * Provides SPA route tracking, user deduplication protection, and verified conversion events.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __dawnexus_last_pageview?: {
      url: string;
      title: string;
      timestamp: number;
    };
  }
}

export const GA_MEASUREMENT_ID = 'G-MJN67XNHE4';

/**
 * Dispatch page_view event with updated page title and path on SPA route transitions.
 * Debounces immediate duplicates on the same URL within 500ms.
 */
export function trackPageView(pageTitle: string, pathname?: string, fullUrl?: string): void {
  if (typeof window === 'undefined') return;

  const currentPath = pathname || window.location.pathname;
  const currentUrl = fullUrl || window.location.href;
  const isAdmin = currentPath.startsWith('/admin');

  const now = Date.now();
  const lastPv = window.__dawnexus_last_pageview;

  // Deduplicate exact same URL and title within 800ms to avoid re-render double counts
  if (lastPv && lastPv.url === currentUrl && lastPv.title === pageTitle && (now - lastPv.timestamp) < 800) {
    return;
  }

  window.__dawnexus_last_pageview = {
    url: currentUrl,
    title: pageTitle,
    timestamp: now
  };

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_location: currentUrl,
      page_path: currentPath,
      traffic_type: isAdmin ? 'internal' : 'production'
    });
  }
}

/**
 * Dispatch generic custom event to GA4
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

/**
 * Dispatch verified lead generation conversion event
 * Standard GA4 recommended event: generate_lead
 */
export function trackGenerateLead(params: {
  enquiryId?: number | string;
  service?: string;
  budget?: string;
  source?: string;
  value?: number;
}): void {
  trackEvent('generate_lead', {
    currency: 'INR',
    value: params.value || 0,
    lead_id: params.enquiryId ? String(params.enquiryId) : undefined,
    service_requested: params.service || 'General Enquiry',
    budget_range: params.budget || 'Not Specified',
    conversion_source: params.source || 'contact_form'
  });
}

/**
 * Form interaction tracking
 */
export function trackFormStart(formName: string): void {
  trackEvent('form_start', {
    form_name: formName
  });
}

export function trackFormSubmit(formName: string, success: boolean = true): void {
  trackEvent('form_submit', {
    form_name: formName,
    success
  });
}

/**
 * Phone and WhatsApp click tracking
 */
export function trackClickToCall(phoneNumber: string, label: string = 'header'): void {
  trackEvent('click_to_call', {
    phone_number: phoneNumber,
    link_url: `tel:${phoneNumber}`,
    location_label: label
  });
}

export function trackWhatsAppClick(source: string = 'website'): void {
  trackEvent('whatsapp_click', {
    conversion_source: source
  });
}

/**
 * Calculator estimate / quote request conversion
 */
export function trackQuoteRequest(params: {
  referenceId: string;
  websiteType: string;
  estimatedAmount?: number;
  isCustomQuote?: boolean;
}): void {
  trackEvent('quote_request', {
    reference_id: params.referenceId,
    website_type: params.websiteType,
    value: params.estimatedAmount || 0,
    currency: 'INR',
    custom_quote_required: Boolean(params.isCustomQuote)
  });
}
