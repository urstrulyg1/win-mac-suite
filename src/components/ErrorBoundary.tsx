import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App ErrorBoundary Caught]', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans">
          <div className="max-w-xl w-full card p-8 shadow-2xl border border-rose-500/30 rounded-3xl space-y-6 bg-slate-900/90 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div>
                <span className="pill text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/25 uppercase font-bold tracking-wider">
                  Production Safe Recovery
                </span>
                <h2 className="text-xl font-extrabold mt-1">Application Boundary Catch</h2>
                <p className="text-xs text-slate-400">A component encountered an unhandled render state and was safely contained.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 overflow-auto max-h-48 text-rose-300">
              <p className="font-bold text-rose-400">{this.state.error?.name || 'Error'}: {this.state.error?.message}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.trim().slice(0, 500)}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">Your system state and reports are safe.</span>
              <button
                onClick={this.handleReset}
                className="btn btn-primary text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw size={13} />
                <span>Recover &amp; Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
