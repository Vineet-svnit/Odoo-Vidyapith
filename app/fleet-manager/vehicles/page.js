'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import StatusPill from '@/components/StatusPill'
import VehicleFormModal from '@/components/VehicleFormModal'

export default function VehiclesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
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
      fetchVehicles()
    }
  }, [status])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vehicles')
      if (!response.ok) throw new Error('Failed to fetch vehicles')
      
      const data = await response.json()
      setVehicles(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVehicle = () => {
    setSelectedVehicle(null)
    setShowModal(true)
  }

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle)
    setShowModal(true)
  }

  const handleSaveVehicle = () => {
    fetchVehicles()
  }

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm('Are you sure you want to retire this vehicle?')) return

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete vehicle')
      fetchVehicles()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'model', label: 'Model' },
    { key: 'licensePlate', label: 'License Plate' },
    { key: 'type', label: 'Type' },
    { 
      key: 'maxLoadCapacity', 
      label: 'Max Load (kg)',
      render: (value) => value.toFixed(0)
    },
    { 
      key: 'odometer', 
      label: 'Odometer (km)',
      render: (value) => value.toFixed(0)
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <StatusPill status={value} type="vehicle" />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, vehicle) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditVehicle(vehicle)
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
              router.push(`/fleet-manager/vehicles/${vehicle.id}`)
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
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Vehicle Registry</span>
          </div>
          <button
            onClick={handleAddVehicle}
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
            + Add Vehicle
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
            placeholder="Search vehicles..."
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
            data={filteredVehicles}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <VehicleFormModal
          vehicle={selectedVehicle}
          onClose={() => setShowModal(false)}
          onSave={handleSaveVehicle}
        />
      )}
    </div>
  )
}
