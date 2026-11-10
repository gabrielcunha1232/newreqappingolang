import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  label: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Erro em ${this.props.label}:`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <strong>⚠ Erro em {this.props.label}</strong>
        <code>{error.message}</code>
        <button onClick={() => this.setState({ error: null })}>Tentar novamente</button>
      </div>
    );
  }
}
