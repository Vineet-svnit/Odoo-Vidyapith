'use client'

import LoadingSpinner from './LoadingSpinner'

/**
 * Loading Overlay Component
 * Displays a full-screen or container-level loading overlay
 * Requirements: 15.3
 */
export default function LoadingOverlay({ 
  show = false, 
  message = 'Loading...', 
  fullScreen = false,
  transparent = false 
}) {
  if (!show) return null

  const overlayStyle = {
    position: fullScreen ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: transparent ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: fullScreen ? 9999 : 10,
    backdropFilter: transparent ? 'blur(2px)' : 'none'
  }

  return (
    <div style={overlayStyle}>
      <LoadingSpinner message={message} size="large" />
    </div>
  )
}
