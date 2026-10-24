import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Save, 
  RotateCcw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Globe,
  Database,
  Check
} from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedInIcon } from '../common/BrandSocialIcons';

export interface ContactSettingsData {
  phone: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  address?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: ContactSettingsData = {
  phone: '+91 95669 88995',
  email: 'contact@dawnexus.in',
  instagram_url: 'https://www.instagram.com/dawnexus',
  facebook_url: 'https://www.facebook.com/dawnexus',
  linkedin_url: 'https://www.linkedin.com/company/dawnexus',
  address: 'Coimbatore, Tamil Nadu, India'
};

export const ContactSettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<ContactSettingsData>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<ContactSettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'typing' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSettings();
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/contact-settings', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings && isMountedRef.current) {
          const loaded: ContactSettingsData = {
            phone: data.settings.phone || DEFAULT_SETTINGS.phone,
            email: data.settings.email || DEFAULT_SETTINGS.email,
            instagram_url: data.settings.instagram_url || DEFAULT_SETTINGS.instagram_url,
            facebook_url: data.settings.facebook_url || DEFAULT_SETTINGS.facebook_url,
            linkedin_url: data.settings.linkedin_url || DEFAULT_SETTINGS.linkedin_url,
            address: data.settings.address !== undefined ? data.settings.address : DEFAULT_SETTINGS.address,
            updated_at: data.settings.updated_at
          };
          setSettings(loaded);
          setInitialSettings(loaded);
          if (data.settings.updated_at) {
            setLastSavedAt(new Date(data.settings.updated_at));
          }
        }
      } else {
        setError('Failed to load contact settings from server.');
      }
    } catch {
      setError('Network connection error while fetching contact settings.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const performSave = async (payload: ContactSettingsData, isAuto = false) => {
    // Validation
    if (!payload.phone.trim()) {
      setError('Please provide a contact phone number.');
      setSaveStatus('error');
      return;
    }
    if (!payload.email.trim() || !payload.email.includes('@')) {
      setError('Please provide a valid contact email address.');
      setSaveStatus('error');
      return;
    }
    if (!payload.instagram_url.trim()) {
      setError('Please provide an Instagram profile URL.');
      setSaveStatus('error');
      return;
    }
    if (!payload.facebook_url.trim()) {
      setError('Please provide a Facebook page URL.');
      setSaveStatus('error');
      return;
    }
    if (!payload.linkedin_url.trim()) {
      setError('Please provide a LinkedIn profile or company URL.');
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      const res = await fetch('/api/admin/contact-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (isMountedRef.current) {
          setInitialSettings(data.settings || payload);
          setSaveStatus('saved');
          const savedDate = new Date();
          setLastSavedAt(savedDate);
          if (!isAuto) {
            setSuccessMessage('Contact details automatically saved and persisted to database!');
            setTimeout(() => {
              if (isMountedRef.current) setSuccessMessage(null);
            }, 4000);
          }
        }
      } else {
        if (isMountedRef.current) {
          setSaveStatus('error');
          setError(data.error || 'Failed to save contact settings to database.');
        }
      }
    } catch {
      if (isMountedRef.current) {
        setSaveStatus('error');
        setError('Network error while saving settings.');
      }
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  // Trigger debounced auto-save whenever user makes changes
  const updateField = (field: keyof ContactSettingsData, value: string) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    setSaveStatus('typing');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      performSave(updated, true);
    }, 1200);
  };

  const handleBlur = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const hasDiff = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    if (hasDiff && !isSaving) {
      performSave(settings, true);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    performSave(settings, false);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all contact and social settings to official Dawnexus defaults? This will automatically update the database.')) {
      setSettings(DEFAULT_SETTINGS);
      performSave(DEFAULT_SETTINGS, false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 text-[#C7FF4D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#252525] pb-6">
        <div>
          <div className="text-xs font-mono text-[#C7FF4D] uppercase tracking-wider mb-1">
            // CMS CHANNELS & IDENTITY
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Contact &amp; Social Settings
          </h2>
          <p className="text-sm text-[#A5A5A5] mt-1">
            Manage official phone numbers, email addresses, social profile links, and optional office address. Changes automatically save to the database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Database Sync Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0B0B] border border-[#252525] text-xs font-mono">
            {saveStatus === 'saving' || isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#C7FF4D] animate-spin" />
                <span className="text-[#C7FF4D]">Syncing to Database...</span>
              </>
            ) : saveStatus === 'typing' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400">Saving automatically...</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Sync Error</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-[#C7FF4D]" />
                <span className="text-zinc-300">Database Synced</span>
                <Check className="w-3 h-3 text-[#C7FF4D]" />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] text-[#A5A5A5] hover:text-white border border-[#252525] text-xs font-mono transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-[#C7FF4D]/10 border border-[#C7FF4D]/40 text-[#C7FF4D] text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Inputs */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Direct Communication Channels */}
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#202020] pb-3">
              <Phone className="w-4 h-4 text-[#C7FF4D]" />
              <span>Direct Communication</span>
            </h3>

            {/* Phone */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                Official Phone Number <span className="text-[#C7FF4D]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#C7FF4D]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="+91 95669 88995"
                  className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors font-mono"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#777]">
                Used for instant click-to-call links (<code className="text-[#A5A5A5]">tel:{settings.phone}</code>). Automatically updates on change.
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                Official Email Address <span className="text-[#C7FF4D]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#C7FF4D]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="contact@dawnexus.in"
                  className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors font-mono"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#777]">
                Used for mailto triggers, direct email cards, and client enquiries.
              </p>
            </div>

            {/* Address (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5]">
                  Office / Mailing Address
                </label>
                <span className="text-[11px] font-mono text-[#666]">(Optional)</span>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-3.5 pointer-events-none text-[#C7FF4D]">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  rows={3}
                  value={settings.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Coimbatore, Tamil Nadu, India"
                  className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors resize-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#777]">
                Optional physical location. Leave blank if you prefer not to display a physical address.
              </p>
            </div>
          </div>

          {/* Social Media Channels */}
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#202020] pb-3">
              <Globe className="w-4 h-4 text-[#C7FF4D]" />
              <span>Dedicated Social Profiles</span>
            </h3>

            {/* Instagram */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[#A5A5A5] flex items-center gap-1.5">
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                  <span>Instagram Profile URL</span>
                  <span className="text-[#C7FF4D]">*</span>
                </label>
                {settings.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-[#A5A5A5] hover:text-[#C7FF4D] inline-flex items-center gap-1"
                  >
                    <span>Test link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={settings.instagram_url}
                onChange={(e) => updateField('instagram_url', e.target.value)}
                onBlur={handleBlur}
                placeholder="https://www.instagram.com/dawnexus"
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors font-mono"
                required
              />
            </div>

            {/* Facebook */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[#A5A5A5] flex items-center gap-1.5">
                  <FacebookIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Facebook Page URL</span>
                  <span className="text-[#C7FF4D]">*</span>
                </label>
                {settings.facebook_url && (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-[#A5A5A5] hover:text-[#C7FF4D] inline-flex items-center gap-1"
                  >
                    <span>Test link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={settings.facebook_url}
                onChange={(e) => updateField('facebook_url', e.target.value)}
                onBlur={handleBlur}
                placeholder="https://www.facebook.com/dawnexus"
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors font-mono"
                required
              />
            </div>

            {/* LinkedIn */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[#A5A5A5] flex items-center gap-1.5">
                  <LinkedInIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>LinkedIn Profile / Company URL</span>
                  <span className="text-[#C7FF4D]">*</span>
                </label>
                {settings.linkedin_url && (
                  <a
                    href={settings.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-[#A5A5A5] hover:text-[#C7FF4D] inline-flex items-center gap-1"
                  >
                    <span>Test link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={settings.linkedin_url}
                onChange={(e) => updateField('linkedin_url', e.target.value)}
                onBlur={handleBlur}
                placeholder="https://www.linkedin.com/company/dawnexus"
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors font-mono"
                required
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-[#777] font-mono">
              {lastSavedAt ? (
                <span>Saved to database: {lastSavedAt.toLocaleTimeString()}</span>
              ) : settings.updated_at ? (
                <span>Last updated: {new Date(settings.updated_at).toLocaleString()}</span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Database</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 sticky top-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#C7FF4D] font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Live Public Preview</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] text-[#A5A5A5] border border-[#262626]">
                Automatic Sync
              </span>
            </div>

            {/* Preview: Contact Cards */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono uppercase text-[#777]">
                Contact Form Left Column Preview:
              </div>

              {/* Phone Card */}
              <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525] flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 flex items-center justify-center text-[#C7FF4D] shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-[#888] uppercase">Phone</div>
                  <div className="text-sm font-bold text-white truncate font-mono">{settings.phone || '—'}</div>
                </div>
              </div>

              {/* Email Card */}
              <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525] flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 flex items-center justify-center text-[#C7FF4D] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-[#888] uppercase">Email</div>
                  <div className="text-sm font-bold text-white truncate">{settings.email || '—'}</div>
                </div>
              </div>

              {/* Address Card (if present) */}
              {settings.address && settings.address.trim() && (
                <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 flex items-center justify-center text-[#C7FF4D] shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-[#888] uppercase">Location</div>
                    <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{settings.address}</div>
                  </div>
                </div>
              )}

              {/* Social Channels Pill Box */}
              <div className="p-3.5 rounded-xl bg-[#050505] border border-[#252525] space-y-2.5">
                <div className="text-[10px] font-mono text-[#888] uppercase">
                  Connected Social Channels:
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center text-pink-400">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center text-blue-400">
                    <FacebookIcon className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center text-sky-400">
                    <LinkedInIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview: Footer Appearance */}
            <div className="pt-2 border-t border-[#202020] space-y-2">
              <div className="text-[11px] font-mono uppercase text-[#777]">
                Footer Bottom Row Preview:
              </div>
              <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between gap-3 text-xs text-[#888]">
                <span>&copy; {new Date().getFullYear()} Dawnexus</span>
                <div className="flex items-center gap-3">
                  <InstagramIcon className="w-4 h-4 text-white" />
                  <FacebookIcon className="w-4 h-4 text-white" />
                  <LinkedInIcon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  {saveStatus === 'saving' || isSaving
                    ? 'Saving changes to database...'
                    : 'Changes queued. Saving to database...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
