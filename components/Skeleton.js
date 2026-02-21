'use client'

/**
 * Skeleton Loader Component
 * Displays placeholder content while data is loading
 * Requirements: 15.3
 */
export default function Skeleton({ 
  width = '100%', 
  height = '20px', 
  variant = 'text',
  count = 1,
  style = {}
}) {
  const variants = {
    text: {
      height: '20px',
      borderRadius: '4px'
    },
    title: {
      height: '32px',
      borderRadius: '4px'
    },
    circular: {
      borderRadius: '50%'
    },
    rectangular: {
      borderRadius: '4px'
    },
    card: {
      height: '200px',
      borderRadius: '8px'
    }
  }

  const variantStyle = variants[variant] || variants.text

  const skeletonStyle = {
    width,
    height: variantStyle.height || height,
    backgroundColor: '#e0e0e0',
    borderRadius: variantStyle.borderRadius,
    animation: 'pulse 1.5s ease-in-out infinite',
    ...style
  }

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div key={i} style={skeletonStyle} />
  ))

  return (
    <>
      {count > 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {skeletons}
        </div>
      ) : (
        skeletons[0]
      )}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  )
}

/**
 * Table Skeleton Component
 * Displays a skeleton loader for tables
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
        padding: '1rem',
        borderBottom: '1px solid #e0e0e0'
      }}>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={`header-${i}`} height="16px" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1rem',
            padding: '1rem',
            borderBottom: '1px solid #f5f5f5'
          }}
        >
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} height="16px" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Card Skeleton Component
 * Displays a skeleton loader for cards
 */
export function CardSkeleton({ count = 1 }) {
  const card = (
    <div style={{
      padding: '1.5rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      <Skeleton variant="title" style={{ marginBottom: '1rem' }} />
      <Skeleton count={3} style={{ marginBottom: '0.5rem' }} />
    </div>
  )

  if (count === 1) return card

  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{card}</div>
      ))}
    </div>
  )
}
