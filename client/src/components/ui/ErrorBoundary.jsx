import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ResQ ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-md mx-auto my-12 bg-surface border border-[#FDA29B] rounded-lg text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FDF2F2] border border-[#FDA29B] flex items-center justify-center text-[#B42318]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-navy-ink uppercase tracking-wide">
              Interface Render Exception
            </h2>
            <p className="text-xs text-muted-text mt-1">
              A temporary runtime error occurred while rendering this operational view.
            </p>
          </div>
          <div className="p-2.5 bg-[#FAF9F6] border border-app-border rounded text-[11px] font-mono text-muted-text text-left overflow-x-auto max-h-24">
            {this.state.error?.message || 'Unknown error'}
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={this.handleReset}
            className="w-full"
          >
            Reload Module
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
