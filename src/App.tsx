import React, { useState, useEffect } from 'react';
import { Navbar } from './components/public/Navbar';
import { Hero } from './components/public/Hero';
import { Services } from './components/public/Services';
import { WhyUs } from './components/public/WhyUs';
import { Process } from './components/public/Process';
import { Work } from './components/public/Work';
import { ContactForm } from './components/public/ContactForm';
import { Footer } from './components/public/Footer';
import { PrivacyModal } from './components/public/PrivacyModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { WebsiteDesignPage } from './pages/services/WebsiteDesignPage';
import { SeoServicesPage } from './pages/services/SeoServicesPage';
import { AiVideoCreationPage } from './pages/services/AiVideoCreationPage';
import { DigitalMarketingPage } from './pages/services/DigitalMarketingPage';
import { BlogListingPage } from './pages/blog/BlogListingPage';
import { BlogPostPage } from './pages/blog/BlogPostPage';
import { usePageSeo } from './utils/seo';
import { Loader2 } from 'lucide-react';

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
      return <AdminDashboard onLogout={handleLogout} />;
    }

    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Blog, Service Pages & Public Marketing Website
  const renderContent = () => {
    if (currentPath === '/blog') {
      return <BlogListingPage />;
    }
    if (currentPath.startsWith('/blog/')) {
      const slug = currentPath.replace('/blog/', '').split('?')[0];
      return <BlogPostPage slug={slug} />;
    }

    switch (currentPath) {
      case '/services/website-design':
        return <WebsiteDesignPage />;
      case '/services/seo-services':
        return <SeoServicesPage />;
      case '/services/ai-video-creation':
        return <AiVideoCreationPage />;
      case '/services/digital-marketing':
        return <DigitalMarketingPage />;
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
