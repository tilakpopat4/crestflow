import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  resetKey?: string | null;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);

    const isChunkError =
      error?.message &&
      (error.message.includes('dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('Failed to fetch'));

    if (isChunkError && typeof window !== 'undefined') {
      const reloadKey = 'crestflow_error_boundary_chunk_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
      }
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message &&
        (this.state.error.message.includes('dynamically imported module') ||
          this.state.error.message.includes('Loading chunk') ||
          this.state.error.message.includes('Failed to fetch'));

      if (isChunkError) {
        return (
          <div className="min-h-[320px] flex items-center justify-center p-6 text-[#F7F7F8] dark:text-[#F7F7F8]">
            <div className="max-w-md w-full bg-[#131318] dark:bg-[#131318] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl p-6 shadow-sm text-center space-y-4">
              <div className="w-10 h-10 bg-surface-600 border border-surface-400 text-text-primary rounded-xl flex items-center justify-center mx-auto">
                <RefreshCw size={20} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">
                  Updating to latest version
                </h3>
                <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA]">
                  A newer version of CrestFlow is available. Reloading workspace...
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1B22] hover:bg-[#2A2A33] text-white rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0"
              >
                <RefreshCw size={13} />
                Refresh Now
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[320px] flex items-center justify-center p-6 text-[#F7F7F8] dark:text-[#F7F7F8]">
          <div className="max-w-md w-full bg-[#131318] dark:bg-[#0B0B0E] border border-[#2A2A33] dark:border-[#2A2A33] rounded-xl p-6 shadow-sm text-center space-y-4">
            <div className="w-11 h-11 bg-[#131318] dark:bg-[#1B1B22] text-[#E0002B] dark:text-[#F0607A] rounded-lg flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F7F7F8] dark:text-[#F7F7F8]">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h3>
              <p className="text-xs text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed">
                We ran into a temporary display issue. Your workspace data is safe and unaffected.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1B22] hover:bg-[#2A2A33] text-white rounded-lg text-xs font-medium transition-colors duration-120 cursor-pointer border-none"
              >
                <RefreshCw size={13} />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#131318] hover:bg-[#1B1B22] dark:bg-[#1B1B22] dark:hover:bg-[#2A2A33] text-[#A1A1AA] dark:text-[#F7F7F8] rounded-lg text-xs font-medium transition-colors duration-120 cursor-pointer border-none"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
