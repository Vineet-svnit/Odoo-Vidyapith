/**
 * Driver Service Unit Tests
 * Tests for driver CRUD operations and helper functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createDriver,
  updateDriver,
  checkLicenseValidity,
  getDriverPerformance,
  getExpiringLicenses,
  updateSafetyScore,
  updateDriverStatus,
  getDriverById,
  getAllDrivers,
  getAvailableDrivers,
  isLicenseCategoryValid
} from './driver-service.js'
import prisma from './prisma.js'

describe('Driver Service', () => {
  let testUser
  let testDriver

  beforeEach(async () => {
    // Create a test user for driver
    testUser = await prisma.user.create({
      data: {
        email: `test-driver-${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        role: 'DRIVER'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    if (testDriver) {
      await prisma.driver.delete({ where: { id: testDriver.id } }).catch(() => {})
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {})
    }
  })

  describe('createDriver', () => {
    it('should create a driver with valid data', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2) // 2 years in the future
      
      const driverData = {
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: `LIC-${Date.now()}`,
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      testDriver = await createDriver(driverData)

      expect(testDriver.id).toBeDefined()
      expect(testDriver.firstName).toBe('John')
      expect(testDriver.lastName).toBe('Doe')
      expect(testDriver.status).toBe('ON_DUTY')
      expect(testDriver.user).toBeDefined()
      expect(testDriver.user.email).toBe(testUser.email)
    })

    it('should reject driver with expired license', async () => {
      const driverData = {
        userId: testUser.id,
        firstName: 'Jane',
        lastName: 'Doe',
        licenseNumber: `LIC-${Date.now()}`,
        licenseCategory: 'B',
        licenseExpiry: new Date('2020-01-01') // Expired
      }

      await expect(createDriver(driverData)).rejects.toThrow()
    })

    it('should reject duplicate license number', async () => {
      const licenseNumber = `LIC-${Date.now()}`
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)
      
      const driverData1 = {
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber,
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      testDriver = await createDriver(driverData1)

      // Create another user for second driver
      const testUser2 = await prisma.user.create({
        data: {
          email: `test-driver-2-${Date.now()}@example.com`,
          passwordHash: 'hashed_password',
          role: 'DRIVER'
        }
      })

      const driverData2 = {
        userId: testUser2.id,
        firstName: 'Jane',
        lastName: 'Doe',
        licenseNumber, // Same license number
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      await expect(createDriver(driverData2)).rejects.toThrow('license number already exists')

      // Clean up
      await prisma.user.delete({ where: { id: testUser2.id } })
    })
  })

  describe('checkLicenseValidity', () => {
    it('should return valid for non-expired license', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)
      
      const driverData = {
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: `LIC-${Date.now()}`,
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      testDriver = await createDriver(driverData)

      const validity = await checkLicenseValidity(testDriver.id)

      expect(validity.isValid).toBe(true)
      expect(validity.daysUntilExpiry).toBeGreaterThan(0)
    })
  })

  describe('updateSafetyScore', () => {
    it('should update driver safety score', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)
      
      const driverData = {
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: `LIC-${Date.now()}`,
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      testDriver = await createDriver(driverData)

      const updated = await updateSafetyScore(testDriver.id, 85)

      expect(updated.safetyScore).toBe(85)
    })

    it('should reject invalid safety score', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)
      
      const driverData = {
        userId: testUser.id,
        firstName: 'John',
        lastName: 'Doe',
        licenseNumber: `LIC-${Date.now()}`,
        licenseCategory: 'B',
        licenseExpiry: futureDate
      }

      testDriver = await createDriver(driverData)

      await expect(updateSafetyScore(testDriver.id, 150)).rejects.toThrow()
      await expect(updateSafetyScore(testDriver.id, -10)).rejects.toThrow()
    })
  })

  describe('isLicenseCategoryValid', () => {
    it('should validate license category for vehicle type', () => {
      expect(isLicenseCategoryValid('A', 'BIKE')).toBe(true)
      expect(isLicenseCategoryValid('B', 'VAN')).toBe(true)
      expect(isLicenseCategoryValid('C', 'TRUCK')).toBe(true)
      expect(isLicenseCategoryValid('A', 'TRUCK')).toBe(false)
      expect(isLicenseCategoryValid('B', 'BIKE')).toBe(false)
    })
  })
})
