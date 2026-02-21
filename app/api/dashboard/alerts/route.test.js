/**
 * Dashboard Alerts API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route.js'
import { getServerSession } from 'next-auth'
import { getActiveAlerts } from '@/lib/dashboard-service'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

vi.mock('@/lib/dashboard-service', () => ({
  getActiveAlerts: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

describe('GET /api/dashboard/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    getServerSession.mockResolvedValueOnce(null)

    const req = new Request('http://localhost:3000/api/dashboard/alerts')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('AUTHENTICATION_ERROR')
  })

  it('should return alerts for authenticated user', async () => {
    getServerSession.mockResolvedValueOnce({
      user: {
        id: 'user-123',
        role: 'FLEET_MANAGER',
        email: 'manager@test.com'
      }
    })

    getActiveAlerts.mockResolvedValueOnce({
      alerts: [
        {
          type: 'LICENSE_EXPIRY',
          severity: 'high',
          message: 'Driver John Doe license expires in 5 days',
          driverId: 'driver-1',
          daysUntilExpiry: 5
        }
      ],
      count: 1,
      criticalCount: 0,
      highCount: 1,
      mediumCount: 0,
      userRole: 'FLEET_MANAGER'
    })

    const req = new Request('http://localhost:3000/api/dashboard/alerts')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.count).toBe(1)
    expect(data.data.alerts[0].type).toBe('LICENSE_EXPIRY')
    expect(getActiveAlerts).toHaveBeenCalledWith('FLEET_MANAGER', 'user-123')
  })

  it('should return driver-specific alerts', async () => {
    getServerSession.mockResolvedValueOnce({
      user: {
        id: 'user-789',
        role: 'DRIVER',
        email: 'driver@test.com'
      }
    })

    getActiveAlerts.mockResolvedValueOnce({
      alerts: [
        {
          type: 'LICENSE_EXPIRY',
          severity: 'medium',
          message: 'Your license expires in 20 days',
          daysUntilExpiry: 20
        }
      ],
      count: 1,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 1,
      userRole: 'DRIVER'
    })

    const req = new Request('http://localhost:3000/api/dashboard/alerts')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.userRole).toBe('DRIVER')
    expect(getActiveAlerts).toHaveBeenCalledWith('DRIVER', 'user-789')
  })

  it('should handle errors gracefully', async () => {
    getServerSession.mockResolvedValueOnce({
      user: {
        id: 'user-123',
        role: 'FLEET_MANAGER',
        email: 'manager@test.com'
      }
    })

    getActiveAlerts.mockRejectedValueOnce(new Error('Database error'))

    const req = new Request('http://localhost:3000/api/dashboard/alerts')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('SERVER_ERROR')
  })
})
