import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password.trim()) {
      setErrorMessage('Please enter the administrative password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify password.');
      }

      // Login success
      onLoginSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Authentication error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 bg-grid-pattern relative">
      {/* Decorative ambient gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#C7FF4D]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-[#0B0B0B] border border-[#252525] rounded-2xl p-8 sm:p-10 shadow-2xl relative z-10">
        
        {/* Back Link */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-[#A5A5A5] hover:text-[#C7FF4D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Website</span>
          </a>
        </div>

        {/* Brand Icon and Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#050505] border border-[#252525] p-3 flex items-center justify-center mb-5 glow-lime-subtle">
            <img
              src="/brand/dawnexus-d-symbol.png"
              alt="Dawnexus D Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dawnexus Admin
          </h1>
          <p className="text-sm text-[#A5A5A5] mt-1.5 font-normal">
            Sign in to manage your enquiries.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
              Administrative Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter password..."
                disabled={isLoading}
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3.5 pr-11 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A5A5A5] hover:text-white transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#A5A5A5] font-mono">
              Local development initial key configured in backend environment.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.99] transition-all glow-lime-hover shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#252525] text-center text-xs text-[#A5A5A5] font-mono">
          Protected Administrative Area
        </div>
      </div>
    </div>
  );
};

