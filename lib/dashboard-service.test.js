/**
 * Dashboard Service Tests
 * Unit tests for dashboard KPIs and alerts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDashboardKPIs, getActiveAlerts } from './dashboard-service.js'
import prisma from './prisma.js'

// Mock Prisma
vi.mock('./prisma.js', () => ({
  default: {
    vehicle: {
      count: vi.fn()
    },
    trip: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    driver: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    maintenanceLog: {
      findMany: vi.fn()
    }
  }
}))

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboardKPIs', () => {
    it('should calculate KPIs for FLEET_MANAGER', async () => {
      // Mock vehicle counts
      prisma.vehicle.count
        .mockResolvedValueOnce(5) // activeFleet (ON_TRIP)
        .mockResolvedValueOnce(2) // maintenanceAlerts (IN_SHOP)
        .mockResolvedValueOnce(10) // totalAvailableVehicles (not OUT_OF_SERVICE)
        .mockResolvedValueOnce(3) // availableVehicles (AVAILABLE)
        .mockResolvedValueOnce(12) // totalVehicles

      // Mock trip count
      prisma.trip.count.mockResolvedValueOnce(8) // pendingCargo (DRAFT)

      const result = await getDashboardKPIs('FLEET_MANAGER', 'user-123', {})

      expect(result.activeFleet).toBe(5)
      expect(result.maintenanceAlerts).toBe(2)
      expect(result.utilizationRate).toBe(50) // (5/10) * 100
      expect(result.pendingCargo).toBe(8)
      expect(result.availableVehicles).toBe(3)
      expect(result.totalVehicles).toBe(12)
      expect(result.userRole).toBe('FLEET_MANAGER')
    })

    it('should calculate KPIs for DRIVER with assigned trips', async () => {
      // Mock driver lookup
      prisma.driver.findUnique.mockResolvedValueOnce({
        id: 'driver-123',
        userId: 'user-123'
      })

      // Mock vehicle counts
      prisma.vehicle.count
        .mockResolvedValueOnce(5) // activeFleet
        .mockResolvedValueOnce(2) // maintenanceAlerts
        .mockResolvedValueOnce(10) // totalAvailableVehicles
        .mockResolvedValueOnce(3) // availableVehicles
        .mockResolvedValueOnce(12) // totalVehicles

      // Mock trip counts
      prisma.trip.count
        .mockResolvedValueOnce(2) // pendingCargo
        .mockResolvedValueOnce(3) // assignedTrips
        .mockResolvedValueOnce(15) // completedTrips

      const result = await getDashboardKPIs('DRIVER', 'user-123', {})

      expect(result.activeFleet).toBe(5)
      expect(result.assignedTrips).toBe(3)
      expect(result.completedTrips).toBe(15)
      expect(result.userRole).toBe('DRIVER')
    })

    it('should handle filters correctly', async () => {
      prisma.vehicle.count
        .mockResolvedValueOnce(2) // activeFleet
        .mockResolvedValueOnce(1) // maintenanceAlerts
        .mockResolvedValueOnce(5) // totalAvailableVehicles
        .mockResolvedValueOnce(2) // availableVehicles
        .mockResolvedValueOnce(6) // totalVehicles

      prisma.trip.count.mockResolvedValueOnce(3) // pendingCargo

      const filters = { type: 'TRUCK', status: 'AVAILABLE' }
      const result = await getDashboardKPIs('DISPATCHER', 'user-456', filters)

      expect(result.filters).toEqual(filters)
      expect(prisma.vehicle.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'TRUCK'
          })
        })
      )
    })

    it('should handle zero vehicles gracefully', async () => {
      prisma.vehicle.count
        .mockResolvedValueOnce(0) // activeFleet
        .mockResolvedValueOnce(0) // maintenanceAlerts
        .mockResolvedValueOnce(0) // totalAvailableVehicles
        .mockResolvedValueOnce(0) // availableVehicles
        .mockResolvedValueOnce(0) // totalVehicles

      prisma.trip.count.mockResolvedValueOnce(0) // pendingCargo

      const result = await getDashboardKPIs('FLEET_MANAGER', 'user-123', {})

      expect(result.utilizationRate).toBe(0)
      expect(result.activeFleet).toBe(0)
    })
  })

  describe('getActiveAlerts', () => {
    it('should return license expiry alerts for FLEET_MANAGER', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      prisma.driver.findMany
        .mockResolvedValueOnce([
          {
            id: 'driver-1',
            firstName: 'John',
            lastName: 'Doe',
            licenseNumber: 'LIC123',
            licenseExpiry: futureDate
          }
        ]) // expiring licenses
        .mockResolvedValueOnce([]) // expired licenses

      prisma.trip.findMany.mockResolvedValueOnce([]) // issue trips
      prisma.maintenanceLog.findMany.mockResolvedValueOnce([]) // extended maintenance

      const result = await getActiveAlerts('FLEET_MANAGER', 'user-123')

      expect(result.alerts.length).toBeGreaterThan(0)
      expect(result.alerts[0].type).toBe('LICENSE_EXPIRY')
      expect(result.alerts[0].severity).toBe('medium')
      expect(result.count).toBeGreaterThan(0)
    })

    it('should return trip issue alerts for DISPATCHER', async () => {
      prisma.driver.findMany
        .mockResolvedValueOnce([]) // expiring licenses
        .mockResolvedValueOnce([]) // expired licenses

      prisma.trip.findMany.mockResolvedValueOnce([
        {
          id: 'trip-1',
          origin: 'City A',
          destination: 'City B',
          issueReported: true,
          issueDescription: 'Engine problem',
          Vehicle: {
            name: 'Truck 1',
            licensePlate: 'ABC123'
          },
          Driver: {
            firstName: 'Jane',
            lastName: 'Smith'
          }
        }
      ])

      prisma.maintenanceLog.findMany.mockResolvedValueOnce([])

      const result = await getActiveAlerts('DISPATCHER', 'user-456')

      expect(result.alerts.length).toBeGreaterThan(0)
      expect(result.alerts[0].type).toBe('TRIP_ISSUE')
      expect(result.alerts[0].severity).toBe('high')
    })

    it('should return driver-specific alerts for DRIVER role', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)

      prisma.driver.findUnique.mockResolvedValueOnce({
        id: 'driver-1',
        firstName: 'John',
        lastName: 'Doe',
        licenseExpiry: futureDate,
        licenseNumber: 'LIC123'
      })

      prisma.trip.findMany.mockResolvedValueOnce([]) // overdue trips

      const result = await getActiveAlerts('DRIVER', 'user-789')

      expect(result.alerts.length).toBeGreaterThan(0)
      expect(result.alerts[0].type).toBe('LICENSE_EXPIRY')
      expect(result.alerts[0].severity).toBe('high')
      expect(result.userRole).toBe('DRIVER')
    })

    it('should sort alerts by severity', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15)

      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 5)

      prisma.driver.findMany
        .mockResolvedValueOnce([
          {
            id: 'driver-1',
            firstName: 'John',
            lastName: 'Doe',
            licenseNumber: 'LIC123',
            licenseExpiry: futureDate
          }
        ])
        .mockResolvedValueOnce([
          {
            id: 'driver-2',
            firstName: 'Jane',
            lastName: 'Smith',
            licenseNumber: 'LIC456',
            licenseExpiry: expiredDate
          }
        ])

      prisma.trip.findMany.mockResolvedValueOnce([])
      prisma.maintenanceLog.findMany.mockResolvedValueOnce([])

      const result = await getActiveAlerts('FLEET_MANAGER', 'user-123')

      // Critical alerts should come first
      expect(result.alerts[0].severity).toBe('critical')
      expect(result.criticalCount).toBe(1)
      expect(result.mediumCount).toBe(1)
    })
  })
})
