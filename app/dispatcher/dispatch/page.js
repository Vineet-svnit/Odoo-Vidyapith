'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TripDispatchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = searchParams.get('tripId')

  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    cargoWeight: '',
    cargoDescription: '',
    origin: '',
    destination: '',
    scheduledStart: ''
  })

  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [validationFeedback, setValidationFeedback] = useState({})

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
      fetchData()
    }
  }, [status, tripId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch available vehicles
      const vehiclesResponse = await fetch('/api/vehicles?status=AVAILABLE')
      if (!vehiclesResponse.ok) throw new Error('Failed to fetch vehicles')
      const vehiclesData = await vehiclesResponse.json()
      setVehicles(vehiclesData.data || [])

      // Fetch available drivers
      const driversResponse = await fetch('/api/drivers?status=ON_DUTY')
      if (!driversResponse.ok) throw new Error('Failed to fetch drivers')
      const driversData = await driversResponse.json()
      setDrivers(driversData.data || [])

      // If editing existing trip, fetch trip data
      if (tripId) {
        const tripResponse = await fetch(`/api/trips/${tripId}`)
        if (tripResponse.ok) {
          const tripData = await tripResponse.json()
          setFormData({
            vehicleId: tripData.data.vehicleId || '',
            driverId: tripData.data.driverId || '',
            cargoWeight: tripData.data.cargoWeight || '',
            cargoDescription: tripData.data.cargoDescription || '',
            origin: tripData.data.origin || '',
            destination: tripData.data.destination || '',
            scheduledStart: tripData.data.scheduledStart ? new Date(tripData.data.scheduledStart).toISOString().slice(0, 16) : ''
          })
        }
      }

      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const validateField = (name, value) => {
    const errors = {}
    const feedback = {}

    if (name === 'cargoWeight' && formData.vehicleId) {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)
      if (selectedVehicle && value) {
        const weight = parseFloat(value)
        if (weight > selectedVehicle.maxLoadCapacity) {
          errors.cargoWeight = `Cargo weight exceeds vehicle capacity (${selectedVehicle.maxLoadCapacity} kg)`
          feedback.cargoWeight = { type: 'error', message: errors.cargoWeight }
        } else {
          feedback.cargoWeight = { type: 'success', message: `✓ Within vehicle capacity` }
        }
      }
    }

    if (name === 'vehicleId' && value && formData.cargoWeight) {
      const selectedVehicle = vehicles.find(v => v.id === value)
      if (selectedVehicle) {
        const weight = parseFloat(formData.cargoWeight)
        if (weight > selectedVehicle.maxLoadCapacity) {
          errors.cargoWeight = `Cargo weight exceeds vehicle capacity (${selectedVehicle.maxLoadCapacity} kg)`
          feedback.cargoWeight = { type: 'error', message: errors.cargoWeight }
        } else {
          feedback.cargoWeight = { type: 'success', message: `✓ Within vehicle capacity` }
        }
      }
    }

    if (name === 'driverId' && value) {
      const selectedDriver = drivers.find(d => d.id === value)
      if (selectedDriver) {
        const licenseExpiry = new Date(selectedDriver.licenseExpiry)
        if (licenseExpiry < new Date()) {
          errors.driverId = 'Driver license has expired'
          feedback.driverId = { type: 'error', message: errors.driverId }
        } else {
          feedback.driverId = { type: 'success', message: `✓ License valid until ${licenseExpiry.toLocaleDateString()}` }
        }

        // Check license category matches vehicle type
        if (formData.vehicleId) {
          const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)
          if (selectedVehicle) {
            const isValid = validateLicenseCategory(selectedDriver.licenseCategory, selectedVehicle.type)
            if (!isValid) {
              errors.driverId = `Driver license category (${selectedDriver.licenseCategory}) does not match vehicle type (${selectedVehicle.type})`
              feedback.driverId = { type: 'error', message: errors.driverId }
            }
          }
        }
      }
    }

    return { errors, feedback }
  }

  const validateLicenseCategory = (licenseCategory, vehicleType) => {
    // Simplified license validation logic
    const categoryMap = {
      'TRUCK': ['A', 'C', 'CE'],
      'VAN': ['B', 'C'],
      'BIKE': ['A', 'A1', 'A2']
    }
    return categoryMap[vehicleType]?.includes(licenseCategory) || false
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Real-time validation
    const { errors, feedback } = validateField(name, value)
    setValidationErrors(prev => ({ ...prev, ...errors }))
    setValidationFeedback(prev => ({ ...prev, ...feedback }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setValidationErrors({})

    try {
      const payload = {
        ...formData,
        cargoWeight: parseFloat(formData.cargoWeight),
        scheduledStart: formData.scheduledStart ? new Date(formData.scheduledStart).toISOString() : null
      }

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          setValidationErrors(data.errors)
        }
        throw new Error(data.message || 'Failed to create trip')
      }

      // Success - redirect to trips page
      router.push('/dispatcher/trips')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'DISPATCHER') {
    return null
  }

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId)
  const selectedDriver = drivers.find(d => d.id === formData.driverId)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Create New Trip</h1>
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
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Main Form */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Trip Details</h2>
            
            <form onSubmit={handleSubmit}>
              {/* Cargo Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Cargo Weight (kg) *
                </label>
                <input
                  type="number"
                  name="cargoWeight"
                  value={formData.cargoWeight}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${validationErrors.cargoWeight ? '#c62828' : '#ccc'}`,
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                {validationFeedback.cargoWeight && (
                  <div style={{ 
                    marginTop: '0.25rem', 
                    fontSize: '0.75rem',
                    color: validationFeedback.cargoWeight.type === 'error' ? '#c62828' : '#2e7d32'
                  }}>
                    {validationFeedback.cargoWeight.message}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Cargo Description
                </label>
                <textarea
                  name="cargoDescription"
                  value={formData.cargoDescription}
                  onChange={handleChange}
                  rows="3"
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

              {/* Route Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Origin *
                </label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Destination *
                </label>
                <input
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Scheduled Start
                </label>
                <input
                  type="datetime-local"
                  name="scheduledStart"
                  value={formData.scheduledStart}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Vehicle Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Select Vehicle *
                </label>
                <select
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">-- Select a vehicle --</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} - {vehicle.type} (Capacity: {vehicle.maxLoadCapacity} kg)
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                  Select Driver *
                </label>
                <select
                  name="driverId"
                  value={formData.driverId}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${validationErrors.driverId ? '#c62828' : '#ccc'}`,
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">-- Select a driver --</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName} - License: {driver.licenseCategory}
                    </option>
                  ))}
                </select>
                {validationFeedback.driverId && (
                  <div style={{ 
                    marginTop: '0.25rem', 
                    fontSize: '0.75rem',
                    color: validationFeedback.driverId.type === 'error' ? '#c62828' : '#2e7d32'
                  }}>
                    {validationFeedback.driverId.message}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="submit"
                  disabled={submitting || Object.keys(validationErrors).length > 0}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: submitting || Object.keys(validationErrors).length > 0 ? '#ccc' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting || Object.keys(validationErrors).length > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {submitting ? 'Creating Trip...' : 'Create Trip'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
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
            </form>
          </div>

          {/* Available Pools Sidebar */}
          <div>
            {/* Available Vehicles */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                Available Vehicles ({vehicles.length})
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {vehicles.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '0.875rem' }}>No available vehicles</div>
                ) : (
                  vehicles.map(vehicle => (
                    <div 
                      key={vehicle.id}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: vehicle.id === formData.vehicleId ? '#e3f2fd' : '#f9f9f9',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        border: vehicle.id === formData.vehicleId ? '2px solid #2196f3' : '1px solid #e0e0e0'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{vehicle.name}</div>
                      <div style={{ color: '#666' }}>{vehicle.type}</div>
                      <div style={{ color: '#666' }}>Capacity: {vehicle.maxLoadCapacity} kg</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Available Drivers */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                Available Drivers ({drivers.length})
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {drivers.length === 0 ? (
                  <div style={{ color: '#666', fontSize: '0.875rem' }}>No available drivers</div>
                ) : (
                  drivers.map(driver => (
                    <div 
                      key={driver.id}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: driver.id === formData.driverId ? '#e3f2fd' : '#f9f9f9',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        border: driver.id === formData.driverId ? '2px solid #2196f3' : '1px solid #e0e0e0'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {driver.firstName} {driver.lastName}
                      </div>
                      <div style={{ color: '#666' }}>License: {driver.licenseCategory}</div>
                      <div style={{ color: '#666' }}>
                        Expires: {new Date(driver.licenseExpiry).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
