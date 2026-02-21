'use client'

export default function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
  const sizes = {
    small: { spinner: '20px', border: '2px' },
    medium: { spinner: '40px', border: '4px' },
    large: { spinner: '60px', border: '6px' }
  }

  const { spinner, border } = sizes[size] || sizes.medium

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem'
    }}>
      <div
        style={{
          width: spinner,
          height: spinner,
          border: `${border} solid #f3f3f3`,
          borderTop: `${border} solid #2196f3`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      {message && (
        <div style={{
          fontSize: '0.875rem',
          color: '#666',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
