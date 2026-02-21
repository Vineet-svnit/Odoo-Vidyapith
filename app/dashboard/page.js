'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role) {
      // Redirect to role-specific dashboard
      if (session.user.role === 'FLEET_MANAGER') {
        router.push('/fleet-manager')
      } else if (session.user.role === 'DISPATCHER') {
        router.push('/dispatcher')
      } else if (session.user.role === 'DRIVER') {
        router.push('/driver')
      }
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>FleetFlow Dashboard</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2>Welcome, {session.user.email}</h2>
          <p>Role: <strong>{session.user.role}</strong></p>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#fff', 
          border: '1px solid #dee2e6',
          borderRadius: '8px'
        }}>
          <h3>Dashboard Content</h3>
          <p>This is a placeholder dashboard. The full dashboard implementation will be added in later tasks.</p>
        </div>
      </div>
    </div>
  )
}
