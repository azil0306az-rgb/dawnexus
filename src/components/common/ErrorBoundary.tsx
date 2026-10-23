import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  resetButtonText?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Admin Component Error Boundary Caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0D0D0D] border border-red-500/30 rounded-2xl p-8 max-w-2xl mx-auto my-12 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">
              {this.props.fallbackTitle || 'An unexpected rendering error occurred'}
            </h3>
            <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              The requested view could not be displayed. Your existing data in the database remains safe and untouched.
            </p>
            {this.state.error?.message && (
              <div className="mt-3 p-3 bg-black/60 rounded-lg border border-[#252525] text-xs font-mono text-red-300 max-w-lg mx-auto text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#C7FF4D] hover:bg-[#d6ff73] text-black font-semibold text-xs rounded-xl transition shadow-lg shadow-[#C7FF4D]/10 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            {this.props.onReset && (
              <button
                type="button"
                onClick={this.props.onReset}
                className="flex items-center space-x-2 px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-neutral-300 hover:text-white font-medium text-xs rounded-xl border border-[#333] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{this.props.resetButtonText || 'Return'}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

