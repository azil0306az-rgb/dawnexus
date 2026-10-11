import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  Loader2,
  Send,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { NotificationSettingsData } from '../../types';

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form states
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // UI flow states
  const [step, setStep] = useState<'idle' | 'otp_sent'>('idle');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Fetch persisted settings from backend
  const fetchSettings = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/notification-settings');
      if (!res.ok) {
        throw new Error('Failed to load notification settings.');
      }
      const data: NotificationSettingsData = await res.json();
      setSettings(data);
      if (data.pending_email && data.is_verified === 0) {
        setEmailInput(data.pending_email);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFetchError(error.message || 'Error connecting to settings API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Request OTP from backend
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusMessage(null);

    const emailToVerify = emailInput.trim().toLowerCase();
    if (!emailToVerify || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToVerify)) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/admin/notification-settings/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setStep('otp_sent');
      setCooldownSeconds(data.resend_cooldown_seconds || 60);
      setStatusMessage({
        type: 'success',
        text: data.message || `Verification code dispatched to ${emailToVerify}.`
      });
      // Refresh pending state
      fetchSettings();
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: error.message || 'Failed to send OTP.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP with backend
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const emailToVerify = emailInput.trim().toLowerCase();
    const otp = otpInput.trim();

    if (!/^\d{6}$/.test(otp)) {
      setStatusMessage({ type: 'error', text: 'Please enter a 6-digit numeric verification code.' });
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/admin/notification-settings/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToVerify, otp })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      setSettings(data.settings);
      setStep('idle');
      setOtpInput('');
      setIsChangingEmail(false);
      setStatusMessage({
        type: 'success',
        text: data.message || 'Email verified and activated successfully!'
      });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: error.message || 'Verification failed.' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Deactivate active recipient
  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/notification-settings/deactivate', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deactivate recipient.');
      }
      setSettings(data.settings);
      setShowDeactivateModal(false);
      setStep('idle');
      setEmailInput('');
      setOtpInput('');
      setIsChangingEmail(false);
      setStatusMessage({
        type: 'info',
        text: 'Notification recipient deactivated. Customer inquiries will continue to be safely stored in the database.'
      });
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({ type: 'error', text: error.message || 'Deactivation failed.' });
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4D] mx-auto" />
          <p className="text-xs font-mono text-[#A5A5A5]">Loading notification configuration...</p>
        </div>
      </div>
    );
  }

  const isVerified = settings?.is_verified === 1 && !!settings?.active_email;
  const isPending = !!settings?.pending_email && step === 'otp_sent';
  const providerConfigured = settings?.provider_status !== 'none';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="border-b border-[#252525] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-white tracking-tight">Notification Email</h2>
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified & Active
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                Verification Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
                Not Configured
              </span>
            )}
          </div>
          <p className="text-sm text-[#A5A5A5] mt-1">
            Configure the verified administrative email address that automatically receives real-time customer inquiry details.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B0B0B] border border-[#252525] text-xs font-medium text-[#A5A5A5] hover:text-white hover:border-[#444] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Provider Status Alert */}
      {!providerConfigured && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong className="font-semibold block mb-0.5">Email Delivery Provider Not Configured</strong>
            To enable live transactional dispatch on Vercel or localhost, set <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">RESEND_API_KEY</code> or <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">SMTP_*</code> environment variables. Customer inquiries are always preserved safely in the database.
          </div>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
            : statusMessage.type === 'error'
            ? 'bg-red-950/30 border-red-500/30 text-red-300'
            : 'bg-zinc-900/80 border-[#333] text-zinc-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          ) : (
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#C7FF4D]" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {fetchError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Active Verified Card */}
      {isVerified && !isChangingEmail && (
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#A5A5A5]">Active Verified Recipient</span>
              <div className="text-xl font-bold text-white flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-[#C7FF4D]" />
                <span>{settings.active_email}</span>
              </div>
              {settings.verified_at && (
                <p className="text-xs text-[#777] mt-1 font-mono">
                  Verified on: {new Date(settings.verified_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsChangingEmail(true);
                  setEmailInput('');
                  setStep('idle');
                  setStatusMessage(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#333] hover:border-[#555] text-xs font-semibold text-white transition-colors"
              >
                Change Address
              </button>

              <button
                onClick={() => setShowDeactivateModal(true)}
                className="px-4 py-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 text-xs font-semibold text-red-400 transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1C1C1C] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#A5A5A5]">
            <div className="p-3.5 rounded-xl bg-[#050505] border border-[#1A1A1A]">
              <span className="text-[#666] block mb-1">Inquiry Alerts</span>
              <span className="text-white font-medium">Automatic Dispatch Active</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050505] border border-[#1A1A1A]">
              <span className="text-[#666] block mb-1">Timezone</span>
              <span className="text-white font-medium">Asia/Kolkata (IST)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050505] border border-[#1A1A1A]">
              <span className="text-[#666] block mb-1">Security Standard</span>
              <span className="text-[#C7FF4D] font-medium">Cryptographic OTP Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration / Verification Flow */}
      {(!isVerified || isChangingEmail) && (
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {isChangingEmail ? 'Configure Replacement Notification Address' : 'Set Up Notification Email'}
            </h3>
            {isChangingEmail && (
              <button
                onClick={() => {
                  setIsChangingEmail(false);
                  setStep('idle');
                  setStatusMessage(null);
                }}
                className="text-xs text-[#A5A5A5] hover:text-white underline"
              >
                Cancel & Keep Active Recipient
              </button>
            )}
          </div>

          {isChangingEmail && isVerified && (
            <div className="p-3.5 rounded-xl bg-[#161616] border border-[#252525] text-xs text-[#A5A5A5] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C7FF4D] shrink-0" />
              <span>
                Your current active recipient (<strong className="text-white">{settings.active_email}</strong>) will continue receiving all alerts until the new address is verified with OTP.
              </span>
            </div>
          )}

          {step === 'idle' ? (
            /* Step 1: Enter Email & Request OTP */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                  Alert Recipient Email Address <span className="text-[#C7FF4D]">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                    <input
                      type="email"
                      placeholder="e.g. alerts@yourdomain.com"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      className="w-full bg-[#050505] border border-[#252525] focus:border-[#C7FF4D] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification OTP</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#777]">
                  A 6-digit numeric verification code with a 5-minute expiry will be dispatched to confirm address ownership.
                </p>
              </div>
            </form>
          ) : (
            /* Step 2: Enter & Verify OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-4 rounded-xl bg-[#050505] border border-[#202020] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A5A5A5]">Verification target:</span>
                  <strong className="text-white font-mono">{emailInput}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-[#777]">
                  <span>Code expiration:</span>
                  <span className="text-[#C7FF4D] font-mono font-medium">5 minutes</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                  Enter 6-Digit Verification Code <span className="text-[#C7FF4D]">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full sm:w-56 bg-[#050505] border border-[#252525] focus:border-[#C7FF4D] rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-white placeholder-[#444] focus:outline-none transition-colors"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpInput.length !== 6}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Activate</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('idle');
                    setOtpInput('');
                    setStatusMessage(null);
                  }}
                  className="text-[#A5A5A5] hover:text-white"
                >
                  &larr; Change Email
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  disabled={cooldownSeconds > 0 || isSendingOtp}
                  className="text-[#C7FF4D] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed font-medium"
                >
                  {cooldownSeconds > 0 ? `Resend Code (${cooldownSeconds}s)` : 'Resend Verification Code'}
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* Security & Reliability Information Box */}
      <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 space-y-3 text-xs text-[#A5A5A5]">
        <h4 className="font-mono uppercase tracking-wider text-white font-semibold">
          Architecture & Security Safeguards:
        </h4>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong>Zero Unverified Alerts:</strong> Inquiries are only transmitted to persisted, backend-verified email recipients.</li>
          <li><strong>HMAC Hashing:</strong> Verification codes are never stored in plaintext and expire automatically in 5 minutes.</li>
          <li><strong>Brute-Force Protection:</strong> Maximum 5 failed attempts per challenge and a 60-second resend cooldown are strictly enforced.</li>
          <li><strong>Database Redundancy:</strong> All inquiries are committed to the SQLite database prior to email dispatch. Email failures never affect database records.</li>
        </ul>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Deactivate Email Alerts?</h3>
                <p className="text-xs text-[#A5A5A5]">Please confirm this administrative action.</p>
              </div>
            </div>

            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Deactivating will immediately remove <strong className="text-white">{settings?.active_email}</strong> as the active recipient. Future customer inquiries will continue to be securely stored in the database but will not trigger email alerts until a new address is verified.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeactivateModal(false)}
                disabled={isDeactivating}
                className="px-4 py-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#333] text-xs font-semibold text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                {isDeactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Deactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
