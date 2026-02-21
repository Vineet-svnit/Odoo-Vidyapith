'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DataTable from '@/components/DataTable'
import StatusPill from '@/components/StatusPill'

export default function TripManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

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
      fetchTrips()
    }
  }, [status, statusFilter])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/trips?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch trips')
      
      const data = await response.json()
      setTrips(data.data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (trip) => {
    router.push(`/dispatcher/trips/${trip.id}`)
  }

  if (status === 'loading') {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'DISPATCHER') {
    return null
  }

  const columns = [
    {
      key: 'id',
      label: 'Trip ID',
      render: (value) => value.slice(0, 8)
    },
    {
      key: 'origin',
      label: 'Origin'
    },
    {
      key: 'destination',
      label: 'Destination'
    },
    {
      key: 'cargoWeight',
      label: 'Cargo Weight',
      render: (value) => `${value} kg`
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusPill status={value} type="trip" />
    },
    {
      key: 'driver',
      label: 'Driver',
      render: (value) => value ? `${value.firstName} ${value.lastName}` : 'N/A'
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (value) => value ? value.name : 'N/A'
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Trip Management</h1>
          <button
            onClick={() => router.push('/dispatcher/dispatch')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            + Create New Trip
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' }}>
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

        {/* Status Filter */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{ fontWeight: '500', color: '#333' }}>Filter by Status:</div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '0.875rem',
              minWidth: '200px'
            }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ISSUE_REPORTED">Issue Reported</option>
          </select>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Trips Table */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <DataTable
            columns={columns}
            data={trips}
            onRowClick={handleRowClick}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
