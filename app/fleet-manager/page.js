'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'
import FilterBar from '@/components/FilterBar'

export default function FleetManagerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ vehicleType: '', status: '', region: '' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role !== 'FLEET_MANAGER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchKPIs()
    }
  }, [status, filters])

  const fetchKPIs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.vehicleType) params.append('vehicleType', filters.vehicleType)
      if (filters.status) params.append('status', filters.status)
      if (filters.region) params.append('region', filters.region)

      const response = await fetch(`/api/dashboard/kpis?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch KPIs')
      
      const data = await response.json()
      setKpis(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'FLEET_MANAGER') {
    return null
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: 'red', padding: '1rem', backgroundColor: '#fee', borderRadius: '4px' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Fleet Manager Dashboard</h1>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            {session.user.email}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        <FilterBar filters={filters} onFilterChange={setFilters} />

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <KPICard
            title="Active Fleet"
            value={kpis?.activeFleet ?? 0}
            subtitle="Vehicles currently on trips"
            icon="🚚"
            color="blue"
          />
          <KPICard
            title="Maintenance Alerts"
            value={kpis?.maintenanceAlerts ?? 0}
            subtitle="Vehicles in shop"
            icon="🔧"
            color="orange"
          />
          <KPICard
            title="Utilization Rate"
            value={kpis?.utilizationRate ? `${kpis.utilizationRate.toFixed(1)}%` : '0%'}
            subtitle="Fleet efficiency"
            icon="📊"
            color="green"
          />
          <KPICard
            title="Pending Cargo"
            value={kpis?.pendingCargo ?? 0}
            subtitle="Awaiting assignment"
            icon="📦"
            color="purple"
          />
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/fleet-manager/vehicles')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Manage Vehicles
            </button>
            <button
              onClick={() => router.push('/fleet-manager/drivers')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Manage Drivers
            </button>
            <button
              onClick={() => router.push('/fleet-manager/maintenance')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Maintenance Logs
            </button>
            <button
              onClick={() => router.push('/fleet-manager/analytics')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Analytics & Reports
            </button>
            <button
              onClick={() => router.push('/fleet-manager/audit-logs')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Audit Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
