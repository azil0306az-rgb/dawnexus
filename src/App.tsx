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
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.pathname.startsWith('/admin')
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check URL changes (e.g. browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // If visiting /admin
  if (isAdminRoute) {
    if (isAuthenticated === null) {
      // Loading session check
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

  // Public Marketing Website
  return (
    <div className="min-h-screen bg-[#050505] text-[#FFFFFF] flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Services />
        <WhyUs />
        <Process />
        <Work />
        <ContactForm />
      </main>
      <Footer />
      <PrivacyModal />
    </div>
  );
};

export default App;

