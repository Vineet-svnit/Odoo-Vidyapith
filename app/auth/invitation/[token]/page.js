'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InvitationPage({ params }) {
  const router = useRouter()
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    licenseCategory: '',
    licenseExpiry: ''
  })

  useEffect(() => {
    // Fetch invitation details
    fetch(`/api/auth/invitation/${params.token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setInvitation(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load invitation')
        setLoading(false)
      })
  }, [params.token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    const payload = {
      token: params.token,
      password: formData.password
    }

    // Add driver-specific fields if role is DRIVER
    if (invitation?.role === 'DRIVER') {
      payload.firstName = formData.firstName
      payload.lastName = formData.lastName
      payload.licenseNumber = formData.licenseNumber
      payload.licenseCategory = formData.licenseCategory
      payload.licenseExpiry = formData.licenseExpiry
    }

    try {
      const res = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/auth/signin?message=Account created successfully')
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (error && !invitation) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Invalid Invitation</h1>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '2rem' }}>
      <h1>Accept Invitation</h1>
      <p>You&apos;ve been invited to join FleetFlow as a {invitation?.role?.replace('_', ' ')}.</p>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
        {invitation?.role === 'DRIVER' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label>First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>License Number</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>License Category</label>
              <select
                value={formData.licenseCategory}
                onChange={(e) => setFormData({ ...formData, licenseCategory: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              >
                <option value="">Select category</option>
                <option value="A">A - Motorcycle</option>
                <option value="B">B - Car/Van</option>
                <option value="C">C - Truck</option>
                <option value="D">D - Bus</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>License Expiry Date</label>
              <input
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                required
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label>Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Confirm Password</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Account
        </button>
      </form>
    </div>
  )
}
