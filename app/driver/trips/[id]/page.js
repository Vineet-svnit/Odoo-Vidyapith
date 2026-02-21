'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusPill from '@/components/StatusPill'

export default function DriverTripDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.id

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [showOdometerModal, setShowOdometerModal] = useState(false)
  const [odometerValue, setOdometerValue] = useState('')
  const [odometerError, setOdometerError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role !== 'DRIVER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && tripId) {
      fetchTripDetails()
    }
  }, [status, tripId])

  const fetchTripDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trips/${tripId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Trip not found')
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to view this trip')
        }
        throw new Error('Failed to fetch trip details')
      }
      const data = await response.json()
      setTrip(data.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus, requiresOdometer = false) => {
    if (requiresOdometer) {
      setShowOdometerModal(true)
      return
    }

    try {
      setUpdating(true)
      const body = { status: newStatus }
      
      // If starting trip, include start odometer
      if (newStatus === 'IN_PROGRESS' && trip.vehicle?.odometer) {
        body.startOdometer = trip.vehicle.odometer
      }

      const response = await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update trip status')
      }

      await fetchTripDetails()
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleCompleteTrip = async () => {
    if (!odometerValue || isNaN(odometerValue) || parseFloat(odometerValue) <= 0) {
      setOdometerError('Please enter a valid odometer reading')
      return
    }

    const endOdometer = parseFloat(odometerValue)
    if (trip.startOdometer && endOdometer < trip.startOdometer) {
      setOdometerError('End odometer must be greater than start odometer')
      return
    }

    try {
      setUpdating(true)
      const response = await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          endOdometer
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to complete trip')
      }

      setShowOdometerModal(false)
      setOdometerValue('')
      setOdometerError('')
      await fetchTripDetails()
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const getAvailableActions = () => {
    if (!trip) return []

    const actions = []

    switch (trip.status) {
      case 'DRAFT':
      case 'DISPATCHED':
        actions.push({
          label: 'Accept Trip',
          action: () => handleStatusUpdate('DISPATCHED'),
          color: '#4caf50'
        })
        actions.push({
          label: 'Start Trip',
          action: () => handleStatusUpdate('IN_PROGRESS'),
          color: '#2196f3'
        })
        break
      case 'IN_PROGRESS':
        actions.push({
          label: 'Complete Trip',
          action: () => handleStatusUpdate('COMPLETED', true),
          color: '#4caf50'
        })
        break
      default:
        break
    }

    // Always allow reporting issues for non-completed trips
    if (!['COMPLETED', 'CANCELLED'].includes(trip.status)) {
      actions.push({
        label: 'Report Issue',
        action: () => router.push(`/driver/trips/${tripId}/issue`),
        color: '#ff9800'
      })
    }

    return actions
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
        <div style={{ color: 'red', padding: '1rem', backgroundColor: '#fee', borderRadius: '4px', marginBottom: '1rem' }}>
          Error: {error}
        </div>
        <button
          onClick={() => router.push('/driver')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!trip) {
    return <div style={{ padding: '2rem' }}>Trip not found</div>
  }

  const availableActions = getAvailableActions()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.push('/driver')}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              ←
            </button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Trip Details</h1>
          </div>
          <StatusPill status={trip.status} type="trip" />
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {/* Action Buttons */}
        {availableActions.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Actions</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {availableActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  disabled={updating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: updating ? '#ccc' : action.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {updating ? 'Updating...' : action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip Information */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Trip Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Trip ID</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Status</div>
              <StatusPill status={trip.status} type="trip" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Created</div>
              <div style={{ fontSize: '0.875rem' }}>{new Date(trip.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Route Information */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Route</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#1565c0', marginBottom: '0.5rem', fontWeight: '600' }}>ORIGIN</div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>{trip.origin}</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: '#666' }}>→</div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#2e7d32', marginBottom: '0.5rem', fontWeight: '600' }}>DESTINATION</div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>{trip.destination}</div>
            </div>
          </div>
        </div>

        {/* Cargo Information */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Cargo Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Weight</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2196f3' }}>{trip.cargoWeight} kg</div>
            </div>
            {trip.cargoDescription && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Description</div>
                <div style={{ fontSize: '0.875rem' }}>{trip.cargoDescription}</div>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Information */}
        {trip.vehicle && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Assigned Vehicle</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Vehicle Name</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.vehicle.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Model</div>
                <div style={{ fontSize: '0.875rem' }}>{trip.vehicle.model}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Plate</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.vehicle.licensePlate}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Type</div>
                <div style={{ fontSize: '0.875rem' }}>{trip.vehicle.type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Max Capacity</div>
                <div style={{ fontSize: '0.875rem' }}>{trip.vehicle.maxLoadCapacity} kg</div>
              </div>
            </div>
          </div>
        )}

        {/* Trip Timeline */}
        {(trip.scheduledStart || trip.actualStart || trip.actualEnd) && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Timeline</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {trip.scheduledStart && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Scheduled Start</div>
                  <div style={{ fontSize: '0.875rem' }}>{new Date(trip.scheduledStart).toLocaleString()}</div>
                </div>
              )}
              {trip.actualStart && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Actual Start</div>
                  <div style={{ fontSize: '0.875rem' }}>{new Date(trip.actualStart).toLocaleString()}</div>
                </div>
              )}
              {trip.actualEnd && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Completed</div>
                  <div style={{ fontSize: '0.875rem' }}>{new Date(trip.actualEnd).toLocaleString()}</div>
                </div>
              )}
              {trip.startOdometer && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Start Odometer</div>
                  <div style={{ fontSize: '0.875rem' }}>{trip.startOdometer} km</div>
                </div>
              )}
              {trip.endOdometer && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>End Odometer</div>
                  <div style={{ fontSize: '0.875rem' }}>{trip.endOdometer} km</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Odometer Modal */}
      {showOdometerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Enter Final Odometer Reading</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
              Please enter the vehicle's odometer reading at trip completion.
            </p>
            <input
              type="number"
              value={odometerValue}
              onChange={(e) => {
                setOdometerValue(e.target.value)
                setOdometerError('')
              }}
              placeholder="Odometer reading (km)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${odometerError ? '#c62828' : '#e0e0e0'}`,
                borderRadius: '4px',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }}
            />
            {odometerError && (
              <div style={{ color: '#c62828', fontSize: '0.75rem', marginBottom: '1rem' }}>
                {odometerError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowOdometerModal(false)
                  setOdometerValue('')
                  setOdometerError('')
                }}
                disabled={updating}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTrip}
                disabled={updating}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: updating ? '#ccc' : '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {updating ? 'Completing...' : 'Complete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
