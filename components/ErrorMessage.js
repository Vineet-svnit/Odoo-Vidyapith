'use client'

export default function ErrorMessage({ 
  message, 
  title = 'Error', 
  type = 'error',
  onRetry,
  onDismiss 
}) {
  const types = {
    error: {
      bg: '#ffebee',
      border: '#f44336',
      color: '#c62828',
      icon: '❌'
    },
    warning: {
      bg: '#fff3e0',
      border: '#ff9800',
      color: '#e65100',
      icon: '⚠️'
    },
    info: {
      bg: '#e3f2fd',
      border: '#2196f3',
      color: '#1565c0',
      icon: 'ℹ️'
    },
    success: {
      bg: '#e8f5e9',
      border: '#4caf50',
      color: '#2e7d32',
      icon: '✓'
    }
  }

  const config = types[type] || types.error

  return (
    <div style={{
      backgroundColor: config.bg,
      border: `1px solid ${config.border}`,
      borderLeft: `4px solid ${config.border}`,
      borderRadius: '4px',
      padding: '1rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem'
    }}>
      <div style={{
        fontSize: '1.25rem',
        flexShrink: 0
      }}>
        {config.icon}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: '600',
          color: config.color,
          marginBottom: '0.25rem',
          fontSize: '0.875rem'
        }}>
          {title}
        </div>
        
        <div style={{
          color: config.color,
          fontSize: '0.875rem',
          lineHeight: '1.5'
        }}>
          {message}
        </div>

        {(onRetry || onDismiss) && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '0.75rem'
          }}>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: config.border,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: config.color,
                  border: `1px solid ${config.border}`,
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: config.color,
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0',
            lineHeight: '1',
            flexShrink: 0
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}
