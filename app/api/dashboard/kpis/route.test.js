/**
 * Dashboard KPIs API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route.js'
import { getServerSession } from 'next-auth'
import { getDashboardKPIs } from '@/lib/dashboard-service'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/dashboard-service', () => ({
  getDashboardKPIs: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

describe('GET /api/dashboard/kpis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    getServerSession.mockResolvedValueOnce(null)

    const req = new Request('http://localhost:3000/api/dashboard/kpis')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('AUTHENTICATION_ERROR')
  })

  it('should return dashboard KPIs for authenticated user', async () => {
    getServerSession.mockResolvedValueOnce({
      user: {
        id: 'user-123',
        role: 'FLEET_MANAGER',
        email: 'manager@test.com'
      }
    })

    getDashboardKPIs.mockResolvedValueOnce({
      activeFleet: 5,
      maintenanceAlerts: 2,
      utilizationRate: 50,
      pendingCargo: 8,
      availableVehicles: 3,
      totalVehicles: 12,
      totalAvailableVehicles: 10,
      filters: {},
      userRole: 'FLEET_MANAGER'
    })

    const req = new Request('http://localhost:3000/api/dashboard/kpis')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.activeFleet).toBe(5)
    expect(data.data.utilizationRate).toBe(50)
    expect(getDashboardKPIs).toHaveBeenCalledWith('FLEET_MANAGER', 'user-123', {})
  })

  it('should pass filters to getDashboardKPIs', async () => {
    getServerSession.mockResolvedValueOnce({
      user: {
        id: 'user-456',
        role: 'DISPATCHER',
        email: 'dispatcher@test.com'
      }
    })

    getDashboardKPIs.mockResolvedValueOnce({
      activeFleet: 2,
      maintenanceAlerts: 1,
      utilizationRate: 40,
      pendingCargo: 3,
      availableVehicles: 2,
      totalVehicles: 5,
      totalAvailableVehicles: 5,
      filters: { type: 'TRUCK' },
      userRole: 'DISPATCHER'
    })

    const req = new Request('http://localhost:3000/api/dashboard/kpis?type=TRUCK')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(getDashboardKPIs).toHaveBeenCalledWith('DISPATCHER', 'user-456', { type: 'TRUCK' })
  })

  it('should handle errors gracefully', async () => {
    getServerSession.mockResolvedValueOnce({
      user: {
        id: 'user-123',
        role: 'FLEET_MANAGER',
        email: 'manager@test.com'
      }
    })

    getDashboardKPIs.mockRejectedValueOnce(new Error('Database error'))

    const req = new Request('http://localhost:3000/api/dashboard/kpis')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('SERVER_ERROR')
  })
})
