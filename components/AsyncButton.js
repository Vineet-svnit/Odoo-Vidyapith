'use client'

import { useState } from 'react'

/**
 * Async Button Component
 * Button with built-in loading state for async operations
 * Requirements: 15.3
 */
export default function AsyncButton({
  onClick,
  children,
  loading: externalLoading,
  disabled,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  type = 'button',
  ...props
}) {
  const [internalLoading, setInternalLoading] = useState(false)
  
  // Use external loading state if provided, otherwise use internal
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading

  const handleClick = async (e) => {
    if (isLoading || disabled) return

    // If onClick is async and no external loading state, manage internally
    if (onClick && externalLoading === undefined) {
      setInternalLoading(true)
      try {
        await onClick(e)
      } finally {
        setInternalLoading(false)
      }
    } else if (onClick) {
      onClick(e)
    }
  }

  const variants = {
    primary: {
      backgroundColor: '#2196f3',
      color: 'white',
      border: 'none',
      hoverBg: '#1976d2'
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#2196f3',
      border: '1px solid #2196f3',
      hoverBg: 'rgba(33, 150, 243, 0.1)'
    },
    danger: {
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      hoverBg: '#d32f2f'
    },
    success: {
      backgroundColor: '#4caf50',
      color: 'white',
      border: 'none',
      hoverBg: '#388e3c'
    }
  }

  const sizes = {
    small: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.75rem'
    },
    medium: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem'
    },
    large: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem'
    }
  }

  const variantStyle = variants[variant] || variants.primary
  const sizeStyle = sizes[size] || sizes.medium

  const buttonStyle = {
    ...sizeStyle,
    backgroundColor: variantStyle.backgroundColor,
    color: variantStyle.color,
    border: variantStyle.border,
    borderRadius: '4px',
    fontWeight: '500',
    cursor: (isLoading || disabled) ? 'not-allowed' : 'pointer',
    opacity: (isLoading || disabled) ? 0.6 : 1,
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: fullWidth ? '100%' : 'auto',
    position: 'relative',
    ...props.style
  }

  return (
    <button
      {...props}
      type={type}
      onClick={handleClick}
      disabled={isLoading || disabled}
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (!isLoading && !disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hoverBg
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading && !disabled) {
          e.currentTarget.style.backgroundColor = variantStyle.backgroundColor
        }
      }}
    >
      {isLoading && (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }}
        />
      )}
      {isLoading ? 'Loading...' : children}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}
