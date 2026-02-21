'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ExpenseLoggingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('fuel')
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [fuelData, setFuelData] = useState({
    vehicleId: '',
    liters: '',
    cost: '',
    odometer: '',
    fuelDate: new Date().toISOString().slice(0, 10)
  })

  const [expenseData, setExpenseData] = useState({
    vehicleId: '',
    category: '',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10)
  })

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
      fetchVehicles()
    }
  }, [status])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vehicles')
      if (!response.ok) throw new Error('Failed to fetch vehicles')
      
      const data = await response.json()
      setVehicles(data.data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFuelSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        vehicleId: fuelData.vehicleId,
        liters: parseFloat(fuelData.liters),
        cost: parseFloat(fuelData.cost),
        odometer: parseFloat(fuelData.odometer),
        fuelDate: new Date(fuelData.fuelDate).toISOString()
      }

      const response = await fetch('/api/expenses/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to log fuel expense')
      }

      setSuccess('Fuel expense logged successfully')
      setFuelData({
        vehicleId: '',
        liters: '',
        cost: '',
        odometer: '',
        fuelDate: new Date().toISOString().slice(0, 10)
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        vehicleId: expenseData.vehicleId || null,
        category: expenseData.category,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        expenseDate: new Date(expenseData.expenseDate).toISOString()
      }

      const response = await fetch('/api/expenses/other', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to log expense')
      }

      setSuccess('Expense logged successfully')
      setExpenseData({
        vehicleId: '',
        category: '',
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 10)
      })
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Expense Logging</h1>
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

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: '4px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {error}
            <button
              onClick={() => setError(null)}
              style={{
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

        {success && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#e8f5e9', 
            color: '#2e7d32', 
            borderRadius: '4px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {success}
            <button
              onClick={() => setSuccess(null)}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                border: '1px solid #2e7d32',
                borderRadius: '4px',
                color: '#2e7d32',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          borderBottom: 'none'
        }}>
          <button
            onClick={() => setActiveTab('fuel')}
            style={{
              flex: 1,
              padding: '1rem',
              backgroundColor: activeTab === 'fuel' ? 'white' : '#f5f5f5',
              border: 'none',
              borderBottom: activeTab === 'fuel' ? '3px solid #2196f3' : '1px solid #e0e0e0',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'fuel' ? '600' : '400',
              color: activeTab === 'fuel' ? '#2196f3' : '#666'
            }}
          >
            ⛽ Fuel Log
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            style={{
              flex: 1,
              padding: '1rem',
              backgroundColor: activeTab === 'expense' ? 'white' : '#f5f5f5',
              border: 'none',
              borderBottom: activeTab === 'expense' ? '3px solid #2196f3' : '1px solid #e0e0e0',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'expense' ? '600' : '400',
              color: activeTab === 'expense' ? '#2196f3' : '#666'
            }}
          >
            💰 Other Expense
          </button>
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '0 0 8px 8px',
          padding: '2rem'
        }}>
          {activeTab === 'fuel' ? (
            <form onSubmit={handleFuelSubmit}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                Log Fuel Expense
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Vehicle *
                  </label>
                  <select
                    value={fuelData.vehicleId}
                    onChange={(e) => setFuelData(prev => ({ ...prev, vehicleId: e.target.value }))}
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
                        {vehicle.name} - {vehicle.licensePlate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Liters *
                  </label>
                  <input
                    type="number"
                    value={fuelData.liters}
                    onChange={(e) => setFuelData(prev => ({ ...prev, liters: e.target.value }))}
                    required
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Total Cost *
                  </label>
                  <input
                    type="number"
                    value={fuelData.cost}
                    onChange={(e) => setFuelData(prev => ({ ...prev, cost: e.target.value }))}
                    required
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                  {fuelData.liters && fuelData.cost && (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
                      Price per liter: ${(parseFloat(fuelData.cost) / parseFloat(fuelData.liters)).toFixed(2)}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Odometer Reading *
                  </label>
                  <input
                    type="number"
                    value={fuelData.odometer}
                    onChange={(e) => setFuelData(prev => ({ ...prev, odometer: e.target.value }))}
                    required
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={fuelData.fuelDate}
                    onChange={(e) => setFuelData(prev => ({ ...prev, fuelDate: e.target.value }))}
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
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: submitting ? '#ccc' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {submitting ? 'Logging...' : 'Log Fuel Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setFuelData({
                    vehicleId: '',
                    liters: '',
                    cost: '',
                    odometer: '',
                    fuelDate: new Date().toISOString().slice(0, 10)
                  })}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleExpenseSubmit}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                Log Other Expense
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Vehicle (optional)
                  </label>
                  <select
                    value={expenseData.vehicleId}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, vehicleId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">-- General expense (not vehicle-specific) --</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.licensePlate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Category *
                  </label>
                  <select
                    value={expenseData.category}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">-- Select category --</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Repair">Repair</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Registration">Registration</option>
                    <option value="Tolls">Tolls</option>
                    <option value="Parking">Parking</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Description
                  </label>
                  <textarea
                    value={expenseData.description}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
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

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={expenseData.expenseDate}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, expenseDate: e.target.value }))}
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
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: submitting ? '#ccc' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {submitting ? 'Logging...' : 'Log Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseData({
                    vehicleId: '',
                    category: '',
                    description: '',
                    amount: '',
                    expenseDate: new Date().toISOString().slice(0, 10)
                  })}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
