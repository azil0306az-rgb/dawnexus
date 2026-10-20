import { useState, useEffect } from 'react';

export interface ServiceCapability {
  icon: string;
  title: string;
  desc: string;
}

export interface ProcessStep {
  step: string;
  title: string;
  desc: string;
}

export interface PricingPackage {
  name: string;
  badge?: string;
  price: string;
  period?: string;
  description: string;
  popular?: boolean;
  inclusions: string[];
  ctaLabel: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CtaSection {
  title: string;
  desc: string;
  buttonText: string;
}

export interface ServicePageContent {
  slug: string;
  title: string; // Protected primary service title (immutable)
  canonical_url: string; // Immutable
  hero_badge: string;
  hero_subtitle: string;
  hero_description: string;
  hero_primary_cta: string;
  hero_secondary_cta: string;
  capabilities: ServiceCapability[];
  process_steps: ProcessStep[];
  packages: PricingPackage[];
  faqs: FaqItem[];
  cta_section: CtaSection;
  meta_title: string;
  meta_description: string;
  og_image: string;
  status?: string;
  version?: number;
}

export function usePageContent(slug: string, defaultContent: ServicePageContent) {
  const [content, setContent] = useState<ServicePageContent>(defaultContent);
  const [isDynamic, setIsDynamic] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDynamicContent() {
      try {
        const res = await fetch(`/api/content/pages/${slug}`);
        if (res.ok) {
          const remote = await res.json();
          if (isMounted && remote && remote.slug === slug) {
            // Strictly preserve the primary service title and canonical URL from default definition
            setContent({
              ...remote,
              title: defaultContent.title,
              canonical_url: defaultContent.canonical_url
            });
            setIsDynamic(true);
          }
        }
      } catch (err) {
        // Fall back gracefully to default content
        console.warn(`[usePageContent Notice]: Using default fallback content for ${slug}`);
      }
    }

    loadDynamicContent();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { content, isDynamic };
}

