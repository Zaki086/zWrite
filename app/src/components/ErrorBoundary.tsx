import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen bg-background p-8">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60 text-muted-foreground">
              {this.state.error?.message}
              {'\n'}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
