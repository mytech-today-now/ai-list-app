/**
 * Error Boundary Component - Catches and handles React errors gracefully
 * SemanticType: ErrorBoundaryComponent
 * ExtensibleByAI: true
 * AIUseCases: ["Error handling", "Fallback UI", "Error reporting", "Recovery actions"]
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useSecurity } from '../../contexts/SecurityContext';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  enableRecovery?: boolean;
  level?: 'page' | 'section' | 'component';
}

/**
 * Error Boundary Class Component
 */
class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to error tracking service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      level: this.props.level || 'component'
    };

    // Send to logging service
    if (import.meta.env.PROD) {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  };

  private handleRecovery = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          showDetails={this.props.showDetails}
          enableRecovery={this.props.enableRecovery}
          level={this.props.level}
          onRecovery={this.handleRecovery}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 */
interface ErrorFallbackUIProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  showDetails?: boolean;
  enableRecovery?: boolean;
  level?: 'page' | 'section' | 'component';
  onRecovery: () => void;
  onReload: () => void;
}

const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  error,
  errorInfo,
  errorId,
  showDetails = false,
  enableRecovery = true,
  level = 'component',
  onRecovery,
  onReload
}) => {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);

  const getErrorIcon = () => {
    switch (level) {
      case 'page':
        return (
          <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'section':
        return (
          <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getErrorMessage = () => {
    switch (level) {
      case 'page':
        return 'Something went wrong with this page';
      case 'section':
        return 'This section encountered an error';
      default:
        return 'This component encountered an error';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${
      level === 'page' ? 'min-h-screen' : level === 'section' ? 'min-h-64' : 'min-h-32'
    }`}>
      <div className="mb-4">
        {getErrorIcon()}
      </div>
      
      <h2 className={`font-bold text-gray-900 mb-2 ${
        level === 'page' ? 'text-2xl' : level === 'section' ? 'text-xl' : 'text-lg'
      }`}>
        {getErrorMessage()}
      </h2>
      
      <p className="text-gray-600 mb-6 max-w-md">
        We apologize for the inconvenience. The error has been reported and we're working to fix it.
      </p>

      {errorId && (
        <p className="text-sm text-gray-500 mb-4">
          Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {enableRecovery && (
          <button
            type="button"
            onClick={onRecovery}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        )}
        
        <button
          type="button"
          onClick={onReload}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Reload Page
        </button>
      </div>

      {(showDetails || import.meta.env.DEV) && (
        <div className="w-full max-w-2xl">
          <button
            type="button"
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            {showErrorDetails ? 'Hide' : 'Show'} Error Details
          </button>
          
          {showErrorDetails && (
            <div className="bg-gray-100 p-4 rounded-md text-left text-sm">
              <div className="mb-3">
                <strong>Error:</strong>
                <pre className="mt-1 text-red-600 whitespace-pre-wrap">{error?.message}</pre>
              </div>
              
              {error?.stack && (
                <div className="mb-3">
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 text-gray-700 whitespace-pre-wrap text-xs overflow-x-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
              
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 text-gray-700 whitespace-pre-wrap text-xs overflow-x-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Functional Error Boundary Hook
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // Report error
    if (import.meta.env.PROD) {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  };
}

/**
 * Error Boundary with MCP integration
 */
export const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;
