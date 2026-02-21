'use client'

import { Component } from 'react'
import ErrorMessage from './ErrorMessage'

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Requirements: 15.4
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // You can also log the error to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '2rem auto'
        }}>
          <ErrorMessage
            title="Something went wrong"
            message={
              this.props.showDetails && this.state.error
                ? this.state.error.toString()
                : "We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists."
            }
            type="error"
            onRetry={this.handleReset}
          />

          {this.props.showDetails && this.state.errorInfo && (
            <details style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              overflow: 'auto'
            }}>
              <summary style={{ 
                cursor: 'pointer', 
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Error Details (for developers)
              </summary>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
