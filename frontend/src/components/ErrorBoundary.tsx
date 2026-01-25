/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// =============================================================================
// Component
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="max-w-md text-muted-foreground">
              An unexpected error occurred. Please try refreshing the page or go back to the home page.
            </p>
            {this.state.error && (
              <p className="mt-4 text-sm text-destructive/80">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={this.handleGoHome} className="gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// =============================================================================
// Error State Component (for use outside error boundary)
// =============================================================================

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 p-8 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// Not Found State
// =============================================================================

interface NotFoundStateProps {
  title?: string
  message?: string
  onGoBack?: () => void
  className?: string
}

export function NotFoundState({
  title = 'Not found',
  message = "The page or resource you're looking for doesn't exist.",
  onGoBack,
  className,
}: NotFoundStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 p-8 text-center ${className}`}>
      <div className="text-6xl font-bold text-muted-foreground/20">404</div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onGoBack && (
        <Button variant="outline" size="sm" onClick={onGoBack} className="gap-2">
          <Home className="h-4 w-4" />
          Go Back
        </Button>
      )}
    </div>
  )
}

export default ErrorBoundary
