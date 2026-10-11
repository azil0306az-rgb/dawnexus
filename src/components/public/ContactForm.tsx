import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { EnquiryFormData } from '../../types';

const availableServices = [
  'Website Design & Development',
  'AI Video Creation',
  'AI-Integrated Advertising',
  'Search Engine Optimization',
  'Google Business Profile Optimization'
];

const budgetRanges = [
  'Under $2,500',
  '$2,500 – $5,000',
  '$5,000 – $10,000',
  '$10,000 – $25,000',
  '$25,000+'
];

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<EnquiryFormData>({
    full_name: '',
    business_name: '',
    email: '',
    phone: '',
    requested_services: [],
    budget: '',
    project_details: '',
    website_hp: '' // Honeypot
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Restore draft from sessionStorage if available
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem('dawnexus_contact_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save draft to sessionStorage as user types
  useEffect(() => {
    if (!submitSuccess) {
      try {
        sessionStorage.setItem('dawnexus_contact_draft', JSON.stringify(formData));
      } catch {
        // Ignore
      }
    }
  }, [formData, submitSuccess]);

  // Listen to select-service event from Services component
  useEffect(() => {
    const handleServiceSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const selected = customEvent.detail;
      if (selected && availableServices.includes(selected)) {
        setFormData(prev => {
          if (!prev.requested_services.includes(selected)) {
            return {
              ...prev,
              requested_services: [...prev.requested_services, selected]
            };
          }
          return prev;
        });
      }
    };

    window.addEventListener('select-service', handleServiceSelect);
    return () => window.removeEventListener('select-service', handleServiceSelect);
  }, []);

  const toggleService = (service: string) => {
    setFormData(prev => {
      const exists = prev.requested_services.includes(service);
      return {
        ...prev,
        requested_services: exists
          ? prev.requested_services.filter(s => s !== service)
          : [...prev.requested_services, service]
      };
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required.';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Please enter a valid full name (at least 2 characters).';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!formData.project_details.trim()) {
      newErrors.project_details = 'Project details are required.';
    } else if (formData.project_details.trim().length < 10) {
      newErrors.project_details = 'Please describe your project goals in at least 10 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details);
        }
        throw new Error(data.error || 'Failed to submit enquiry. Please check your information.');
      }

      // Success
      setSubmitSuccess(true);
      sessionStorage.removeItem('dawnexus_contact_draft');
      // Reset form
      setFormData({
        full_name: '',
        business_name: '',
        email: '',
        phone: '',
        requested_services: [],
        budget: '',
        project_details: '',
        website_hp: ''
      });
    } catch (err: unknown) {
      const error = err as Error;
      setServerError(error.message || 'Network error occurred. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-[#050505] border-t border-[#252525] relative">
      {/* Decorative gradient */}
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#C7FF4D]/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Information */}
          <div className="lg:col-span-5 space-y-6">
            <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase">
              // START YOUR PROJECT
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
              Let's make your next move count.
            </h2>

            <p className="text-[#A5A5A5] text-lg leading-relaxed">
              Tell us about your business and what you want to achieve. We'll help you identify the right digital solutions for your next stage of growth.
            </p>

            {/* Direct Details Box */}
            <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider">
                What to expect:
              </h4>
              <ul className="space-y-3 text-sm text-[#A5A5A5]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4D] mt-0.5 shrink-0" />
                  <span>Prompt review of your existing digital footprint and objectives</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4D] mt-0.5 shrink-0" />
                  <span>A tailored strategy recommendations outline with transparent scope</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4D] mt-0.5 shrink-0" />
                  <span>Direct consultation with no generic marketing jargon or false promises</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 text-xs text-[#A5A5A5] leading-normal">
              By submitting this form, you acknowledge that your information will be processed securely in accordance with our{' '}
              <a href="#privacy" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-privacy-modal')); }} className="text-[#C7FF4D] underline hover:text-white">
                Privacy Policy
              </a>.
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-8 sm:p-10 shadow-2xl">
              
              {submitSuccess ? (
                <div className="py-12 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-[#C7FF4D]/10 border border-[#C7FF4D] mx-auto flex items-center justify-center text-[#C7FF4D]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">
                      Enquiry Received
                    </h3>
                    <p className="text-base text-[#C7FF4D] font-medium max-w-md mx-auto">
                      Thank you for contacting Dawnexus. Your enquiry has been received successfully.
                    </p>
                    <p className="text-sm text-[#A5A5A5] max-w-md mx-auto mt-2">
                      Our team is reviewing your project details and will be in touch shortly.
                    </p>
                  </div>

                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#050505] text-[#FFFFFF] border border-[#252525] hover:border-[#C7FF4D] text-sm font-semibold transition-colors"
                  >
                    <span>Submit Another Enquiry</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  
                  {serverError && (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                      <span>{serverError}</span>
                    </div>
                  )}

                  {/* Honeypot field for bot suppression */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website_hp">Leave this field blank</label>
                    <input
                      type="text"
                      id="website_hp"
                      name="website_hp"
                      value={formData.website_hp}
                      onChange={e => setFormData({ ...formData, website_hp: e.target.value })}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {/* Name and Business */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                        Full Name <span className="text-[#C7FF4D]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Wright"
                        value={formData.full_name}
                        onChange={e => {
                          setFormData({ ...formData, full_name: e.target.value });
                          if (errors.full_name) setErrors({ ...errors, full_name: '' });
                        }}
                        className={`w-full bg-[#050505] border rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#555] focus:outline-none transition-colors ${
                          errors.full_name ? 'border-red-500 focus:border-red-400' : 'border-[#252525] focus:border-[#C7FF4D]'
                        }`}
                        required
                      />
                      {errors.full_name && (
                        <p className="mt-1.5 text-xs text-red-400">{errors.full_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                        Business Name <span className="text-xs text-[#555]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Wright Innovations"
                        value={formData.business_name}
                        onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                        className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email and Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                        Email Address <span className="text-[#C7FF4D]">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="alex@example.com"
                        value={formData.email}
                        onChange={e => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email) setErrors({ ...errors, email: '' });
                        }}
                        className={`w-full bg-[#050505] border rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#555] focus:outline-none transition-colors ${
                          errors.email ? 'border-red-500 focus:border-red-400' : 'border-[#252525] focus:border-[#C7FF4D]'
                        }`}
                        required
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                        Phone Number <span className="text-xs text-[#555]">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Services Multi-Select */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2.5">
                      Services Required <span className="text-xs text-[#555]">(Select all that apply)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableServices.map((service) => {
                        const isSelected = formData.requested_services.includes(service);
                        return (
                          <button
                            type="button"
                            key={service}
                            onClick={() => toggleService(service)}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-[#C7FF4D]/15 border-[#C7FF4D] text-[#C7FF4D]'
                                : 'bg-[#050505] border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#444]'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                              isSelected ? 'bg-[#C7FF4D] text-[#050505] border-[#C7FF4D]' : 'border-[#444]'
                            }`}>
                              {isSelected && '✓'}
                            </div>
                            <span className="truncate">{service}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Budget Dropdown / Pills */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                      Target Budget <span className="text-xs text-[#555]">(Optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {budgetRanges.map((range) => {
                        const isSelected = formData.budget === range;
                        return (
                          <button
                            type="button"
                            key={range}
                            onClick={() => setFormData({ ...formData, budget: isSelected ? '' : range })}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-[#C7FF4D] text-[#050505] font-bold border-[#C7FF4D]'
                                : 'bg-[#050505] border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#444]'
                            }`}
                          >
                            {range}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Project Details */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                      Project Details <span className="text-[#C7FF4D]">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about your brand, current bottlenecks, desired timeline, or what you are looking to achieve..."
                      value={formData.project_details}
                      onChange={e => {
                        setFormData({ ...formData, project_details: e.target.value });
                        if (errors.project_details) setErrors({ ...errors, project_details: '' });
                      }}
                      className={`w-full bg-[#050505] border rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#555] focus:outline-none transition-colors ${
                        errors.project_details ? 'border-red-500 focus:border-red-400' : 'border-[#252525] focus:border-[#C7FF4D]'
                      }`}
                      required
                    />
                    {errors.project_details && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.project_details}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-base hover:bg-[#d4ff70] active:scale-[0.99] transition-all glow-lime-hover shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Transmitting Enquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Enquiry</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

