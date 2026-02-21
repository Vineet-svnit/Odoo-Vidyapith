'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'

export default function DispatcherDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [kpis, setKpis] = useState(null)
  const [activeTrips, setActiveTrips] = useState([])
  const [pendingCargo, setPendingCargo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role !== 'DISPATCHER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch KPIs
      const kpiResponse = await fetch('/api/dashboard/kpis')
      if (!kpiResponse.ok) throw new Error('Failed to fetch KPIs')
      const kpiData = await kpiResponse.json()
      setKpis(kpiData)

      // Fetch active trips (IN_PROGRESS and DISPATCHED)
      const activeTripsResponse = await fetch('/api/trips?status=IN_PROGRESS,DISPATCHED')
      if (!activeTripsResponse.ok) throw new Error('Failed to fetch active trips')
      const activeTripsData = await activeTripsResponse.json()
      setActiveTrips(activeTripsData.data || [])

      // Fetch pending cargo (DRAFT status)
      const pendingCargoResponse = await fetch('/api/trips?status=DRAFT')
      if (!pendingCargoResponse.ok) throw new Error('Failed to fetch pending cargo')
      const pendingCargoData = await pendingCargoResponse.json()
      setPendingCargo(pendingCargoData.data || [])

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

  if (!session || session.user.role !== 'DISPATCHER') {
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Dispatcher Dashboard</h1>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            {session.user.email}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {/* KPI Cards */}
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
            title="Pending Cargo"
            value={kpis?.pendingCargo ?? 0}
            subtitle="Awaiting assignment"
            icon="📦"
            color="purple"
          />
          <KPICard
            title="Utilization Rate"
            value={kpis?.utilizationRate ? `${kpis.utilizationRate.toFixed(1)}%` : '0%'}
            subtitle="Fleet efficiency"
            icon="📊"
            color="green"
          />
        </div>

        {/* Active Trips List */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Active Trips</h2>
            <button
              onClick={() => router.push('/dispatcher/trips')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              View All Trips
            </button>
          </div>
          
          {activeTrips.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No active trips
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Trip ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Origin</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Destination</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.slice(0, 5).map((trip) => (
                    <tr 
                      key={trip.id}
                      style={{ borderBottom: '1px solid #e0e0e0', cursor: 'pointer' }}
                      onClick={() => router.push(`/dispatcher/trips/${trip.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.id.slice(0, 8)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.origin}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.destination}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: trip.status === 'IN_PROGRESS' ? '#fff3e0' : '#e3f2fd',
                          color: trip.status === 'IN_PROGRESS' ? '#e65100' : '#1565c0',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {trip.status === 'IN_PROGRESS' ? 'In Progress' : 'Dispatched'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Cargo List */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Pending Cargo</h2>
            <button
              onClick={() => router.push('/dispatcher/dispatch')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Create New Trip
            </button>
          </div>
          
          {pendingCargo.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No pending cargo
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Trip ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Origin</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Destination</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Cargo Weight</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCargo.slice(0, 5).map((trip) => (
                    <tr 
                      key={trip.id}
                      style={{ borderBottom: '1px solid #e0e0e0' }}
                    >
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.id.slice(0, 8)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.origin}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.destination}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.cargoWeight} kg</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <button
                          onClick={() => router.push(`/dispatcher/dispatch?tripId=${trip.id}`)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
