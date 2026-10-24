import React, { useState, useEffect } from 'react';
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
  Globe
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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
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
        if (data.settings) {
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
        }
      } else {
        setError('Failed to load contact settings from server.');
      }
    } catch {
      setError('Network connection error while fetching contact settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!settings.phone.trim()) {
      setError('Please provide a contact phone number.');
      setIsSaving(false);
      return;
    }
    if (!settings.email.trim() || !settings.email.includes('@')) {
      setError('Please provide a valid contact email address.');
      setIsSaving(false);
      return;
    }
    if (!settings.instagram_url.trim()) {
      setError('Please provide an Instagram profile URL.');
      setIsSaving(false);
      return;
    }
    if (!settings.facebook_url.trim()) {
      setError('Please provide a Facebook page URL.');
      setIsSaving(false);
      return;
    }
    if (!settings.linkedin_url.trim()) {
      setError('Please provide a LinkedIn profile or company URL.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/contact-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Contact details and social links updated successfully!');
        if (data.settings) {
          setSettings(data.settings);
          setInitialSettings(data.settings);
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(data.error || 'Failed to save contact settings.');
      }
    } catch {
      setError('Network error while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all contact and social settings to official Dawnexus defaults?')) {
      setSettings(DEFAULT_SETTINGS);
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
            Configure official contact phone numbers, email addresses, social media channel URLs, and optional office address rendered across the public website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] text-[#A5A5A5] hover:text-white border border-[#252525] text-xs font-mono transition-colors"
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

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+91 95669 88995"
                  className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#777]">
                Used for instant click-to-call links (<code className="text-[#A5A5A5]">tel:{settings.phone}</code>). Accepts Indian or international format.
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
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="contact@dawnexus.in"
                  className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#777]">
                Used for mailto triggers and client enquiry correspondence.
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
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Coimbatore, Tamil Nadu, India"
                  className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors resize-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#777]">
                Leave blank if you prefer not to display a physical address on the public footer and contact page.
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
                onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, linkedin_url: e.target.value })}
                placeholder="https://www.linkedin.com/company/dawnexus"
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors font-mono"
                required
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-[#777] font-mono">
              {settings.updated_at && (
                <span>Last updated: {new Date(settings.updated_at).toLocaleString()}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Contact Settings</span>
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
                Instant Sync
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
                  <div className="text-sm font-bold text-white truncate">{settings.phone || '—'}</div>
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
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center text-pink-400 hover:border-pink-500/50 transition-colors">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center text-blue-400 hover:border-blue-500/50 transition-colors">
                    <FacebookIcon className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#282828] flex items-center justify-center text-sky-400 hover:border-sky-500/50 transition-colors">
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
                  <InstagramIcon className="w-4 h-4 text-white hover:text-[#C7FF4D]" />
                  <FacebookIcon className="w-4 h-4 text-white hover:text-[#C7FF4D]" />
                  <LinkedInIcon className="w-4 h-4 text-white hover:text-[#C7FF4D]" />
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>You have unsaved changes. Click Save to publish.</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
