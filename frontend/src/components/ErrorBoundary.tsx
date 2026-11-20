import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global React Error Boundary — catches any uncaught render exception and
 * displays an accessible recovery UI instead of a blank white screen.
 * Required by ACCESSPREP-X Section 6: Error Handling.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ACCESSPREP-X] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen flex items-center justify-center bg-slate-50 p-6"
        >
          <div className="max-w-lg w-full bg-white border-2 border-red-300 rounded-2xl p-8 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  ACCESSPREP-X — Application Error
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  An unexpected error occurred. Your session data is preserved.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs font-mono text-red-900 break-words">
                <p className="font-bold mb-1">Error Details:</p>
                <p>{this.state.error.message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-5 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-400"
                aria-label="Try to recover the application"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="flex-1 py-2.5 px-5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-slate-400"
                aria-label="Reload the application from the beginning"
              >
                Reload Portal
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              If this problem persists, please clear your browser cache and reload.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

