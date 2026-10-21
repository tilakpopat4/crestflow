import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  declare public props: Props;
  public state: State;
  declare public setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

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
          <div className="min-h-[320px] flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-center space-y-4">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto">
                <RefreshCw size={20} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Updating to latest version
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A newer version of CrestFlow is available. Reloading workspace...
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors duration-120 cursor-pointer border-0"
              >
                <RefreshCw size={13} />
                Refresh Now
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[320px] flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mx-auto">
              <AlertTriangle size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {this.props.fallbackTitle || 'Something went wrong rendering this view'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                An unexpected display error occurred. Your saved data is secure in the database.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-left">
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
