import React, { useState, useEffect } from 'react';
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
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';
import type { 
  CalculatorPricingConfig, 
  WebsiteTypeConfig, 
  FeatureConfig, 
  DesignTierConfig, 
  MaintenanceOptionConfig 
} from '../../types';

export const CalculatorSettings: React.FC = () => {
  const [config, setConfig] = useState<CalculatorPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <p className="font-mono text-sm">Loading Estimator Configuration...</p>
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
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252525]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/20">
              VERSION 5.8
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Website Cost Estimator Pricing
            </h1>
          </div>
          <p className="text-sm text-[#A5A5A5] mt-1 font-normal">
            Configure base prices, included pages, extra page rates, feature costs, design tier adjustments, and maintenance plans in INR (₹).
          </p>
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
                <span>Saved to Database!</span>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#071305] border border-[#C7FF4D]/40 text-[#C7FF4D] text-sm flex items-center gap-3 font-mono">
          <Check className="w-5 h-5 shrink-0" />
          <span>Estimator pricing rules updated successfully and applied in real-time.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* SECTION 1: WEBSITE TYPES & BASE PACKAGES */}
        <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#252525] pb-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#C7FF4D]" />
              <div>
                <h2 className="text-lg font-bold text-white">1. Website Type Packages ({config.websiteTypes.length})</h2>
                <p className="text-xs text-[#A5A5A5]">Define starting package cost, included pages, and per-page expansion rate.</p>
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
    </div>
  );
};
