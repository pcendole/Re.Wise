import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public handleRecovery = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-theme-primary flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm p-6 rounded-3xl border border-theme bg-card-theme shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-theme-primary tracking-tight">Something went wrong</h2>
              <p className="text-xs text-theme-secondary">An unexpected error occurred while rendering this screen.</p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-2xl bg-canvas border border-theme text-left overflow-x-auto max-h-32">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleRecovery}
              className="w-full py-3 px-4 rounded-2xl bg-forest hover:opacity-90 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
