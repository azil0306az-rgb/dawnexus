import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Save, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Layers, 
  Settings, 
  Palette, 
  Clock, 
  ShieldCheck,
  DollarSign,
  Download,
  Sliders,
  Sparkles,
  Globe,
  ShoppingBag,
  CalendarCheck,
  CodeXml,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import type { 
  CalculatorPricingConfig, 
  WebsiteTypeConfig, 
  FeatureConfig, 
  DesignTierConfig, 
  MaintenanceOptionConfig,
  CalculationResult,
  CalculatorSelections
} from '../../types';
import { generateEstimatePdf } from '../../utils/generateEstimatePdf';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-5 h-5 text-[#C7FF4D]" />,
  Globe: <Globe className="w-5 h-5 text-[#C7FF4D]" />,
  Layers: <Layers className="w-5 h-5 text-[#C7FF4D]" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5 text-[#C7FF4D]" />,
  CalendarCheck: <CalendarCheck className="w-5 h-5 text-[#C7FF4D]" />,
  CodeXml: <CodeXml className="w-5 h-5 text-[#C7FF4D]" />
};

export const CalculatorSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estimator' | 'pricing'>('estimator');
  const [config, setConfig] = useState<CalculatorPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estimator Workbench State
  const [selectedType, setSelectedType] = useState<string>('business-website');
  const [pageCount, setPageCount] = useState<number>(5);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['seo-setup', 'admin-panel']);
  const [designTier, setDesignTier] = useState<'Standard' | 'Premium' | 'Custom'>('Standard');
  const [maintenanceOption, setMaintenanceOption] = useState<'None' | 'Monthly' | 'Annual'>('None');
  const [estimate, setEstimate] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [quoteClientName, setQuoteClientName] = useState<string>('Prospective Client');

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/calculator/config', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error(`Failed to load calculator configuration (${res.status})`);
      }
      const data = await res.json();
      if (data && data.config) {
        setConfig(data.config);
      } else if (data && Array.isArray(data.websiteTypes)) {
        setConfig(data);
      } else {
        throw new Error('Invalid configuration response structure');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) ? prev.filter(id => id !== featureId) : [...prev, featureId]
    );
  };

  // Build selections payload
  const currentSelections: CalculatorSelections = useMemo(() => ({
    websiteType: selectedType,
    pageCount,
    selectedFeatures,
    designTier,
    maintenanceOption,
    timelinePreference: 'Standard',
    contentReadiness: 'Ready'
  }), [selectedType, pageCount, selectedFeatures, designTier, maintenanceOption]);

  // Perform live estimate calculation
  useEffect(() => {
    if (!config) return;
    let isCancelled = false;
    const runCalculation = async () => {
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
        console.warn('Calculation error:', err);
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    };
    runCalculation();
    return () => { isCancelled = true; };
  }, [config, currentSelections]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/calculator/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }
      setConfig(data.config || config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Helper updaters
  const updateWebsiteType = (index: number, updates: Partial<WebsiteTypeConfig>) => {
    if (!config) return;
    const updated = [...config.websiteTypes];
    updated[index] = { ...updated[index], ...updates };
    setConfig({ ...config, websiteTypes: updated });
  };

  const updateFeature = (index: number, updates: Partial<FeatureConfig>) => {
    if (!config) return;
    const updated = [...config.features];
    updated[index] = { ...updated[index], ...updates };
    setConfig({ ...config, features: updated });
  };

  const updateDesignTier = (index: number, updates: Partial<DesignTierConfig>) => {
    if (!config) return;
    const updated = [...config.designTiers];
    updated[index] = { ...updated[index], ...updates };
    setConfig({ ...config, designTiers: updated });
  };

  const updateMaintenance = (index: number, updates: Partial<MaintenanceOptionConfig>) => {
    if (!config) return;
    const updated = [...config.maintenanceOptions];
    updated[index] = { ...updated[index], ...updates };
    setConfig({ ...config, maintenanceOptions: updated });
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-[#A5A5A5] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#C7FF4D] mb-4" />
        <p className="font-mono text-sm">Loading Website Cost Estimator...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-500/30 rounded-2xl text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 font-medium mb-4">{error || 'Could not load configuration'}</p>
        <button
          onClick={fetchConfig}
          className="px-4 py-2 bg-[#161616] text-white rounded-xl border border-[#252525] hover:border-white transition-colors text-xs font-mono"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252525]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/20">
              VERSION 5.8
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Website Cost Estimator
            </h1>
          </div>
          <p className="text-sm text-[#A5A5A5] mt-1 font-normal">
            Interactive calculation engine, quote generator, and live pricing rules in Indian Rupees (₹).
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 bg-[#090909] border border-[#252525] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('estimator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'estimator'
                ? 'bg-[#C7FF4D] text-[#050505] shadow'
                : 'text-[#A5A5A5] hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Estimator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pricing'
                ? 'bg-[#C7FF4D] text-[#050505] shadow'
                : 'text-[#A5A5A5] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pricing Rules & Rates</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#071305] border border-[#C7FF4D]/40 text-[#C7FF4D] text-sm flex items-center gap-3 font-mono">
          <Check className="w-5 h-5 shrink-0" />
          <span>Estimator pricing rules updated successfully and synchronized to database.</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: INTERACTIVE ESTIMATOR & QUOTE GENERATOR WORKBENCH           */}
      {/* =================================================================== */}
      {activeTab === 'estimator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Column (Left) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Website Type */}
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#C7FF4D] uppercase tracking-wider">
                  Step 1 • Select Website Type
                </span>
                <span className="text-xs text-[#777]">
                  {config.websiteTypes.length} package options
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {config.websiteTypes.map(pkg => {
                  const isSelected = selectedType === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleTypeSelect(pkg.id)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-[#0f140a] border-[#C7FF4D] shadow-sm'
                          : 'bg-[#050505] border-[#252525] hover:border-[#383838]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {TYPE_ICONS[pkg.iconName] || <Globe className="w-4 h-4 text-[#C7FF4D]" />}
                          <span className="font-bold text-white text-sm">{pkg.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C7FF4D]" />}
                      </div>
                      <div className="text-xs text-[#A5A5A5] line-clamp-2 mb-2">
                        {pkg.description}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#1c1c1c] text-xs">
                        <span className="font-mono text-[#C7FF4D] font-bold">
                          ₹{pkg.basePrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-[#666]">
                          {pkg.includedPages} {pkg.includedPages === 1 ? 'page' : 'pages'} incl.
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Number of Pages */}
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#C7FF4D] uppercase tracking-wider">
                  Step 2 • Page Count Adjustment
                </span>
                <span className="text-xs font-mono font-bold text-white bg-[#151515] px-2.5 py-1 rounded-md border border-[#252525]">
                  {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                </span>
              </div>
              
              <div className="space-y-3">
                <input
                  type="range"
                  min={1}
                  max={Math.min(config.maxStandardPages + 10, 40)}
                  value={pageCount}
                  onChange={e => setPageCount(parseInt(e.target.value) || 1)}
                  className="w-full accent-[#C7FF4D] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] text-[#666] font-mono">
                  <span>1 Page (Landing)</span>
                  <span>10 Pages</span>
                  <span>20 Pages</span>
                  <span>{config.maxStandardPages}+ (Enterprise)</span>
                </div>
              </div>

              {pageCount > config.maxStandardPages && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Page count exceeds standard ceiling ({config.maxStandardPages} pages). Flagged for custom enterprise review.</span>
                </div>
              )}
            </div>

            {/* 3. Add-on Features */}
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#C7FF4D] uppercase tracking-wider">
                  Step 3 • Add-on Features & Capabilities
                </span>
                <span className="text-xs text-[#777]">
                  {selectedFeatures.length} selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {config.features.map(feat => {
                  const isChecked = selectedFeatures.includes(feat.id);
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => toggleFeature(feat.id)}
                      className={`p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-[#0f140a] border-[#C7FF4D]'
                          : 'bg-[#050505] border-[#252525] hover:border-[#383838]'
                      }`}
                    >
                      <div className="pr-2">
                        <span className="text-xs font-semibold text-white block">
                          {feat.name}
                        </span>
                        <span className="text-[11px] font-mono text-[#C7FF4D]">
                          +₹{feat.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isChecked ? 'bg-[#C7FF4D] border-[#C7FF4D] text-black' : 'border-[#444]'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Design Tier & Maintenance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Design Tier */}
              <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-3">
                <span className="text-xs font-mono font-bold text-[#C7FF4D] uppercase tracking-wider block">
                  Design Tier
                </span>
                <div className="space-y-2">
                  {config.designTiers.map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setDesignTier(tier.id)}
                      className={`w-full p-2.5 rounded-xl text-left border text-xs flex items-center justify-between ${
                        designTier === tier.id
                          ? 'bg-[#0f140a] border-[#C7FF4D] text-white font-bold'
                          : 'bg-[#050505] border-[#252525] text-[#A5A5A5] hover:text-white'
                      }`}
                    >
                      <span>{tier.name}</span>
                      <span className="font-mono text-[#C7FF4D]">
                        {tier.priceAdjustment > 0 ? `+₹${tier.priceAdjustment.toLocaleString('en-IN')}` : 'Included'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Maintenance Plan */}
              <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-3">
                <span className="text-xs font-mono font-bold text-[#C7FF4D] uppercase tracking-wider block">
                  Maintenance Plan
                </span>
                <div className="space-y-2">
                  {config.maintenanceOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMaintenanceOption(opt.id)}
                      className={`w-full p-2.5 rounded-xl text-left border text-xs flex items-center justify-between ${
                        maintenanceOption === opt.id
                          ? 'bg-[#0f140a] border-[#C7FF4D] text-white font-bold'
                          : 'bg-[#050505] border-[#252525] text-[#A5A5A5] hover:text-white'
                      }`}
                    >
                      <span>{opt.name}</span>
                      <span className="font-mono text-amber-400">
                        {opt.amount > 0 ? `₹${opt.amount.toLocaleString('en-IN')}/${opt.period}` : 'None'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Real-time Calculation Breakdown Column (Right) */}
          <div className="lg:col-span-5 sticky top-6 space-y-6">
            
            <div className="p-6 rounded-2xl bg-[#090b07] border border-[#C7FF4D]/30 shadow-2xl space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#252525]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C7FF4D] animate-pulse" />
                  <h3 className="font-bold text-white text-base">Live Project Estimate</h3>
                </div>
                {estimate && (
                  <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#252525] text-[10px] font-mono text-[#A5A5A5]">
                    {estimate.referenceId}
                  </span>
                )}
              </div>

              {/* Itemized Line Items */}
              {estimate ? (
                <div className="space-y-3">
                  <div className="divide-y divide-[#1e1e1e] text-xs">
                    {estimate.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium block">{item.label}</span>
                          {item.description && (
                            <span className="text-[11px] text-[#777] block">{item.description}</span>
                          )}
                        </div>
                        <span className="font-mono text-[#C7FF4D] font-semibold shrink-0 pl-3">
                          {item.isIncluded ? (
                            <span className="text-[#A5A5A5] font-normal">Included</span>
                          ) : (
                            `₹${item.amount.toLocaleString('en-IN')}`
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Box */}
                  <div className="pt-4 border-t border-[#252525] space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
                      <span>Estimated Delivery Timeline:</span>
                      <span className="text-white font-semibold">
                        {estimate.estimatedDeliveryWeeks.min}–{estimate.estimatedDeliveryWeeks.max} Weeks
                      </span>
                    </div>

                    {estimate.recurringMaintenance.amount > 0 && (
                      <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
                        <span>Ongoing Care ({estimate.recurringMaintenance.name}):</span>
                        <span className="font-mono text-amber-400 font-semibold">
                          ₹{estimate.recurringMaintenance.amount.toLocaleString('en-IN')}/{estimate.recurringMaintenance.period}
                        </span>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-mono uppercase text-[#A5A5A5] block">
                          One-Time Project Total
                        </span>
                        <span className="text-2xl font-extrabold font-mono text-[#C7FF4D]">
                          {estimate.isCustomQuoteRequired 
                            ? 'Custom Quote' 
                            : `₹${estimate.subtotalOneTime.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#777] font-mono text-right">
                        INR (₹) All inclusive
                      </span>
                    </div>
                  </div>

                  {/* PDF Download Section */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quoteClientName}
                        onChange={e => setQuoteClientName(e.target.value)}
                        placeholder="Client Name for PDF quote..."
                        className="flex-1 px-3 py-2 bg-[#050505] border border-[#252525] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#C7FF4D]"
                      />
                      <button
                        type="button"
                        onClick={() => generateEstimatePdf(estimate, quoteClientName)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#161616] hover:bg-[#222] border border-[#252525] hover:border-white text-white rounded-lg text-xs font-mono transition-colors"
                        title="Download PDF Quotation"
                      >
                        <Download className="w-3.5 h-3.5 text-[#C7FF4D]" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-[#777] text-xs font-mono">
                  Calculating real-time breakdown...
                </div>
              )}

            </div>

            {/* Quick Switch to Edit Rates */}
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525] flex items-center justify-between">
              <div>
                <span className="text-xs text-white font-bold block">Need to modify pricing rates?</span>
                <span className="text-[11px] text-[#777] block">Update base prices, extra page fees, and feature costs.</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className="px-3 py-1.5 rounded-lg bg-[#151515] border border-[#252525] text-[#C7FF4D] text-xs font-mono hover:border-[#C7FF4D] transition-colors"
              >
                Edit Pricing Rules →
              </button>
            </div>

          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: PRICING CONFIGURATION & RATES EDITOR                         */}
      {/* =================================================================== */}
      {activeTab === 'pricing' && (
        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0E0E0E] border border-[#252525]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C7FF4D]" />
              <span className="text-xs text-[#A5A5A5]">
                Adjust live rates below. All modifications apply immediately to the public calculator and admin workbench.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchConfig}
                disabled={saving}
                className="p-2.5 rounded-xl bg-[#0B0B0B] border border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#C7FF4D] transition-colors"
                title="Reload from Database"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover disabled:opacity-60"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 1: WEBSITE TYPES & BASE PACKAGES */}
          <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#252525] pb-4">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-[#C7FF4D]" />
                <div>
                  <h2 className="text-lg font-bold text-white">1. Website Type Packages ({config.websiteTypes.length})</h2>
                  <p className="text-xs text-[#A5A5A5]">Define starting package cost, included pages, and per-page expansion rate in INR.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {config.websiteTypes.map((pkg, index) => (
                <div key={pkg.id} className="p-5 rounded-xl bg-[#050505] border border-[#252525] space-y-4 hover:border-[#333] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-base">{pkg.name}</h3>
                      <span className="text-[10px] font-mono text-[#A5A5A5]">{pkg.id}</span>
                    </div>
                    {pkg.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30">
                        {pkg.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#1a1a1a]">
                    <div>
                      <label className="block text-[11px] font-mono text-[#A5A5A5] uppercase mb-1">
                        Base Package Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-[#555] font-mono">₹</span>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={pkg.basePrice}
                          onChange={e => updateWebsiteType(index, { basePrice: parseInt(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-[#A5A5A5] uppercase mb-1">
                          Included Pages
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={pkg.includedPages}
                          onChange={e => updateWebsiteType(index, { includedPages: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-[#A5A5A5] uppercase mb-1">
                          Extra Page (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={pkg.additionalPagePrice}
                          onChange={e => updateWebsiteType(index, { additionalPagePrice: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: CALCULATOR CEILING THRESHOLD */}
          <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#252525] pb-4">
              <DollarSign className="w-5 h-5 text-[#C7FF4D]" />
              <div>
                <h2 className="text-lg font-bold text-white">2. High Volume Page Threshold</h2>
                <p className="text-xs text-[#A5A5A5]">Maximum pages calculated by the automated engine before triggering a tailored enterprise consultation.</p>
              </div>
            </div>

            <div className="max-w-md p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-2">
              <label className="block text-xs font-mono text-[#A5A5A5] uppercase">
                Max Standard Pages Ceiling
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={config.maxStandardPages}
                  onChange={e => setConfig({ ...config, maxStandardPages: parseInt(e.target.value) || 30 })}
                  className="w-32 px-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                />
                <span className="text-xs text-[#A5A5A5]">Pages (Requests above this flag custom quote)</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADD-ON FEATURES */}
          <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-[#252525] pb-4">
              <Settings className="w-5 h-5 text-[#C7FF4D]" />
              <div>
                <h2 className="text-lg font-bold text-white">3. Add-on Features & Integrations ({config.features.length})</h2>
                <p className="text-xs text-[#A5A5A5]">Fixed one-time price in INR for optional website capabilities.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.features.map((feat, index) => (
                <div key={feat.id} className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white text-sm block">
                      {feat.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#A5A5A5] uppercase bg-[#0B0B0B] px-1.5 py-0.5 rounded border border-[#252525]">
                      {feat.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#777] line-clamp-2">{feat.description}</p>
                  <div className="relative pt-1">
                    <span className="absolute left-3 top-3.5 text-xs text-[#555] font-mono">₹</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={feat.price}
                      onChange={e => updateFeature(index, { price: parseInt(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: DESIGN TIERS & RECURRING MAINTENANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Design Tiers */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#252525] pb-3">
                <Palette className="w-5 h-5 text-[#C7FF4D]" />
                <h2 className="text-lg font-bold text-white">
                  4. Design Tiers Price Adjustment
                </h2>
              </div>
              <p className="text-xs text-[#A5A5A5]">
                Fixed price adjustment added to the base package for elevated visual craft.
              </p>
              
              <div className="space-y-3">
                {config.designTiers.map((tier, index) => (
                  <div key={tier.id} className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{tier.name}</span>
                      <span className="text-[10px] font-mono text-[#A5A5A5]">{tier.id}</span>
                    </div>
                    <p className="text-xs text-[#777]">{tier.description}</p>
                    <div className="relative pt-1">
                      <span className="absolute left-3 top-3.5 text-xs text-[#555] font-mono">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={tier.priceAdjustment}
                        onChange={e => updateDesignTier(index, { priceAdjustment: parseInt(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Options */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#252525] pb-3">
                <ShieldCheck className="w-5 h-5 text-[#C7FF4D]" />
                <h2 className="text-lg font-bold text-white">
                  5. Recurring Maintenance Plans
                </h2>
              </div>
              <p className="text-xs text-[#A5A5A5]">
                Ongoing fees billed per month or per year (kept separate from one-time build cost).
              </p>

              <div className="space-y-3">
                {config.maintenanceOptions.map((opt, index) => (
                  <div key={opt.id} className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{opt.name}</span>
                      <span className="text-[10px] font-mono text-[#C7FF4D] uppercase">{opt.period}</span>
                    </div>
                    <p className="text-xs text-[#777]">{opt.description}</p>
                    <div className="relative pt-1">
                      <span className="absolute left-3 top-3.5 text-xs text-[#555] font-mono">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={opt.amount}
                        onChange={e => updateMaintenance(index, { amount: parseInt(e.target.value) || 0 })}
                        className="w-full pl-7 pr-3 py-2 bg-[#0B0B0B] border border-[#252525] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#C7FF4D]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Save Bar */}
          <div className="pt-4 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
