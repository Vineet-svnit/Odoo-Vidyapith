'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusPill from '@/components/StatusPill'

export default function VehicleDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [trips, setTrips] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [expenses, setExpenses] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
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
      fetchVehicleData()
    }
  }, [status, params.id])

  const fetchVehicleData = async () => {
    try {
      setLoading(true)
      
      const [vehicleRes, tripsRes, maintenanceRes, expensesRes] = await Promise.all([
        fetch(`/api/vehicles/${params.id}`),
        fetch(`/api/trips?vehicleId=${params.id}`),
        fetch(`/api/maintenance?vehicleId=${params.id}`),
        fetch(`/api/expenses/vehicle/${params.id}`)
      ])

      if (!vehicleRes.ok) throw new Error('Failed to fetch vehicle')

      const vehicleData = await vehicleRes.json()
      const tripsData = tripsRes.ok ? await tripsRes.json() : []
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : []
      const expensesData = expensesRes.ok ? await expensesRes.json() : []

      setVehicle(vehicleData)
      setTrips(tripsData)
      setMaintenance(maintenanceData)
      setExpenses(expensesData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  if (!session || session.user.role !== 'FLEET_MANAGER') {
    return null
  }

  if (error || !vehicle) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: 'red', padding: '1rem', backgroundColor: '#fee', borderRadius: '4px' }}>
          Error: {error || 'Vehicle not found'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/fleet-manager/vehicles')}
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
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{vehicle.name}</span>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Model</div>
              <div style={{ fontWeight: '500' }}>{vehicle.model}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>License Plate</div>
              <div style={{ fontWeight: '500' }}>{vehicle.licensePlate}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Type</div>
              <div style={{ fontWeight: '500' }}>{vehicle.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Status</div>
              <StatusPill status={vehicle.status} type="vehicle" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Max Load Capacity</div>
              <div style={{ fontWeight: '500' }}>{vehicle.maxLoadCapacity.toFixed(0)} kg</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Odometer</div>
              <div style={{ fontWeight: '500' }}>{vehicle.odometer.toFixed(0)} km</div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f9f9f9'
          }}>
            {['overview', 'trips', 'maintenance', 'expenses'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: activeTab === tab ? 'white' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #2196f3' : '2px solid transparent',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? '600' : '400',
                  fontSize: '0.875rem',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'overview' && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Vehicle Overview</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <strong>Total Trips:</strong> {trips.length}
                  </div>
                  <div>
                    <strong>Maintenance Records:</strong> {maintenance.length}
                  </div>
                  <div>
                    <strong>Total Expenses:</strong> ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trips' && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Trip History</h3>
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
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {new Date(trip.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <StatusPill status={trip.status} type="trip" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Maintenance History</h3>
                {maintenance.length === 0 ? (
                  <p style={{ color: '#666' }}>No maintenance records</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {maintenance.map(record => (
                      <div key={record.id} style={{ 
                        padding: '1rem', 
                        border: '1px solid #e0e0e0', 
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontWeight: '500' }}>{record.serviceType}</div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                          {record.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                          {new Date(record.serviceDate).toLocaleDateString()} • ${record.cost.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Expense History</h3>
                {expenses.length === 0 ? (
                  <p style={{ color: '#666' }}>No expenses recorded</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {expenses.map(expense => (
                      <div key={expense.id} style={{ 
                        padding: '1rem', 
                        border: '1px solid #e0e0e0', 
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{expense.category}</div>
                          <div style={{ fontSize: '0.875rem', color: '#666' }}>
                            {expense.description}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                          ${expense.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
