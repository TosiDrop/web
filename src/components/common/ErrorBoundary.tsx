import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GradientButton } from './GradientButton';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <GradientButton className="mt-6" onClick={() => this.setState({ error: null })}>
            Try again
          </GradientButton>
        </div>
      );
    }
    return this.props.children;
  }
}
