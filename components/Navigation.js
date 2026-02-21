'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!session) return null

  const getNavigationItems = () => {
    const role = session.user.role

    if (role === 'FLEET_MANAGER') {
      return [
        { label: 'Dashboard', path: '/fleet-manager' },
        { label: 'Vehicles', path: '/fleet-manager/vehicles' },
        { label: 'Drivers', path: '/fleet-manager/drivers' },
        { label: 'Maintenance', path: '/fleet-manager/maintenance' },
        { label: 'Analytics', path: '/fleet-manager/analytics' },
        { label: 'Audit Logs', path: '/fleet-manager/audit-logs' }
      ]
    } else if (role === 'DISPATCHER') {
      return [
        { label: 'Dashboard', path: '/dispatcher' },
        { label: 'Dispatch', path: '/dispatcher/dispatch' },
        { label: 'Trips', path: '/dispatcher/trips' },
        { label: 'Expenses', path: '/dispatcher/expenses' }
      ]
    } else if (role === 'DRIVER') {
      return [
        { label: 'Dashboard', path: '/driver' },
        { label: 'My Trips', path: '/driver/trips' }
      ]
    }

    return []
  }

  const navItems = getNavigationItems()

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e0e0e0',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px'
      }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div
            onClick={() => router.push('/dashboard')}
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#2196f3',
              cursor: 'pointer'
            }}
          >
            FleetFlow
          </div>

          {/* Desktop Navigation */}
          <div style={{
            display: 'none',
            gap: '0.5rem',
            '@media (min-width: 768px)': { display: 'flex' }
          }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: pathname === item.path ? '#e3f2fd' : 'transparent',
                  color: pathname === item.path ? '#1565c0' : '#666',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: pathname === item.path ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'none',
            flexDirection: 'column',
            alignItems: 'flex-end',
            '@media (min-width: 768px)': { display: 'flex' }
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              {session.user.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {session.user.role.replace('_', ' ')}
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Sign Out
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'block',
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              '@media (min-width: 768px)': { display: 'none' }
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          borderTop: '1px solid #e0e0e0',
          padding: '1rem',
          backgroundColor: 'white'
        }}>
          <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
              {session.user.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {session.user.role.replace('_', ' ')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  router.push(item.path)
                  setMobileMenuOpen(false)
                }}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: pathname === item.path ? '#e3f2fd' : 'transparent',
                  color: pathname === item.path ? '#1565c0' : '#666',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: pathname === item.path ? '600' : '400',
                  textAlign: 'left'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
