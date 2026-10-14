import React, { useState, useEffect } from 'react';
import { Navbar } from './components/public/Navbar';
import { Hero } from './components/public/Hero';
import { Services } from './components/public/Services';
import { WhyUs } from './components/public/WhyUs';
import { Process } from './components/public/Process';
import { Work } from './components/public/Work';
import { ProductShowcases } from './components/public/ProductShowcases';
import { ContactForm } from './components/public/ContactForm';
import { Footer } from './components/public/Footer';
import { PrivacyModal } from './components/public/PrivacyModal';
import { usePageSeo } from './utils/seo';
import { Loader2 } from 'lucide-react';

// Code-split route components to minimize initial homepage JavaScript payload
const AdminLogin = React.lazy(() => import('./components/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const WebsiteDesignPage = React.lazy(() => import('./pages/services/WebsiteDesignPage').then(m => ({ default: m.WebsiteDesignPage })));
const SeoServicesPage = React.lazy(() => import('./pages/services/SeoServicesPage').then(m => ({ default: m.SeoServicesPage })));
const AiVideoCreationPage = React.lazy(() => import('./pages/services/AiVideoCreationPage').then(m => ({ default: m.AiVideoCreationPage })));
const DigitalMarketingPage = React.lazy(() => import('./pages/services/DigitalMarketingPage').then(m => ({ default: m.DigitalMarketingPage })));
const BlogListingPage = React.lazy(() => import('./pages/blog/BlogListingPage').then(m => ({ default: m.BlogListingPage })));
const BlogPostPage = React.lazy(() => import('./pages/blog/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const WebsiteCostCalculatorPage = React.lazy(() => import('./pages/calculator/WebsiteCostCalculatorPage').then(m => ({ default: m.WebsiteCostCalculatorPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex-1 min-h-[50vh] flex items-center justify-center text-white">
    <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4D]" />
  </div>
);

const HomePageContent: React.FC = () => {
  usePageSeo({
    title: 'Dawnexus | Web Development, AI Video & Digital Marketing',
    description: 'Dawnexus helps businesses grow with professional website development, AI-powered video creation, digital advertising, SEO, and Google Business Profile optimization.',
    canonicalUrl: 'https://dawnexus.in/',
    ogImage: 'https://dawnexus.in/brand/dawnexus-logo-original.png',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      'name': 'Dawnexus',
      'url': 'https://dawnexus.in/',
      'logo': 'https://dawnexus.in/brand/dawnexus-logo-original.png',
      'image': 'https://dawnexus.in/brand/dawnexus-logo-original.png',
      'description': 'Professional website development, AI video creation, digital advertising, SEO, and Google Business Profile optimization.'
    }
  });

  return (
    <main className="flex-1">
      <Hero />
      <Services />
      <WhyUs />
      <Process />
      <Work />
      <ProductShowcases />
      <ContactForm />
    </main>
  );
};

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check URL changes (e.g. browser back/forward buttons, pushState)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isAdminRoute = currentPath.startsWith('/admin');

  // Check Admin session status if on /admin route
  useEffect(() => {
    if (isAdminRoute) {
      const checkSession = async () => {
        try {
          const res = await fetch('/api/admin/session');
          if (res.ok) {
            const data = await res.json();
            setIsAuthenticated(!!data.authenticated);
          } else {
            setIsAuthenticated(false);
          }
        } catch {
          setIsAuthenticated(false);
        }
      };
      checkSession();
    }
  }, [isAdminRoute]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // 1. Admin Route
  if (isAdminRoute) {
    if (isAuthenticated === null) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4D] mx-auto" />
            <p className="text-xs font-mono text-[#A5A5A5]">Verifying administrative session...</p>
          </div>
        </div>
      );
    }

    if (isAuthenticated) {
      return (
        <React.Suspense fallback={<RouteLoadingFallback />}>
          <AdminDashboard onLogout={handleLogout} />
        </React.Suspense>
      );
    }

    return (
      <React.Suspense fallback={<RouteLoadingFallback />}>
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      </React.Suspense>
    );
  }

  // 2. Blog, Service Pages & Public Marketing Website
  const renderContent = () => {
    if (currentPath === '/blog') {
      return (
        <React.Suspense fallback={<RouteLoadingFallback />}>
          <BlogListingPage />
        </React.Suspense>
      );
    }
    if (currentPath.startsWith('/blog/')) {
      const slug = currentPath.replace('/blog/', '').split('?')[0];
      return (
        <React.Suspense fallback={<RouteLoadingFallback />}>
          <BlogPostPage slug={slug} />
        </React.Suspense>
      );
    }

    switch (currentPath) {
      case '/website-cost-calculator':
        return (
          <React.Suspense fallback={<RouteLoadingFallback />}>
            <WebsiteCostCalculatorPage />
          </React.Suspense>
        );
      case '/services/website-design':
        return (
          <React.Suspense fallback={<RouteLoadingFallback />}>
            <WebsiteDesignPage />
          </React.Suspense>
        );
      case '/services/seo-services':
        return (
          <React.Suspense fallback={<RouteLoadingFallback />}>
            <SeoServicesPage />
          </React.Suspense>
        );
      case '/services/ai-video-creation':
        return (
          <React.Suspense fallback={<RouteLoadingFallback />}>
            <AiVideoCreationPage />
          </React.Suspense>
        );
      case '/services/digital-marketing':
        return (
          <React.Suspense fallback={<RouteLoadingFallback />}>
            <DigitalMarketingPage />
          </React.Suspense>
        );
      default:
        return <HomePageContent />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFFFFF] flex flex-col">
      <Navbar />
      {renderContent()}
      <Footer />
      <PrivacyModal />
    </div>
  );
};

export default App;
