'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusPill from '@/components/StatusPill'

export default function DriverDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [driver, setDriver] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role !== 'FLEET_MANAGER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && params.id) {
      fetchDriverData()
    }
  }, [status, params.id])

  const fetchDriverData = async () => {
    try {
      setLoading(true)
      
      const [driverRes, performanceRes, tripsRes] = await Promise.all([
        fetch(`/api/drivers/${params.id}`),
        fetch(`/api/drivers/${params.id}/performance`),
        fetch(`/api/trips?driverId=${params.id}`)
      ])

      if (!driverRes.ok) throw new Error('Failed to fetch driver')

      const driverData = await driverRes.json()
      const performanceData = performanceRes.ok ? await performanceRes.json() : null
      const tripsData = tripsRes.ok ? await tripsRes.json() : []

      setDriver(driverData)
      setPerformance(performanceData)
      setTrips(tripsData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isLicenseExpiringSoon = (expiryDate) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  const isLicenseExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date()
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'FLEET_MANAGER') {
    return null
  }

  if (error || !driver) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: 'red', padding: '1rem', backgroundColor: '#fee', borderRadius: '4px' }}>
          Error: {error || 'Driver not found'}
        </div>
      </div>
    )
  }

  const expired = isLicenseExpired(driver.licenseExpiry)
  const expiringSoon = isLicenseExpiringSoon(driver.licenseExpiry)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/fleet-manager/drivers')}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              marginRight: '1rem'
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {driver.firstName} {driver.lastName}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {(expired || expiringSoon) && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: expired ? '#ffebee' : '#fff3e0',
            color: expired ? '#c62828' : '#e65100',
            borderRadius: '8px',
            border: `1px solid ${expired ? '#ef5350' : '#ff9800'}`
          }}>
            <strong>⚠️ License Alert:</strong> {expired 
              ? 'This driver\'s license has expired and they cannot be assigned to trips.'
              : 'This driver\'s license expires within 30 days. Please ensure renewal.'}
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Driver Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Email</div>
              <div style={{ fontWeight: '500' }}>{driver.user?.email || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Number</div>
              <div style={{ fontWeight: '500' }}>{driver.licenseNumber}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Category</div>
              <div style={{ fontWeight: '500' }}>{driver.licenseCategory}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Expiry</div>
              <div style={{ fontWeight: '500' }}>{new Date(driver.licenseExpiry).toLocaleDateString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Status</div>
              <StatusPill status={driver.status} type="driver" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Safety Score</div>
              <div style={{ fontWeight: '500' }}>{driver.safetyScore ? driver.safetyScore.toFixed(1) : 'N/A'}</div>
            </div>
          </div>
        </div>

        {performance && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Performance Metrics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Total Trips</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                  {performance.totalTrips || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Completed Trips</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                  {performance.completedTrips || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Completion Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9c27b0' }}>
                  {performance.completionRate ? `${performance.completionRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Trip History</h2>
          {trips.length === 0 ? (
            <p style={{ color: '#666' }}>No trips recorded</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {trips.map(trip => (
                <div key={trip.id} style={{ 
                  padding: '1rem', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{trip.origin} → {trip.destination}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                      Cargo: {trip.cargoWeight} kg
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusPill status={trip.status} type="trip" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
