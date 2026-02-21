'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusPill from '@/components/StatusPill'

export default function DriverDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trips, setTrips] = useState([])
  const [driverProfile, setDriverProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role !== 'DRIVER') {
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
      
      // Fetch driver's assigned trips
      const tripsResponse = await fetch('/api/trips')
      if (!tripsResponse.ok) throw new Error('Failed to fetch trips')
      const tripsData = await tripsResponse.json()
      setTrips(tripsData.data || [])

      // Fetch driver profile
      if (session?.user?.driverId) {
        const profileResponse = await fetch(`/api/drivers/${session.user.driverId}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setDriverProfile(profileData.data)
        }
      }

      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getLicenseExpiryWarning = () => {
    if (!driverProfile?.licenseExpiry) return null
    
    const expiryDate = new Date(driverProfile.licenseExpiry)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry <= 0) {
      return { type: 'error', message: 'Your license has expired!' }
    } else if (daysUntilExpiry <= 30) {
      return { type: 'warning', message: `Your license expires in ${daysUntilExpiry} days` }
    }
    return null
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'DRIVER') {
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

  const licenseWarning = getLicenseExpiryWarning()
  const activeTrips = trips.filter(t => ['DISPATCHED', 'IN_PROGRESS'].includes(t.status))
  const completedTrips = trips.filter(t => t.status === 'COMPLETED')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Driver Dashboard</h1>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            {session.user.email}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {/* License Expiry Warning */}
        {licenseWarning && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: licenseWarning.type === 'error' ? '#ffebee' : '#fff3e0',
            color: licenseWarning.type === 'error' ? '#c62828' : '#e65100',
            borderRadius: '8px',
            border: `1px solid ${licenseWarning.type === 'error' ? '#ef5350' : '#ff9800'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span style={{ fontWeight: '500' }}>{licenseWarning.message}</span>
          </div>
        )}

        {/* Driver Profile Summary */}
        {driverProfile && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              {driverProfile.firstName} {driverProfile.lastName}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Status</div>
                <StatusPill status={driverProfile.status} type="driver" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Number</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{driverProfile.licenseNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Category</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{driverProfile.licenseCategory}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Expiry</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {new Date(driverProfile.licenseExpiry).toLocaleDateString()}
                </div>
              </div>
              {driverProfile.safetyScore !== null && driverProfile.safetyScore !== undefined && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Safety Score</div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold',
                    color: driverProfile.safetyScore >= 80 ? '#2e7d32' : driverProfile.safetyScore >= 60 ? '#e65100' : '#c62828'
                  }}>
                    {driverProfile.safetyScore.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Trips */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            My Active Trips ({activeTrips.length})
          </h2>
          
          {activeTrips.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No active trips assigned
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeTrips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => router.push(`/driver/trips/${trip.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9f9f9'
                    e.currentTarget.style.borderColor = '#2196f3'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.borderColor = '#e0e0e0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Trip ID</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.id.slice(0, 8)}</div>
                    </div>
                    <StatusPill status={trip.status} type="trip" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Origin</div>
                      <div style={{ fontSize: '0.875rem' }}>{trip.origin}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Destination</div>
                      <div style={{ fontSize: '0.875rem' }}>{trip.destination}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Cargo Weight</div>
                      <div style={{ fontSize: '0.875rem' }}>{trip.cargoWeight} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Vehicle</div>
                      <div style={{ fontSize: '0.875rem' }}>
                        {trip.vehicle ? `${trip.vehicle.name} (${trip.vehicle.licensePlate})` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed Trips */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Recent Completed Trips
          </h2>
          
          {completedTrips.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              No completed trips yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Trip ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Origin</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Destination</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Completed</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTrips.slice(0, 5).map((trip) => (
                    <tr 
                      key={trip.id}
                      style={{ borderBottom: '1px solid #e0e0e0', cursor: 'pointer' }}
                      onClick={() => router.push(`/driver/trips/${trip.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.id.slice(0, 8)}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.origin}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trip.destination}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        {trip.actualEnd ? new Date(trip.actualEnd).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <StatusPill status={trip.status} type="trip" />
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
