'use client'

export default function KPICard({ title, value, subtitle, icon, color = 'blue' }) {
  const colorClasses = {
    blue: { bg: '#e3f2fd', border: '#2196f3', text: '#1976d2' },
    orange: { bg: '#fff3e0', border: '#ff9800', text: '#f57c00' },
    green: { bg: '#e8f5e9', border: '#4caf50', text: '#388e3c' },
    purple: { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' }
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div style={{
      backgroundColor: 'white',
      border: `2px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '1.5rem',
      minHeight: '140px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#666', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
            {title}
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: colors.text,
            lineHeight: '1'
          }}>
            {value}
          </div>
        </div>
        {icon && (
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: colors.bg,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            {icon}
          </div>
        )}
      </div>
      {subtitle && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#999',
          marginTop: '0.5rem'
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
