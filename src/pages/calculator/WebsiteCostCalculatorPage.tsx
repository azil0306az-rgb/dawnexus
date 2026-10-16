import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Sparkles,
  Layers,
  ShoppingBag,
  CalendarCheck,
  CodeXml,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  Send,
  HelpCircle,
  Clock,
  Shield,
  FileText,
  DollarSign,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
  Phone,
  Mail,
  User,
  Building,
  Check
} from 'lucide-react';
import {
  CalculatorPricingConfig,
  CalculatorSelections,
  CalculationResult,
  WebsiteTypeConfig
} from '../../types';
import { usePageSeo } from '../../utils/seo';
import { generateEstimatePdf } from '../../utils/generateEstimatePdf';

const ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-6 h-6 text-[#C7FF4D]" />,
  Globe: <Globe className="w-6 h-6 text-[#C7FF4D]" />,
  Layers: <Layers className="w-6 h-6 text-[#C7FF4D]" />,
  ShoppingBag: <ShoppingBag className="w-6 h-6 text-[#C7FF4D]" />,
  CalendarCheck: <CalendarCheck className="w-6 h-6 text-[#C7FF4D]" />,
  CodeXml: <CodeXml className="w-6 h-6 text-[#C7FF4D]" />
};

export const WebsiteCostCalculatorPage: React.FC = () => {
  usePageSeo({
    title: 'Website Cost Estimator | Instant Transparent Pricing | Dawnexus',
    description: 'Calculate an instant, transparent project cost estimate for your new website. Select website type, page count, and custom features in Indian Rupees (₹).',
    canonicalUrl: 'https://www.dawnexus.in/website-cost-calculator',
    ogImage: 'https://www.dawnexus.in/brand/dawnexus-logo-original.png'
  });

  // Steps: 1: Type, 2: Pages, 3: Features, 4: Design, 5: Estimate
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [config, setConfig] = useState<CalculatorPricingConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Selections state
  const [selectedType, setSelectedType] = useState<string>('business-website');
  const [pageCount, setPageCount] = useState<number>(5);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['seo-setup', 'admin-panel']);
  
  // Conditional details
  const [ecommerceProductSize, setEcommerceProductSize] = useState<'1-20' | '21-100' | '100+'>('1-20');
  const [ecommerceShipping, setEcommerceShipping] = useState<boolean>(false);
  const [bookingMultiStaff, setBookingMultiStaff] = useState<boolean>(false);
  const [bookingCalendarSync, setBookingCalendarSync] = useState<boolean>(false);
  const [customAppComplexity, setCustomAppComplexity] = useState<'MVP' | 'Advanced' | 'Enterprise'>('MVP');
  const [customAppApiSync, setCustomAppApiSync] = useState<boolean>(false);

  // Design & Timeline
  const [designTier, setDesignTier] = useState<'Standard' | 'Premium' | 'Custom'>('Standard');
  const [maintenanceOption, setMaintenanceOption] = useState<'None' | 'Monthly' | 'Annual'>('None');
  const [timelinePreference, setTimelinePreference] = useState<'Flexible' | 'Standard' | 'Urgent'>('Standard');
  const [contentReadiness, setContentReadiness] = useState<'Ready' | 'Needs Copywriting' | 'Rough Drafts'>('Ready');
  const [projectNotes, setProjectNotes] = useState<string>('');

  // Server calculation result
  const [estimate, setEstimate] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Enquiry submission modal & state
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactBusiness, setContactBusiness] = useState<string>('');
  const [enquiryErrors, setEnquiryErrors] = useState<Record<string, string>>({});
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [submittedRefId, setSubmittedRefId] = useState<string>('');

  // Fetch Pricing Configuration from API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/calculator/config');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setConfig(data.config);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch pricing config from server:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Update default pages when website type changes
  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    if (config) {
      const type = config.websiteTypes.find(t => t.id === typeId);
      if (type && pageCount < type.includedPages) {
        setPageCount(type.includedPages);
      }
    }
  };

  // Compile active selections payload
  const currentSelections: CalculatorSelections = useMemo(() => ({
    websiteType: selectedType,
    pageCount,
    selectedFeatures,
    ecommerceDetails: selectedType === 'ecommerce-website' ? {
      productCatalogSize: ecommerceProductSize,
      multiZoneShipping: ecommerceShipping
    } : undefined,
    bookingDetails: selectedType === 'booking-website' ? {
      multiStaffOrLocation: bookingMultiStaff,
      twoWayCalendarSync: bookingCalendarSync
    } : undefined,
    customAppDetails: selectedType === 'custom-web-app' ? {
      complexityTier: customAppComplexity,
      externalApiSync: customAppApiSync
    } : undefined,
    designTier,
    maintenanceOption,
    timelinePreference,
    contentReadiness,
    projectNotes
  }), [
    selectedType,
    pageCount,
    selectedFeatures,
    ecommerceProductSize,
    ecommerceShipping,
    bookingMultiStaff,
    bookingCalendarSync,
    customAppComplexity,
    customAppApiSync,
    designTier,
    maintenanceOption,
    timelinePreference,
    contentReadiness,
    projectNotes
  ]);

  // Request authoritative calculation from server
  useEffect(() => {
    let isCancelled = false;
    const calculateEstimate = async () => {
      setIsCalculating(true);
      try {
        const res = await fetch('/api/calculator/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentSelections)
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data.estimate) {
            setEstimate(data.estimate);
          }
        }
      } catch (err) {
        console.warn('Calculation fetch error:', err);
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    };

    const timer = setTimeout(calculateEstimate, 120);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentSelections]);

  // Toggle features
  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Submit Enquiry Handler
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!contactName.trim()) {
      errors.name = 'Full name is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail.trim() || !emailRegex.test(contactEmail.trim())) {
      errors.email = 'Valid email address is required.';
    }

    if (Object.keys(errors).length > 0) {
      setEnquiryErrors(errors);
      return;
    }

    setIsSubmittingEnquiry(true);
    setEnquiryErrors({});

    try {
      const res = await fetch('/api/calculator/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          business_name: contactBusiness.trim(),
          project_notes: projectNotes.trim(),
          selections: currentSelections
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedRefId(data.estimate?.referenceId || estimate?.referenceId || 'DNX-EST');
        setSubmissionSuccess(true);
      } else {
        setEnquiryErrors({ form: data.error || 'Failed to submit enquiry. Please try again.' });
      }
    } catch {
      setEnquiryErrors({ form: 'Network error submitting enquiry. Please check your connection.' });
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  const selectedTypeObj = config?.websiteTypes.find(t => t.id === selectedType);

  if (isLoadingConfig && !config) {
    return (
      <div className="flex-1 min-h-[70vh] flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#C7FF4D] mx-auto" />
          <p className="text-sm font-mono text-neutral-400">Loading interactive cost estimator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32">
      {/* Top Hero Breadcrumb & Header */}
      <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 border-b border-[#181818] bg-gradient-to-b from-[#0e0e0e] to-[#050505]">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#181818] border border-[#262626] text-xs font-mono text-[#C7FF4D]">
            <Sparkles className="w-3.5 h-3.5 text-[#C7FF4D]" />
            <span>Version 5.8 • Transparent Pricing Engine</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Interactive Website <span className="text-[#C7FF4D]">Cost Estimator</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Configure your website requirements below to receive an instant, itemized project estimate in Indian Rupees (₹). No hidden clauses.
          </p>

          {/* Stepper Indicator */}
          <div className="pt-8 flex items-center justify-center max-w-3xl mx-auto overflow-x-auto pb-2">
            {[
              { num: 1, label: 'Website Type' },
              { num: 2, label: 'Pages' },
              { num: 3, label: 'Features' },
              { num: 4, label: 'Design' },
              { num: 5, label: 'Estimate' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition flex-shrink-0 ${
                    currentStep === step.num
                      ? 'bg-[#C7FF4D] text-black shadow-lg shadow-[#C7FF4D]/10'
                      : currentStep > step.num
                      ? 'bg-[#1a1a1a] text-[#C7FF4D] border border-[#C7FF4D]/30'
                      : 'bg-[#121212] text-neutral-500 border border-[#222]'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === step.num ? 'bg-black text-[#C7FF4D]' : 'bg-[#252525]'
                  }`}>
                    {step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
                {idx < 4 && (
                  <div className={`w-6 sm:w-10 h-0.5 mx-1 flex-shrink-0 ${
                    currentStep > step.num ? 'bg-[#C7FF4D]' : 'bg-[#222]'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* STEP 1: WEBSITE TYPE */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#202020] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Step 1: Select Your Website Type</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Choose the category that best matches your primary business objective.
                </p>
              </div>
              <span className="text-xs font-mono text-[#C7FF4D]">1 of 5</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config?.websiteTypes.map(type => {
                const isSelected = selectedType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTypeSelect(type.id);
                      }
                    }}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left group focus:outline-none focus:ring-2 focus:ring-[#C7FF4D] ${
                      isSelected
                        ? 'bg-[#121212] border-[#C7FF4D] shadow-xl shadow-[#C7FF4D]/5 ring-1 ring-[#C7FF4D]'
                        : 'bg-[#0B0B0B] border-[#222] hover:border-[#383838] hover:bg-[#101010]'
                    }`}
                  >
                    {type.badge && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30 text-[10px] font-semibold">
                        {type.badge}
                      </span>
                    )}

                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#161616] border border-[#282828] flex items-center justify-center group-hover:scale-105 transition-transform">
                        {ICON_MAP[type.iconName] || <Globe className="w-6 h-6 text-[#C7FF4D]" />}
                      </div>
                      
                      <h3 className="text-base font-bold text-white group-hover:text-[#C7FF4D] transition-colors">
                        {type.name}
                      </h3>

                      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                        {type.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#1a1a1a] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Starts from</span>
                        <span className="text-sm font-bold text-white">
                          ₹{type.basePrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 block">Includes</span>
                        <span className="text-xs text-neutral-300 font-mono">
                          {type.includedPages} {type.includedPages > 1 ? 'pages' : 'page'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 rounded-xl bg-[#C7FF4D] text-black font-bold text-sm hover:bg-[#b8f53a] transition flex items-center space-x-2"
              >
                <span>Continue to Page Count</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: NUMBER OF PAGES */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#202020] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Step 2: Choose Number of Pages
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Specify how many total unique pages your website will require.
                </p>
              </div>
              <span className="text-xs font-mono text-[#C7FF4D]">2 of 5</span>
            </div>

            {/* Selected Type Reminder Callout */}
            {selectedTypeObj && (
              <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#222] flex items-start space-x-3 text-xs">
                <HelpCircle className="w-4 h-4 text-[#C7FF4D] flex-shrink-0 mt-0.5" />
                <div className="text-neutral-300 space-y-1">
                  <p>
                    Your selected <strong className="text-white">{selectedTypeObj.name}</strong> package includes{' '}
                    <strong className="text-[#C7FF4D]">{selectedTypeObj.includedPages} {selectedTypeObj.includedPages > 1 ? 'pages' : 'page'}</strong> in the base price.
                  </p>
                  <p className="text-neutral-500 text-[11px]">
                    Additional pages beyond {selectedTypeObj.includedPages} are charged at ₹{selectedTypeObj.additionalPagePrice.toLocaleString('en-IN')} per page.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Page Presets */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Quick Selection Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: '1 Page', count: 1, sub: 'Single page' },
                  { label: '2–5 Pages', count: 5, sub: 'Small site' },
                  { label: '6–10 Pages', count: 8, sub: 'Standard' },
                  { label: '11–20 Pages', count: 15, sub: 'Expanded' },
                  { label: '20+ Pages', count: 25, sub: 'Enterprise' }
                ].map(preset => (
                  <button
                    key={preset.count}
                    type="button"
                    onClick={() => setPageCount(preset.count)}
                    className={`p-3.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      pageCount === preset.count
                        ? 'bg-[#141414] border-[#C7FF4D] text-white ring-1 ring-[#C7FF4D]'
                        : 'bg-[#0B0B0B] border-[#252525] hover:border-[#3a3a3a] text-neutral-400'
                    }`}
                  >
                    <span className="text-sm font-bold block">{preset.label}</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">{preset.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Page Input Slider & Input */}
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#222] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-white block">Exact Page Count</label>
                  <span className="text-xs text-neutral-500">Fine-tune your exact page volume</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pageCount}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setPageCount(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                    }}
                    className="w-20 px-3 py-1.5 bg-[#141414] border border-[#2e2e2e] focus:border-[#C7FF4D] rounded-lg text-white font-mono text-center font-bold text-sm focus:outline-none"
                  />
                  <span className="text-xs text-neutral-400">pages</span>
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={40}
                value={pageCount > 40 ? 40 : pageCount}
                onChange={e => setPageCount(parseInt(e.target.value, 10))}
                className="w-full accent-[#C7FF4D] cursor-pointer"
              />

              {pageCount > 30 && (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Projects exceeding 30 pages will be marked for custom enterprise quotation.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-[#181818]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl bg-[#141414] text-neutral-300 hover:text-white border border-[#252525] text-xs font-semibold transition flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 rounded-xl bg-[#C7FF4D] text-black font-bold text-sm hover:bg-[#b8f53a] transition flex items-center space-x-2"
              >
                <span>Continue to Features</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ADDITIONAL FEATURES & CONDITIONAL QUESTIONS */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#202020] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Step 3: Select Additional Features
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Add functionality tailored to your operational and marketing needs.
                </p>
              </div>
              <span className="text-xs font-mono text-[#C7FF4D]">3 of 5</span>
            </div>

            {/* Core Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config?.features.map(feat => {
                const isSelected = selectedFeatures.includes(feat.id);
                return (
                  <div
                    key={feat.id}
                    onClick={() => toggleFeature(feat.id)}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={isSelected}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleFeature(feat.id);
                      }
                    }}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-start space-x-3 text-left focus:outline-none focus:ring-1 focus:ring-[#C7FF4D] ${
                      isSelected
                        ? 'bg-[#121212] border-[#C7FF4D] ring-1 ring-[#C7FF4D]/50'
                        : 'bg-[#0B0B0B] border-[#222] hover:border-[#333]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 transition ${
                      isSelected ? 'bg-[#C7FF4D] text-black' : 'border border-[#444] bg-[#161616]'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{feat.name}</h4>
                        <span className="text-xs font-mono font-bold text-[#C7FF4D]">
                          +₹{feat.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CONDITIONAL SECTION: E-COMMERCE SPECIFICS */}
            {selectedType === 'ecommerce-website' && (
              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#242424] space-y-5">
                <div className="flex items-center space-x-2 text-[#C7FF4D]">
                  <ShoppingBag className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    E-commerce Scope Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-2 font-semibold">
                      Product Catalog Volume
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: '1-20', label: '1–20 Items', add: '₹0' },
                        { id: '21-100', label: '21–100 Items', add: '+₹5,000' },
                        { id: '100+', label: '100+ Items', add: '+₹12,000' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setEcommerceProductSize(cat.id as any)}
                          className={`p-2.5 rounded-xl border text-center transition ${
                            ecommerceProductSize === cat.id
                              ? 'bg-[#181818] border-[#C7FF4D] text-white'
                              : 'bg-[#111] border-[#252525] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold block">{cat.label}</span>
                          <span className="text-[10px] text-[#C7FF4D] block mt-0.5">{cat.add}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="block text-xs text-neutral-400 mb-2 font-semibold">
                      Shipping Integration
                    </label>
                    <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#121212] border border-[#252525] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ecommerceShipping}
                        onChange={e => setEcommerceShipping(e.target.checked)}
                        className="w-4 h-4 accent-[#C7FF4D] rounded"
                      />
                      <div className="text-xs">
                        <span className="text-white font-medium block">Automated Multi-Zone Courier API</span>
                        <span className="text-neutral-500 text-[11px]">Shiprocket / Delhivery rate calculation (+₹3,500)</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL SECTION: BOOKING WEBSITE SPECIFICS */}
            {selectedType === 'booking-website' && (
              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#242424] space-y-4">
                <div className="flex items-center space-x-2 text-[#C7FF4D]">
                  <CalendarCheck className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Booking System Scope
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-[#121212] border border-[#252525] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingMultiStaff}
                      onChange={e => setBookingMultiStaff(e.target.checked)}
                      className="w-4 h-4 accent-[#C7FF4D] rounded"
                    />
                    <div className="text-xs">
                      <span className="text-white font-medium block">Multi-Staff & Location Matrix</span>
                      <span className="text-neutral-500 text-[11px]">Individual staff schedules & branch routing (+₹6,000)</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-[#121212] border border-[#252525] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingCalendarSync}
                      onChange={e => setBookingCalendarSync(e.target.checked)}
                      className="w-4 h-4 accent-[#C7FF4D] rounded"
                    />
                    <div className="text-xs">
                      <span className="text-white font-medium block">Two-Way Google & Outlook Sync</span>
                      <span className="text-neutral-500 text-[11px]">Real-time calendar anti-collision syncing (+₹2,500)</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* CONDITIONAL SECTION: CUSTOM APP SPECIFICS */}
            {selectedType === 'custom-web-app' && (
              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#242424] space-y-4">
                <div className="flex items-center space-x-2 text-[#C7FF4D]">
                  <CodeXml className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Web Application Architecture
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-2 font-semibold">
                      Complexity Tier
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: 'MVP', label: 'Standard MVP Core', sub: 'Standard workflows (+₹0)' },
                        { id: 'Advanced', label: 'Advanced RBAC & DB', sub: 'Multi-role permissions (+₹15,000)' },
                        { id: 'Enterprise', label: 'Enterprise Architecture', sub: 'Custom Scoping Required' }
                      ].map(t => (
                        <div
                          key={t.id}
                          onClick={() => setCustomAppComplexity(t.id as any)}
                          className={`p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                            customAppComplexity === t.id
                              ? 'bg-[#161616] border-[#C7FF4D] text-white'
                              : 'bg-[#101010] border-[#252525] text-neutral-400'
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span>{t.label}</span>
                            <span className="text-[#C7FF4D]">{t.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="block text-xs text-neutral-400 mb-2 font-semibold">
                      API & ERP Integrations
                    </label>
                    <label className="flex items-center space-x-3 p-3 rounded-xl bg-[#121212] border border-[#252525] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customAppApiSync}
                        onChange={e => setCustomAppApiSync(e.target.checked)}
                        className="w-4 h-4 accent-[#C7FF4D] rounded"
                      />
                      <div className="text-xs">
                        <span className="text-white font-medium block">Third-Party ERP/CRM Sync</span>
                        <span className="text-neutral-500 text-[11px]">HubSpot, Salesforce, Zoho or custom APIs (+₹10,000)</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ONGOING MAINTENANCE PLANS */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Ongoing Website Maintenance & Support (Optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {config?.maintenanceOptions.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => setMaintenanceOption(plan.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                      maintenanceOption === plan.id
                        ? 'bg-[#141414] border-[#C7FF4D] ring-1 ring-[#C7FF4D]/60'
                        : 'bg-[#0B0B0B] border-[#222] hover:border-[#333]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-white">{plan.name}</h4>
                        {maintenanceOption === plan.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#C7FF4D]" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
                      <span className="text-sm font-bold text-white">
                        {plan.amount === 0 ? 'Free' : `₹${plan.amount.toLocaleString('en-IN')}`}
                      </span>
                      {plan.period !== 'none' && (
                        <span className="text-xs text-neutral-500 font-mono"> /{plan.period}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-[#181818]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl bg-[#141414] text-neutral-300 hover:text-white border border-[#252525] text-xs font-semibold transition flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 rounded-xl bg-[#C7FF4D] text-black font-bold text-sm hover:bg-[#b8f53a] transition flex items-center space-x-2"
              >
                <span>Continue to Design & Project</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DESIGN & PROJECT REQUIREMENTS */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#202020] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Step 4: Design & Project Requirements
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Choose visual fidelity and timeline expectations.
                </p>
              </div>
              <span className="text-xs font-mono text-[#C7FF4D]">4 of 5</span>
            </div>

            {/* Design Tiers */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Visual Art Direction & Design Tier
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {config?.designTiers.map(tier => (
                  <div
                    key={tier.id}
                    onClick={() => setDesignTier(tier.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition text-left flex flex-col justify-between ${
                      designTier === tier.id
                        ? 'bg-[#121212] border-[#C7FF4D] ring-1 ring-[#C7FF4D]'
                        : 'bg-[#0B0B0B] border-[#222] hover:border-[#333]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-bold text-white">{tier.name}</h4>
                        {tier.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] text-[10px] font-semibold">
                            {tier.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {tier.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
                      <span className="text-xs font-bold text-[#C7FF4D]">
                        {tier.priceAdjustment === 0 ? 'Included' : `+₹${tier.priceAdjustment.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline & Content Readiness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222] space-y-2">
                <label className="block text-xs font-semibold text-neutral-300">
                  Content Readiness
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Ready', label: 'All Ready' },
                    { id: 'Rough Drafts', label: 'Drafts' },
                    { id: 'Needs Copywriting', label: 'Need Copy' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setContentReadiness(c.id as any)}
                      className={`p-2 rounded-lg text-xs font-medium border text-center transition ${
                        contentReadiness === c.id
                          ? 'bg-[#1c1c1c] border-[#C7FF4D] text-white'
                          : 'bg-[#121212] border-[#252525] text-neutral-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222] space-y-2">
                <label className="block text-xs font-semibold text-neutral-300">
                  Desired Delivery Timeline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Flexible', label: 'Flexible' },
                    { id: 'Standard', label: 'Standard' },
                    { id: 'Urgent', label: 'Expedited' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimelinePreference(t.id as any)}
                      className={`p-2 rounded-lg text-xs font-medium border text-center transition ${
                        timelinePreference === t.id
                          ? 'bg-[#1c1c1c] border-[#C7FF4D] text-white'
                          : 'bg-[#121212] border-[#252525] text-neutral-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222] space-y-2">
              <label className="block text-xs font-semibold text-neutral-300">
                Additional Project Notes or Target Reference Links (Optional)
              </label>
              <textarea
                rows={3}
                value={projectNotes}
                onChange={e => setProjectNotes(e.target.value)}
                placeholder="Mention any specific inspirations, integrations, or unique functional requirements..."
                className="w-full px-3 py-2 bg-[#121212] border border-[#262626] focus:border-[#C7FF4D] rounded-lg text-white text-xs placeholder-neutral-600 focus:outline-none transition resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-[#181818]">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl bg-[#141414] text-neutral-300 hover:text-white border border-[#252525] text-xs font-semibold transition flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-3 rounded-xl bg-[#C7FF4D] text-black font-bold text-sm hover:bg-[#b8f53a] transition flex items-center space-x-2"
              >
                <span>View Full Estimate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: FINAL ESTIMATE SUMMARY & ACTIONS */}
        {currentStep === 5 && estimate && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#202020] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Step 5: Project Estimate Summary
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Itemized cost breakdown based on your active selections.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500">Ref: {estimate.referenceId}</span>
            </div>

            {/* Custom Quote Notice if required */}
            {estimate.isCustomQuoteRequired && (
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-amber-200 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>Custom Quotation Required</span>
                </div>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  Your project selections exceed standard automated thresholds. Our engineering team will review your specifications to prepare a bespoke, optimized proposal.
                </p>
                <ul className="text-xs list-disc list-inside text-amber-400/80 space-y-0.5">
                  {estimate.customQuoteReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Big Total Price Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#161616] to-[#0c0c0c] border border-[#2a2a2a] md:col-span-2 space-y-2">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Estimated One-Time Project Investment
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#C7FF4D]">
                    {estimate.isCustomQuoteRequired
                      ? 'Custom Quote'
                      : `₹${estimate.subtotalOneTime.toLocaleString('en-IN')}`}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">INR (Excl. GST)</span>
                </div>
                <p className="text-xs text-neutral-400 pt-1">
                  Includes base framework, {estimate.pageCount} pages, selected modules & deployment.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#222] flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                    Ongoing Maintenance
                  </span>
                  <div className="text-xl font-bold text-white mt-1">
                    {estimate.recurringMaintenance.amount === 0 ? (
                      '30-Day Warranty'
                    ) : (
                      <>
                        ₹{estimate.recurringMaintenance.amount.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-neutral-500"> /{estimate.recurringMaintenance.period}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-neutral-400 font-mono flex items-center space-x-1.5 pt-2 border-t border-[#1a1a1a]">
                  <Clock className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>Est. Timeline: {estimate.estimatedDeliveryWeeks.min}–{estimate.estimatedDeliveryWeeks.max} wks</span>
                </div>
              </div>
            </div>

            {/* Itemized Scope Table */}
            <div className="rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
              <div className="px-5 py-3.5 bg-[#121212] border-b border-[#202020] flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <span>Scope Deliverable</span>
                <span>Estimated Amount</span>
              </div>
              <div className="divide-y divide-[#181818]">
                {estimate.items.map((item, idx) => (
                  <div key={idx} className="p-4 sm:px-5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">{item.label}</div>
                      {item.description && (
                        <p className="text-[11px] text-neutral-400 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <div className="text-xs font-bold text-[#C7FF4D] font-mono whitespace-nowrap">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Three Primary Actions (Section 8) */}
            <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#282828] space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Next Steps For Your Project
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setIsEnquiryModalOpen(true)}
                  className="px-5 py-3.5 rounded-xl bg-[#C7FF4D] hover:bg-[#b8f53a] text-black font-bold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-[#C7FF4D]/10"
                >
                  <Send className="w-4 h-4" />
                  <span>Send My Enquiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => generateEstimatePdf(estimate, contactName)}
                  className="px-5 py-3.5 rounded-xl bg-[#181818] hover:bg-[#222] text-white border border-[#333] font-semibold text-xs transition flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4 text-[#C7FF4D]" />
                  <span>Download PDF Estimate</span>
                </button>

                <a
                  href="/#contact"
                  className="px-5 py-3.5 rounded-xl bg-[#121212] hover:bg-[#1c1c1c] text-neutral-300 hover:text-white border border-[#252525] font-semibold text-xs transition flex items-center justify-center space-x-2 text-center"
                >
                  <Phone className="w-4 h-4 text-[#C7FF4D]" />
                  <span>Discuss With Team</span>
                </a>
              </div>

              <div className="text-[11px] text-neutral-500 pt-2 border-t border-[#1c1c1c] leading-relaxed">
                <strong>Disclaimer:</strong> {estimate.disclaimer}
              </div>
            </div>

            <div className="flex justify-start pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 rounded-xl bg-[#141414] text-neutral-300 hover:text-white border border-[#252525] text-xs font-semibold transition flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Adjust Parameters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar for Quick Summary on Any Step */}
      {currentStep < 5 && estimate && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-black/90 backdrop-blur-md border-t border-[#252525] py-3.5 px-4 sm:px-8 shadow-2xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Current Live Estimate</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg sm:text-xl font-extrabold text-[#C7FF4D]">
                  {estimate.isCustomQuoteRequired
                    ? 'Custom Quote'
                    : `₹${estimate.subtotalOneTime.toLocaleString('en-IN')}`}
                </span>
                {estimate.recurringMaintenance.amount > 0 && (
                  <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                    + ₹{estimate.recurringMaintenance.amount.toLocaleString('en-IN')}/{estimate.recurringMaintenance.period}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              className="px-5 py-2.5 rounded-xl bg-[#C7FF4D] text-black font-bold text-xs hover:bg-[#b8f53a] transition flex items-center space-x-2 flex-shrink-0"
            >
              <span>{currentStep === 4 ? 'Review Estimate' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ENQUIRY SUBMISSION MODAL */}
      {isEnquiryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#282828] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsEnquiryModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#202020] transition"
            >
              <X className="w-4 h-4" />
            </button>

            {submissionSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 flex items-center justify-center mx-auto text-[#C7FF4D]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Estimate Received!</h3>
                <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                  Thank you, <strong className="text-white">{contactName}</strong>. Your estimate specifications have been safely delivered to our project management desk.
                </p>
                <div className="p-3 rounded-xl bg-[#161616] border border-[#252525] inline-block font-mono text-xs text-[#C7FF4D]">
                  Reference ID: {submittedRefId}
                </div>
                <div className="pt-4 flex items-center justify-center space-x-3">
                  <button
                    type="button"
                    onClick={() => generateEstimatePdf(estimate!, contactName)}
                    className="px-4 py-2.5 rounded-xl bg-[#C7FF4D] text-black text-xs font-bold hover:bg-[#b8f53a] transition flex items-center space-x-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Copy as PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEnquiryModalOpen(false);
                      setSubmissionSuccess(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] text-neutral-300 text-xs font-semibold hover:bg-[#252525] transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Send My Project Enquiry</h3>
                  <p className="text-xs text-neutral-400">
                    Submit your configured estimate for review. We will reach out within 24 business hours.
                  </p>
                </div>

                {enquiryErrors.form && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-300 text-xs">
                    {enquiryErrors.form}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. Arun Kumar"
                    className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                  />
                  {enquiryErrors.name && (
                    <span className="text-[11px] text-red-400 mt-0.5 block">{enquiryErrors.name}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="arun@example.com"
                      className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                    />
                    {enquiryErrors.email && (
                      <span className="text-[11px] text-red-400 mt-0.5 block">{enquiryErrors.email}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Mobile / WhatsApp (Optional)</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Company / Brand Name (Optional)</label>
                  <input
                    type="text"
                    value={contactBusiness}
                    onChange={e => setContactBusiness(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions"
                    className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                  />
                </div>

                <div className="p-3 rounded-lg bg-[#0E0E0E] border border-[#222] text-xs text-neutral-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Configured Scope:</span>
                    <strong className="text-white">{estimate?.websiteType.name} ({estimate?.pageCount} pgs)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated One-Time:</span>
                    <strong className="text-[#C7FF4D]">
                      {estimate?.isCustomQuoteRequired ? 'Custom Quote' : `₹${estimate?.subtotalOneTime.toLocaleString('en-IN')}`}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#222]">
                  <button
                    type="button"
                    onClick={() => setIsEnquiryModalOpen(false)}
                    className="px-4 py-2 bg-[#1f1f1f] text-neutral-300 text-xs font-semibold rounded-lg hover:bg-[#282828] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEnquiry}
                    className="px-5 py-2.5 bg-[#C7FF4D] hover:bg-[#b8f53a] text-black text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isSubmittingEnquiry ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Project Enquiry</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

