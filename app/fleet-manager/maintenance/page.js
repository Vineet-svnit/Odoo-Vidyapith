'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import MaintenanceFormModal from '@/components/MaintenanceFormModal'

export default function MaintenancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [maintenance, setMaintenance] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState(null)
  const [filterVehicle, setFilterVehicle] = useState('')
  const [costStats, setCostStats] = useState({ total: 0, average: 0 })

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
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [maintenanceRes, vehiclesRes] = await Promise.all([
        fetch('/api/maintenance'),
        fetch('/api/vehicles')
      ])
      
      if (!maintenanceRes.ok) throw new Error('Failed to fetch maintenance logs')
      if (!vehiclesRes.ok) throw new Error('Failed to fetch vehicles')
      
      const maintenanceData = await maintenanceRes.json()
      const vehiclesData = await vehiclesRes.json()
      
      setMaintenance(maintenanceData)
      setVehicles(vehiclesData)
      
      const total = maintenanceData.reduce((sum, m) => sum + m.cost, 0)
      const average = maintenanceData.length > 0 ? total / maintenanceData.length : 0
      setCostStats({ total, average })
      
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMaintenance = () => {
    setSelectedMaintenance(null)
    setShowModal(true)
  }

  const handleEditMaintenance = (maintenance) => {
    setSelectedMaintenance(maintenance)
    setShowModal(true)
  }

  const handleSaveMaintenance = () => {
    fetchData()
  }

  const handleCompleteMaintenance = async (maintenanceId) => {
    if (!confirm('Mark this maintenance as complete?')) return

    try {
      const response = await fetch(`/api/maintenance/${maintenanceId}/complete`, {
        method: 'PATCH'
      })
      if (!response.ok) throw new Error('Failed to complete maintenance')
      fetchData()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const filteredMaintenance = maintenance.filter(m =>
    !filterVehicle || m.vehicleId === filterVehicle
  )

  const columns = [
    { 
      key: 'vehicle', 
      label: 'Vehicle',
      render: (_, m) => {
        const vehicle = vehicles.find(v => v.id === m.vehicleId)
        return vehicle ? `${vehicle.name} (${vehicle.licensePlate})` : 'Unknown'
      }
    },
    { key: 'serviceType', label: 'Service Type' },
    { 
      key: 'serviceDate', 
      label: 'Service Date',
      render: (value) => new Date(value).toLocaleDateString()
    },
    { 
      key: 'cost', 
      label: 'Cost',
      render: (value) => `$${value.toFixed(2)}`
    },
    { 
      key: 'odometer', 
      label: 'Odometer (km)',
      render: (value) => value.toFixed(0)
    },
    { 
      key: 'completedAt', 
      label: 'Status',
      render: (value) => (
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: value ? '#e8f5e9' : '#fff3e0',
          color: value ? '#2e7d32' : '#e65100',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {value ? 'Completed' : 'In Progress'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, m) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!m.completedAt && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCompleteMaintenance(m.id)
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
              Complete
            </button>
          )}
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
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Maintenance Logs</span>
          </div>
          <button
            onClick={handleAddMaintenance}
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
            + Add Maintenance
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Total Maintenance Cost
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196f3' }}>
              ${costStats.total.toFixed(2)}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Average Cost per Service
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
              ${costStats.average.toFixed(2)}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              Total Records
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9c27b0' }}>
              {maintenance.length}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.875rem',
              minWidth: '250px'
            }}
          >
            <option value="">All Vehicles</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} - {vehicle.licensePlate}
              </option>
            ))}
          </select>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <DataTable
            columns={columns}
            data={filteredMaintenance}
            loading={loading}
          />
        </div>
      </div>

      {showModal && (
        <MaintenanceFormModal
          maintenance={selectedMaintenance}
          vehicles={vehicles}
          onClose={() => setShowModal(false)}
          onSave={handleSaveMaintenance}
        />
      )}
    </div>
  )
}
