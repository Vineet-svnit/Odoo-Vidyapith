'use client'

export default function StatusPill({ status, type = 'vehicle' }) {
  const getStatusConfig = () => {
    if (type === 'vehicle') {
      const configs = {
        AVAILABLE: { bg: '#e8f5e9', color: '#2e7d32', label: 'Available' },
        ON_TRIP: { bg: '#e3f2fd', color: '#1565c0', label: 'On Trip' },
        IN_SHOP: { bg: '#fff3e0', color: '#e65100', label: 'In Shop' },
        OUT_OF_SERVICE: { bg: '#ffebee', color: '#c62828', label: 'Out of Service' }
      }
      return configs[status] || { bg: '#f5f5f5', color: '#666', label: status }
    }
    
    if (type === 'driver') {
      const configs = {
        ON_DUTY: { bg: '#e8f5e9', color: '#2e7d32', label: 'On Duty' },
        OFF_DUTY: { bg: '#f5f5f5', color: '#666', label: 'Off Duty' },
        SUSPENDED: { bg: '#ffebee', color: '#c62828', label: 'Suspended' }
      }
      return configs[status] || { bg: '#f5f5f5', color: '#666', label: status }
    }

    if (type === 'trip') {
      const configs = {
        DRAFT: { bg: '#f5f5f5', color: '#666', label: 'Draft' },
        DISPATCHED: { bg: '#e3f2fd', color: '#1565c0', label: 'Dispatched' },
        IN_PROGRESS: { bg: '#fff3e0', color: '#e65100', label: 'In Progress' },
        COMPLETED: { bg: '#e8f5e9', color: '#2e7d32', label: 'Completed' },
        CANCELLED: { bg: '#ffebee', color: '#c62828', label: 'Cancelled' },
        ISSUE_REPORTED: { bg: '#fff3e0', color: '#d84315', label: 'Issue Reported' }
      }
      return configs[status] || { bg: '#f5f5f5', color: '#666', label: status }
    }

    return { bg: '#f5f5f5', color: '#666', label: status }
  }

  const config = getStatusConfig()

  return (
    <span style={{
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      backgroundColor: config.bg,
      color: config.color,
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '500'
    }}>
      {config.label}
    </span>
  )
}
