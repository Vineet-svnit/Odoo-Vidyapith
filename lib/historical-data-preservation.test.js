/**
 * Historical Data Preservation Tests
 * Validates: Requirements 14.4, 14.5
 * Tests that soft delete preserves historical trip and expense records
 */

import { describe, it, expect } from 'vitest'
import prisma from './prisma.js'

describe('Historical Data Preservation', () => {
  describe('Vehicle Historical Data Preservation (Requirement 14.4)', () => {
    it('should preserve vehicle record when marked OUT_OF_SERVICE', async () => {
      // Create a test vehicle
      const vehicle = await prisma.vehicle.create({
        data: {
          id: `test-vehicle-${Date.now()}`,
          name: 'Test Vehicle',
          model: 'Test Model',
          licensePlate: `TEST-${Date.now()}`,
          type: 'VAN',
          maxLoadCapacity: 1000,
          odometer: 10000,
          status: 'AVAILABLE'
        }
      })

      // Mark vehicle as OUT_OF_SERVICE (soft delete)
      const retiredVehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'OUT_OF_SERVICE' }
      })

      // Verify vehicle is marked as OUT_OF_SERVICE
      expect(retiredVehicle.status).toBe('OUT_OF_SERVICE')

      // Verify vehicle record still exists in database
      const queriedVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicle.id }
      })

      expect(queriedVehicle).toBeDefined()
      expect(queriedVehicle.id).toBe(vehicle.id)
      expect(queriedVehicle.status).toBe('OUT_OF_SERVICE')

      // Clean up
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
    })

    it('should preserve trip records when vehicle is marked OUT_OF_SERVICE', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: `test-user-${Date.now()}`,
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          role: 'FLEET_MANAGER'
        }
      })

      // Create test vehicle
      const vehicle = await prisma.vehicle.create({
        data: {
          id: `test-vehicle-${Date.now()}`,
          name: 'Test Vehicle',
          model: 'Test Model',
          licensePlate: `TEST-${Date.now()}`,
          type: 'VAN',
          maxLoadCapacity: 1000,
          odometer: 10000,
          status: 'AVAILABLE'
        }
      })

      // Create test driver
      const driver = await prisma.driver.create({
        data: {
          id: `test-driver-${Date.now()}`,
          userId: user.id,
          firstName: 'Test',
          lastName: 'Driver',
          licenseNumber: `LIC-${Date.now()}`,
          licenseCategory: 'B',
          licenseExpiry: new Date('2027-12-31'),
          status: 'ON_DUTY'
        }
      })

      // Create test trip
      const trip = await prisma.trip.create({
        data: {
          id: `test-trip-${Date.now()}`,
          vehicleId: vehicle.id,
          driverId: driver.id,
          cargoWeight: 500,
          origin: 'Test Origin',
          destination: 'Test Destination',
          status: 'DRAFT',
          createdBy: user.id
        }
      })

      // Mark vehicle as OUT_OF_SERVICE
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'OUT_OF_SERVICE' }
      })

      // Verify trip record still exists and references the retired vehicle
      const queriedTrip = await prisma.trip.findUnique({
        where: { id: trip.id }
      })

      expect(queriedTrip).toBeDefined()
      expect(queriedTrip.vehicleId).toBe(vehicle.id)

      // Clean up
      await prisma.trip.delete({ where: { id: trip.id } })
      await prisma.driver.delete({ where: { id: driver.id } })
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should preserve expense records when vehicle is marked OUT_OF_SERVICE', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: `test-user-${Date.now()}`,
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          role: 'FLEET_MANAGER'
        }
      })

      // Create test vehicle
      const vehicle = await prisma.vehicle.create({
        data: {
          id: `test-vehicle-${Date.now()}`,
          name: 'Test Vehicle',
          model: 'Test Model',
          licensePlate: `TEST-${Date.now()}`,
          type: 'VAN',
          maxLoadCapacity: 1000,
          odometer: 10000,
          status: 'AVAILABLE'
        }
      })

      // Create fuel log
      const fuelLog = await prisma.fuelLog.create({
        data: {
          id: `test-fuel-${Date.now()}`,
          vehicleId: vehicle.id,
          liters: 50,
          cost: 100,
          pricePerLiter: 2,
          odometer: 10500,
          fuelDate: new Date(),
          createdBy: user.id
        }
      })

      // Mark vehicle as OUT_OF_SERVICE
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'OUT_OF_SERVICE' }
      })

      // Verify fuel log still exists and references the retired vehicle
      const queriedFuelLog = await prisma.fuelLog.findUnique({
        where: { id: fuelLog.id }
      })

      expect(queriedFuelLog).toBeDefined()
      expect(queriedFuelLog.vehicleId).toBe(vehicle.id)

      // Clean up
      await prisma.fuelLog.delete({ where: { id: fuelLog.id } })
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })
  })

  describe('Driver Historical Data Preservation (Requirement 14.5)', () => {
    it('should preserve driver record when marked SUSPENDED', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: `test-user-${Date.now()}`,
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          role: 'DRIVER'
        }
      })

      // Create test driver
      const driver = await prisma.driver.create({
        data: {
          id: `test-driver-${Date.now()}`,
          userId: user.id,
          firstName: 'Test',
          lastName: 'Driver',
          licenseNumber: `LIC-${Date.now()}`,
          licenseCategory: 'B',
          licenseExpiry: new Date('2027-12-31'),
          status: 'ON_DUTY'
        }
      })

      // Mark driver as SUSPENDED (soft delete)
      const suspendedDriver = await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'SUSPENDED' }
      })

      // Verify driver is marked as SUSPENDED
      expect(suspendedDriver.status).toBe('SUSPENDED')

      // Verify driver record still exists in database
      const queriedDriver = await prisma.driver.findUnique({
        where: { id: driver.id }
      })

      expect(queriedDriver).toBeDefined()
      expect(queriedDriver.id).toBe(driver.id)
      expect(queriedDriver.status).toBe('SUSPENDED')

      // Clean up
      await prisma.driver.delete({ where: { id: driver.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should preserve trip completion records when driver is suspended', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: `test-user-${Date.now()}`,
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          role: 'DRIVER'
        }
      })

      // Create test driver
      const driver = await prisma.driver.create({
        data: {
          id: `test-driver-${Date.now()}`,
          userId: user.id,
          firstName: 'Test',
          lastName: 'Driver',
          licenseNumber: `LIC-${Date.now()}`,
          licenseCategory: 'B',
          licenseExpiry: new Date('2027-12-31'),
          status: 'ON_DUTY'
        }
      })

      // Create test vehicle
      const vehicle = await prisma.vehicle.create({
        data: {
          id: `test-vehicle-${Date.now()}`,
          name: 'Test Vehicle',
          model: 'Test Model',
          licensePlate: `TEST-${Date.now()}`,
          type: 'VAN',
          maxLoadCapacity: 1000,
          odometer: 10000,
          status: 'AVAILABLE'
        }
      })

      // Create test trip
      const trip = await prisma.trip.create({
        data: {
          id: `test-trip-${Date.now()}`,
          vehicleId: vehicle.id,
          driverId: driver.id,
          cargoWeight: 500,
          origin: 'Test Origin',
          destination: 'Test Destination',
          status: 'COMPLETED',
          createdBy: user.id
        }
      })

      // Mark driver as SUSPENDED
      await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'SUSPENDED' }
      })

      // Verify trip record still exists and references the suspended driver
      const queriedTrip = await prisma.trip.findUnique({
        where: { id: trip.id }
      })

      expect(queriedTrip).toBeDefined()
      expect(queriedTrip.driverId).toBe(driver.id)

      // Clean up
      await prisma.trip.delete({ where: { id: trip.id } })
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
      await prisma.driver.delete({ where: { id: driver.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })
  })
})

