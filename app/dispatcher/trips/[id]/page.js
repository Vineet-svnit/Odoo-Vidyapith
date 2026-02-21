'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusPill from '@/components/StatusPill'

export default function TripDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.id

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [reassignData, setReassignData] = useState({ vehicleId: '', driverId: '', reason: '' })
  const [availableVehicles, setAvailableVehicles] = useState([])
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (status === 'authenticated' && session?.user?.role !== 'DISPATCHER') {
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
      if (!response.ok) throw new Error('Failed to fetch trip details')
      
      const data = await response.json()
      setTrip(data.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableResources = async () => {
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        fetch('/api/vehicles?status=AVAILABLE'),
        fetch('/api/drivers?status=ON_DUTY')
      ])

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json()
        setAvailableVehicles(vehiclesData.data || [])
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json()
        setAvailableDrivers(driversData.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch available resources:', err)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update status')
      }

      await fetchTripDetails()
      setShowStatusModal(false)
      setNewStatus('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReassignment = async () => {
    if (!reassignData.reason) {
      setError('Reason for reassignment is required')
      return
    }

    if (!reassignData.vehicleId && !reassignData.driverId) {
      setError('Select at least one resource to reassign')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/trips/${tripId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reassignData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to reassign trip')
      }

      await fetchTripDetails()
      setShowReassignModal(false)
      setReassignData({ vehicleId: '', driverId: '', reason: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openReassignModal = () => {
    fetchAvailableResources()
    setShowReassignModal(true)
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'DISPATCHER') {
    return null
  }

  if (!trip) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: 'red' }}>Trip not found</div>
      </div>
    )
  }

  const canUpdateStatus = ['DRAFT', 'DISPATCHED', 'IN_PROGRESS'].includes(trip.status)
  const canReassign = ['DRAFT', 'DISPATCHED', 'ISSUE_REPORTED'].includes(trip.status)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Trip Details</h1>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: '4px',
            marginBottom: '1.5rem'
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: '1px solid #c62828',
                borderRadius: '4px',
                color: '#c62828',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Main Trip Information */}
          <div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Trip Information</h2>
                <StatusPill status={trip.status} type="trip" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Trip ID</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.id.slice(0, 8)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Created</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                    {new Date(trip.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Origin</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.origin}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Destination</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.destination}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Cargo Weight</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.cargoWeight} kg</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Scheduled Start</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                    {trip.scheduledStart ? new Date(trip.scheduledStart).toLocaleString() : 'Not scheduled'}
                  </div>
                </div>
              </div>

              {trip.cargoDescription && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Cargo Description</div>
                  <div style={{ fontSize: '0.875rem' }}>{trip.cargoDescription}</div>
                </div>
              )}

              {trip.issueReported && trip.issueDescription && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#fff3e0', 
                  borderRadius: '4px',
                  border: '1px solid #ff9800'
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e65100', marginBottom: '0.5rem' }}>
                    ⚠️ Issue Reported
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>{trip.issueDescription}</div>
                </div>
              )}
            </div>

            {/* Vehicle and Driver Information */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Assigned Resources</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Vehicle</div>
                  {trip.vehicle ? (
                    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{trip.vehicle.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{trip.vehicle.model}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        License: {trip.vehicle.licensePlate}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        Capacity: {trip.vehicle.maxLoadCapacity} kg
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', color: '#666' }}>
                      No vehicle assigned
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Driver</div>
                  {trip.driver ? (
                    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                        {trip.driver.firstName} {trip.driver.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        License: {trip.driver.licenseCategory}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        Expires: {new Date(trip.driver.licenseExpiry).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', color: '#666' }}>
                      No driver assigned
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Actions</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {canUpdateStatus && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Update Status
                  </button>
                )}

                {canReassign && (
                  <button
                    onClick={openReassignModal}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Emergency Reassign
                  </button>
                )}

                {trip.status === 'DRAFT' && (
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to cancel this trip?')) {
                        await fetch(`/api/trips/${tripId}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'CANCELLED' })
                        })
                        fetchTripDetails()
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Cancel Trip
                  </button>
                )}
              </div>
            </div>

            {/* Trip Timeline */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              marginTop: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Timeline</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem' }}>
                  <div style={{ color: '#666' }}>Created</div>
                  <div style={{ fontWeight: '500' }}>{new Date(trip.createdAt).toLocaleString()}</div>
                </div>

                {trip.actualStart && (
                  <div style={{ fontSize: '0.75rem' }}>
                    <div style={{ color: '#666' }}>Started</div>
                    <div style={{ fontWeight: '500' }}>{new Date(trip.actualStart).toLocaleString()}</div>
                  </div>
                )}

                {trip.actualEnd && (
                  <div style={{ fontSize: '0.75rem' }}>
                    <div style={{ color: '#666' }}>Completed</div>
                    <div style={{ fontWeight: '500' }}>{new Date(trip.actualEnd).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Update Trip Status</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">-- Select status --</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleStatusUpdate}
                disabled={!newStatus || submitting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: !newStatus || submitting ? '#ccc' : '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !newStatus || submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {submitting ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setNewStatus('')
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {showReassignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Emergency Reassignment</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                New Vehicle (optional)
              </label>
              <select
                value={reassignData.vehicleId}
                onChange={(e) => setReassignData(prev => ({ ...prev, vehicleId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">-- Keep current vehicle --</option>
                {availableVehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.type} (Capacity: {vehicle.maxLoadCapacity} kg)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                New Driver (optional)
              </label>
              <select
                value={reassignData.driverId}
                onChange={(e) => setReassignData(prev => ({ ...prev, driverId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">-- Keep current driver --</option>
                {availableDrivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName} - License: {driver.licenseCategory}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Reason for Reassignment *
              </label>
              <textarea
                value={reassignData.reason}
                onChange={(e) => setReassignData(prev => ({ ...prev, reason: e.target.value }))}
                rows="3"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleReassignment}
                disabled={!reassignData.reason || submitting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: !reassignData.reason || submitting ? '#ccc' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !reassignData.reason || submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {submitting ? 'Reassigning...' : 'Reassign'}
              </button>
              <button
                onClick={() => {
                  setShowReassignModal(false)
                  setReassignData({ vehicleId: '', driverId: '', reason: '' })
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
