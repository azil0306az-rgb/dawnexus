import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export const PrivacyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-privacy-modal', handleOpen);
    return () => window.removeEventListener('open-privacy-modal', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto relative shadow-2xl">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-lg text-[#A5A5A5] hover:text-white hover:bg-[#161616] border border-[#252525] transition-colors"
          aria-label="Close Privacy Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-[#050505] border border-[#252525] text-[#C7FF4D]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Dawnexus Privacy Policy</h3>
            <p className="text-xs text-[#A5A5A5] font-mono">Last updated: October 2026</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-[#A5A5A5] leading-relaxed">
          <section>
            <h4 className="text-white font-semibold text-sm mb-1">1. Information We Collect</h4>
            <p>
              When you submit a project enquiry through our website, we collect your full name, email address, optional business name, optional phone number, requested services, estimated budget, and project details.
            </p>
          </section>

          <section>
            <h4 className="text-white font-semibold text-sm mb-1">2. Purpose of Processing</h4>
            <p>
              We process your submitted data exclusively for the purpose of assessing your requirements, responding to your consultation request, drafting commercial proposals, and communicating with you regarding your digital project.
            </p>
          </section>

          <section>
            <h4 className="text-white font-semibold text-sm mb-1">3. Confidentiality & Non-Disclosure</h4>
            <p>
              Your contact information and project concepts are strictly confidential. We never sell, rent, or lease your personal information to third parties, advertising brokers, or data brokers.
            </p>
          </section>

          <section>
            <h4 className="text-white font-semibold text-sm mb-1">4. Data Storage & Security</h4>
            <p>
              Enquiry submissions are stored in an encrypted and access-restricted database infrastructure. Access to submitted enquiries is restricted to authenticated Dawnexus administrative personnel via secure session tokens.
            </p>
          </section>

          <section>
            <h4 className="text-white font-semibold text-sm mb-1">5. Contact & Erasure Requests</h4>
            <p>
              You may request review, modification, or permanent erasure of your submitted information at any time by contacting our privacy team directly.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-4 border-t border-[#252525] flex justify-end">
          <button
            onClick={() => setIsOpen(false)}
            className="px-6 py-2.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

