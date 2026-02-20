import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { validateTripCreation } from './trip-service.js'
import prisma from './prisma.js'

describe('Trip Service', () => {
  describe('validateTripCreation', () => {
    let testVehicle
    let testDriver
    let testUser

    beforeAll(async () => {
      // Create test user
      testUser = await prisma.user.create({
        data: {
          email: 'testdriver@example.com',
          passwordHash: 'hashedpassword',
          role: 'DRIVER'
        }
      })

      // Create test vehicle
      testVehicle = await prisma.vehicle.create({
        data: {
          name: 'Test Van',
          model: 'Ford Transit',
          licensePlate: 'TEST-123',
          type: 'VAN',
          maxLoadCapacity: 1000,
          odometer: 50000,
          status: 'AVAILABLE'
        }
      })

      // Create test driver
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)

      testDriver = await prisma.driver.create({
        data: {
          userId: testUser.id,
          firstName: 'Test',
          lastName: 'Driver',
          licenseNumber: 'TEST-DL-123',
          licenseCategory: 'B',
          licenseExpiry: futureDate,
          status: 'ON_DUTY'
        }
      })
    })

    afterAll(async () => {
      // Clean up test data
      await prisma.driver.deleteMany({ where: { licenseNumber: 'TEST-DL-123' } })
      await prisma.vehicle.deleteMany({ where: { licensePlate: 'TEST-123' } })
      await prisma.user.deleteMany({ where: { email: 'testdriver@example.com' } })
    })

    it('should validate trip with valid data', async () => {
      const tripData = {
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        cargoWeight: 500
      }

      const result = await validateTripCreation(tripData)
      expect(result.valid).toBe(true)
      expect(result.vehicle).toBeDefined()
      expect(result.driver).toBeDefined()
    })

    it('should reject trip when cargo exceeds vehicle capacity', async () => {
      const tripData = {
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        cargoWeight: 2000 // Exceeds 1000 capacity
      }

      const result = await validateTripCreation(tripData)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors.some(e => e.code === 'CARGO_EXCEEDS_CAPACITY')).toBe(true)
    })

    it('should reject trip when vehicle is not available', async () => {
      // Update vehicle status to IN_SHOP
      await prisma.vehicle.update({
        where: { id: testVehicle.id },
        data: { status: 'IN_SHOP' }
      })

      const tripData = {
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        cargoWeight: 500
      }

      const result = await validateTripCreation(tripData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'VEHICLE_NOT_AVAILABLE')).toBe(true)

      // Restore vehicle status
      await prisma.vehicle.update({
        where: { id: testVehicle.id },
        data: { status: 'AVAILABLE' }
      })
    })

    it('should reject trip when driver is not on duty', async () => {
      // Update driver status to OFF_DUTY
      await prisma.driver.update({
        where: { id: testDriver.id },
        data: { status: 'OFF_DUTY' }
      })

      const tripData = {
        vehicleId: testVehicle.id,
        driverId: testDriver.id,
        cargoWeight: 500
      }

      const result = await validateTripCreation(tripData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'DRIVER_NOT_ON_DUTY')).toBe(true)

      // Restore driver status
      await prisma.driver.update({
        where: { id: testDriver.id },
        data: { status: 'ON_DUTY' }
      })
    })

    it('should reject trip with non-existent vehicle', async () => {
      const tripData = {
        vehicleId: 'nonexistent-id',
        driverId: testDriver.id,
        cargoWeight: 500
      }

      const result = await validateTripCreation(tripData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'VEHICLE_NOT_FOUND')).toBe(true)
    })

    it('should reject trip with non-existent driver', async () => {
      const tripData = {
        vehicleId: testVehicle.id,
        driverId: 'nonexistent-id',
        cargoWeight: 500
      }

      const result = await validateTripCreation(tripData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'DRIVER_NOT_FOUND')).toBe(true)
    })
  })
})
