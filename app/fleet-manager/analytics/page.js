'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import KPICard from '@/components/KPICard'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState(null)
  const [costs, setCosts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [vehicles, setVehicles] = useState([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)

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
  }, [status, selectedVehicle, dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (selectedVehicle) params.append('vehicleId', selectedVehicle)
      params.append('startDate', dateRange.start)
      params.append('endDate', dateRange.end)

      const [analyticsRes, costsRes, vehiclesRes] = await Promise.all([
        fetch(`/api/analytics/fleet?${params.toString()}`),
        fetch(`/api/analytics/costs?${params.toString()}`),
        fetch('/api/vehicles')
      ])

      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null
      const costsData = costsRes.ok ? await costsRes.json() : null
      const vehiclesData = vehiclesRes.ok ? await vehiclesRes.json() : []

      setAnalytics(analyticsData)
      setCosts(costsData)
      setVehicles(vehiclesData)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      
      const params = new URLSearchParams()
      params.append('format', exportFormat)
      params.append('startDate', dateRange.start)
      params.append('endDate', dateRange.end)
      if (selectedVehicle) params.append('vehicleId', selectedVehicle)

      const response = await fetch(`/api/analytics/export?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to export report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fleet-report-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

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
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Analytics & Reports</span>
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
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Filters</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Vehicle
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
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
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        </div>

        {analytics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <KPICard
              title="Fleet Utilization"
              value={analytics.utilization ? `${analytics.utilization.toFixed(1)}%` : 'N/A'}
              subtitle="Active vehicles / Total fleet"
              icon="📊"
              color="blue"
            />
            <KPICard
              title="Average Fuel Efficiency"
              value={analytics.avgFuelEfficiency ? `${analytics.avgFuelEfficiency.toFixed(2)} km/L` : 'N/A'}
              subtitle="Across all vehicles"
              icon="⛽"
              color="green"
            />
            <KPICard
              title="Average ROI"
              value={analytics.avgROI ? `${analytics.avgROI.toFixed(1)}%` : 'N/A'}
              subtitle="Return on investment"
              icon="💰"
              color="purple"
            />
            <KPICard
              title="Total Distance"
              value={analytics.totalDistance ? `${analytics.totalDistance.toFixed(0)} km` : 'N/A'}
              subtitle="In selected period"
              icon="🚚"
              color="orange"
            />
          </div>
        )}

        {costs && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Cost Analysis</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                  Total Operational Cost
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                  ${costs.totalCost ? costs.totalCost.toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                  Fuel Costs
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                  ${costs.fuelCost ? costs.fuelCost.toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                  Maintenance Costs
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                  ${costs.maintenanceCost ? costs.maintenanceCost.toFixed(2) : '0.00'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                  Cost Per Kilometer
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9c27b0' }}>
                  ${costs.costPerKm ? costs.costPerKm.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>
        )}

        {costs?.trends && costs.trends.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Cost Trends</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>Month</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>Fuel Cost</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>Maintenance Cost</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.trends.map((trend, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{trend.month}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                        ${trend.fuelCost.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                        ${trend.maintenanceCost.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                        ${trend.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Export Report</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  minWidth: '150px'
                }}
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: exporting ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: exporting ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {exporting ? 'Exporting...' : 'Export Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
