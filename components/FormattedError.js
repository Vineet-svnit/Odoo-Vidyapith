'use client'

import ErrorMessage from './ErrorMessage'
import { getErrorMessage, formatValidationErrors } from '@/lib/error-messages'

/**
 * Formatted Error Component
 * Displays errors with standardized formatting
 * Requirements: 15.4
 */
export default function FormattedError({ 
  error, 
  onRetry, 
  onDismiss,
  showDetails = false 
}) {
  if (!error) return null

  const { title, message, action, details } = getErrorMessage(error)

  return (
    <div>
      <ErrorMessage
        title={title}
        message={message}
        type="error"
        onRetry={action === 'Retry' ? onRetry : undefined}
        onDismiss={onDismiss}
      />

      {/* Display validation errors if present */}
      {details && (
        <div style={{
          marginTop: '0.5rem',
          padding: '1rem',
          backgroundColor: '#fff3e0',
          border: '1px solid #ff9800',
          borderRadius: '4px'
        }}>
          <div style={{
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#e65100',
            marginBottom: '0.5rem'
          }}>
            Validation Errors:
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            fontSize: '0.875rem',
            color: '#e65100'
          }}>
            {formatValidationErrors(details).map((err, index) => (
              <li key={index}>
                {err.field ? `${err.field}: ${err.message}` : err.message || err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show technical details in development */}
      {showDetails && process.env.NODE_ENV === 'development' && (
        <details style={{
          marginTop: '0.5rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        }}>
          <summary style={{ 
            cursor: 'pointer', 
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>
            Technical Details (Development Only)
          </summary>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
