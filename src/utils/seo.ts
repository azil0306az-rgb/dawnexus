import { useEffect } from 'react';

export interface PageSeoConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  schema?: object;
}

export function usePageSeo(config: PageSeoConfig) {
  useEffect(() => {
    // 1. Title
    document.title = config.title;

    // 2. Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', config.description);

    // 3. Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', config.canonicalUrl);

    // 4. Open Graph tags
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('og:title', config.title);
    setMeta('og:description', config.description);
    setMeta('og:url', config.canonicalUrl);
    if (config.ogImage) {
      setMeta('og:image', config.ogImage);
    }

    // 5. JSON-LD structured data
    let scriptEl = document.getElementById('page-json-ld') as HTMLScriptElement | null;
    if (config.schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'page-json-ld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(config.schema);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup script on unmount
      const s = document.getElementById('page-json-ld');
      if (s) s.remove();
    };
  }, [config.title, config.description, config.canonicalUrl, config.ogImage, config.schema]);
}
