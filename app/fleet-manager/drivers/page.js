'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import StatusPill from '@/components/StatusPill'
import DriverFormModal from '@/components/DriverFormModal'

export default function DriversPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

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
      fetchDrivers()
    }
  }, [status])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/drivers')
      if (!response.ok) throw new Error('Failed to fetch drivers')
      
      const data = await response.json()
      setDrivers(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDriver = () => {
    setSelectedDriver(null)
    setShowModal(true)
  }

  const handleEditDriver = (driver) => {
    setSelectedDriver(driver)
    setShowModal(true)
  }

  const handleSaveDriver = () => {
    fetchDrivers()
  }

  const handleSuspendDriver = async (driverId, currentStatus) => {
    const newStatus = currentStatus === 'SUSPENDED' ? 'ON_DUTY' : 'SUSPENDED'
    const action = newStatus === 'SUSPENDED' ? 'suspend' : 'reactivate'
    
    if (!confirm(`Are you sure you want to ${action} this driver?`)) return

    try {
      const response = await fetch(`/api/drivers/${driverId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!response.ok) throw new Error(`Failed to ${action} driver`)
      fetchDrivers()
    } catch (err) {
      alert('Error: ' + err.message)
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

  const filteredDrivers = drivers.filter(driver =>
    driver.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (_, driver) => `${driver.firstName} ${driver.lastName}`
    },
    { key: 'licenseNumber', label: 'License Number' },
    { key: 'licenseCategory', label: 'Category' },
    { 
      key: 'licenseExpiry', 
      label: 'License Expiry',
      render: (value) => {
        const date = new Date(value).toLocaleDateString()
        const expired = isLicenseExpired(value)
        const expiringSoon = isLicenseExpiringSoon(value)
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{date}</span>
            {expired && <span style={{ color: '#c62828', fontSize: '0.75rem' }}>⚠️ Expired</span>}
            {!expired && expiringSoon && <span style={{ color: '#e65100', fontSize: '0.75rem' }}>⚠️ Expiring Soon</span>}
          </div>
        )
      }
    },
    { 
      key: 'safetyScore', 
      label: 'Safety Score',
      render: (value) => value ? value.toFixed(1) : 'N/A'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <StatusPill status={value} type="driver" />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, driver) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditDriver(driver)
            }}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSuspendDriver(driver.id, driver.status)
            }}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: driver.status === 'SUSPENDED' ? '#4caf50' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            {driver.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/fleet-manager/drivers/${driver.id}`)
            }}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            View
          </button>
        </div>
      )
    }
  ]

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'FLEET_MANAGER') {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button
              onClick={() => router.push('/fleet-manager')}
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
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Driver Management</span>
          </div>
          <button
            onClick={handleAddDriver}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            + Add Driver
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#fee', 
            color: '#c00',
            borderRadius: '4px'
          }}>
            Error: {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <DataTable
            columns={columns}
            data={filteredDrivers}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <DriverFormModal
          driver={selectedDriver}
          onClose={() => setShowModal(false)}
          onSave={handleSaveDriver}
        />
      )}
    </div>
  )
}
