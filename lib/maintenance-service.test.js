/**
 * Maintenance Service Tests
 * Tests for maintenance CRUD operations and status management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from './prisma.js'
import {
  createMaintenanceLog,
  completeMaintenanceLog,
  getMaintenanceHistory,
  getMaintenanceCost,
  updateMaintenanceLog
} from './maintenance-service.js'

describe('Maintenance Service', () => {
  let testUser
  let testVehicle

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `maintenance-test-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        role: 'FLEET_MANAGER'
      }
    })

    // Create test vehicle
    testVehicle = await prisma.vehicle.create({
      data: {
        name: 'Test Maintenance Vehicle',
        model: 'Test Model',
        licensePlate: `TEST-MAINT-${Date.now()}`,
        type: 'VAN',
        maxLoadCapacity: 1000,
        odometer: 50000,
        status: 'AVAILABLE'
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.maintenanceLog.deleteMany({
      where: { vehicleId: testVehicle.id }
    })
    await prisma.vehicle.delete({
      where: { id: testVehicle.id }
    })
    await prisma.user.delete({
      where: { id: testUser.id }
    })
  })

  describe('createMaintenanceLog', () => {
    it('should create maintenance log and update vehicle status to IN_SHOP', async () => {
      const maintenanceData = {
        vehicleId: testVehicle.id,
        serviceType: 'Oil Change',
        description: 'Regular oil change service',
        cost: 150.50,
        odometer: 50000,
        serviceDate: new Date()
      }

      const maintenanceLog = await createMaintenanceLog(maintenanceData, testUser.id)

      expect(maintenanceLog).toBeDefined()
      expect(maintenanceLog.id).toBeDefined()
      expect(maintenanceLog.vehicleId).toBe(testVehicle.id)
      expect(maintenanceLog.serviceType).toBe('Oil Change')
      expect(maintenanceLog.cost).toBe(150.50)
      expect(maintenanceLog.createdBy).toBe(testUser.id)

      // Verify vehicle status was updated to IN_SHOP
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id }
      })
      expect(updatedVehicle.status).toBe('IN_SHOP')
    })

    it('should reject maintenance log with invalid vehicle ID', async () => {
      const maintenanceData = {
        vehicleId: 'invalid-vehicle-id',
        serviceType: 'Oil Change',
        cost: 150.50,
        odometer: 50000,
        serviceDate: new Date()
      }

      await expect(
        createMaintenanceLog(maintenanceData, testUser.id)
      ).rejects.toThrow()
    })
  })

  describe('completeMaintenanceLog', () => {
    it('should complete maintenance log and restore vehicle status to AVAILABLE', async () => {
      // Create a maintenance log first
      const maintenanceData = {
        vehicleId: testVehicle.id,
        serviceType: 'Brake Inspection',
        cost: 200,
        odometer: 50100,
        serviceDate: new Date()
      }

      const maintenanceLog = await createMaintenanceLog(maintenanceData, testUser.id)

      // Complete the maintenance log
      const completedLog = await completeMaintenanceLog(maintenanceLog.id)

      expect(completedLog.completedAt).toBeDefined()
      expect(completedLog.completedAt).toBeInstanceOf(Date)

      // Verify vehicle status was restored to AVAILABLE
      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: testVehicle.id }
      })
      expect(updatedVehicle.status).toBe('AVAILABLE')
    })

    it('should reject completing non-existent maintenance log', async () => {
      await expect(
        completeMaintenanceLog('non-existent-id')
      ).rejects.toThrow('Maintenance log not found')
    })
  })

  describe('getMaintenanceHistory', () => {
    it('should return maintenance history for a vehicle', async () => {
      const history = await getMaintenanceHistory(testVehicle.id)

      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].vehicleId).toBe(testVehicle.id)
    })

    it('should filter maintenance history by date range', async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date()

      const history = await getMaintenanceHistory(testVehicle.id, {
        startDate,
        endDate
      })

      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('getMaintenanceCost', () => {
    it('should calculate total maintenance cost for a vehicle', async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date()

      const costSummary = await getMaintenanceCost(testVehicle.id, {
        start: startDate,
        end: endDate
      })

      expect(costSummary).toBeDefined()
      expect(costSummary.vehicleId).toBe(testVehicle.id)
      expect(typeof costSummary.totalCost).toBe('number')
      expect(costSummary.totalCost).toBeGreaterThan(0)
      expect(costSummary.totalServices).toBeGreaterThan(0)
      expect(costSummary.costByServiceType).toBeDefined()
    })
  })

  describe('updateMaintenanceLog', () => {
    it('should update maintenance log fields', async () => {
      // Create a maintenance log first
      const maintenanceData = {
        vehicleId: testVehicle.id,
        serviceType: 'Tire Rotation',
        cost: 100,
        odometer: 50200,
        serviceDate: new Date()
      }

      const maintenanceLog = await createMaintenanceLog(maintenanceData, testUser.id)

      // Update the maintenance log
      const updatedLog = await updateMaintenanceLog(maintenanceLog.id, {
        cost: 120,
        description: 'Tire rotation with alignment'
      })

      expect(updatedLog.cost).toBe(120)
      expect(updatedLog.description).toBe('Tire rotation with alignment')
    })
  })
})
