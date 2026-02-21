'use client'

import ErrorBoundary from './ErrorBoundary'

/**
 * Page-level Error Boundary
 * Wraps entire pages with error handling
 * Requirements: 15.4
 */
export default function PageErrorBoundary({ children, showDetails = false }) {
  return (
    <ErrorBoundary 
      showDetails={showDetails || process.env.NODE_ENV === 'development'}
      fallback={
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '3rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              ⚠️
            </div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '1rem',
              color: '#333'
            }}>
              Oops! Something went wrong
            </h1>
            <p style={{
              textAlign: 'center',
              color: '#666',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196f3'}
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#2196f3',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
