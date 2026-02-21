'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ReportIssuePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const tripId = params.id

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    issueType: 'delay',
    issueDescription: '',
    photo: null
  })

  const [formErrors, setFormErrors] = useState({})

  const issueTypes = [
    { value: 'delay', label: 'Delay' },
    { value: 'breakdown', label: 'Vehicle Breakdown' },
    { value: 'accident', label: 'Accident' },
    { value: 'cargo_damage', label: 'Cargo Damage' },
    { value: 'route_issue', label: 'Route Issue' },
    { value: 'other', label: 'Other' }
  ]

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ ...prev, photo: 'Please select an image file' }))
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, photo: 'Image size must be less than 5MB' }))
        return
      }
      setFormData(prev => ({ ...prev, photo: file }))
      setFormErrors(prev => ({ ...prev, photo: null }))
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.issueDescription || formData.issueDescription.trim().length === 0) {
      errors.issueDescription = 'Issue description is required'
    } else if (formData.issueDescription.trim().length < 10) {
      errors.issueDescription = 'Please provide a more detailed description (at least 10 characters)'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Note: In a real implementation, you would upload the photo to a storage service
      // and include the URL in the issue report. For now, we'll just send the text data.
      const response = await fetch(`/api/trips/${tripId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: formData.issueType,
          issueDescription: formData.issueDescription
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to report issue')
      }

      setSuccess(true)
      
      // Redirect back to trip detail after 2 seconds
      setTimeout(() => {
        router.push(`/driver/trips/${tripId}`)
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'DRIVER') {
    return null
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#4caf50' }}>
            Issue Reported Successfully
          </h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Fleet managers and dispatchers have been notified.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#999' }}>
            Redirecting back to trip details...
          </p>
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
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push(`/driver/trips/${tripId}`)}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Report Issue</h1>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '8px',
            border: '1px solid #ef5350'
          }}>
            {error}
          </div>
        )}

        {/* Trip Summary */}
        {trip && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>Trip Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Origin</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.origin}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Destination</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{trip.destination}</div>
              </div>
            </div>
          </div>
        )}

        {/* Issue Report Form */}
        <form onSubmit={handleSubmit}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Issue Details</h2>

            {/* Issue Type */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Issue Type <span style={{ color: '#c62828' }}>*</span>
              </label>
              <select
                value={formData.issueType}
                onChange={(e) => handleInputChange('issueType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                {issueTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Issue Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Description <span style={{ color: '#c62828' }}>*</span>
              </label>
              <textarea
                value={formData.issueDescription}
                onChange={(e) => handleInputChange('issueDescription', e.target.value)}
                placeholder="Please provide detailed information about the issue..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${formErrors.issueDescription ? '#c62828' : '#e0e0e0'}`,
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              {formErrors.issueDescription && (
                <div style={{ color: '#c62828', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {formErrors.issueDescription}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {formData.issueDescription.length} characters
              </div>
            </div>

            {/* Photo Upload */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Photo (Optional)
              </label>
              <div style={{
                border: `2px dashed ${formErrors.photo ? '#c62828' : '#e0e0e0'}`,
                borderRadius: '4px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#fafafa'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  style={{
                    cursor: 'pointer',
                    color: '#2196f3',
                    fontSize: '0.875rem'
                  }}
                >
                  {formData.photo ? (
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}>📷 {formData.photo.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        Click to change photo
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                      <div>Click to upload a photo</div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        Max size: 5MB
                      </div>
                    </div>
                  )}
                </label>
              </div>
              {formErrors.photo && (
                <div style={{ color: '#c62828', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {formErrors.photo}
                </div>
              )}
            </div>

            {/* Breakdown Warning */}
            {formData.issueType === 'breakdown' && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#fff3e0',
                border: '1px solid #ff9800',
                borderRadius: '4px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#e65100' }}>
                      Vehicle Breakdown
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Fleet managers and dispatchers will be immediately notified. 
                      Please ensure you are in a safe location.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => router.push(`/driver/trips/${tripId}`)}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: submitting ? '#ccc' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {submitting ? 'Submitting...' : 'Report Issue'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
