/**
 * Notification Service Tests
 * Tests for notification creation and delivery
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from './prisma.js'
import {
  sendNotification,
  notifyTripIssue,
  notifyLicenseExpiry,
  getUserNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount
} from './notification-service.js'

describe('Notification Service', () => {
  let testFleetManager
  let testDispatcher
  let testDriver
  let testDriverProfile
  let testVehicle
  let testTrip

  beforeAll(async () => {
    // Create test users
    testFleetManager = await prisma.user.create({
      data: {
        email: `fleet-manager-notif-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        role: 'FLEET_MANAGER'
      }
    })

    testDispatcher = await prisma.user.create({
      data: {
        email: `dispatcher-notif-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        role: 'DISPATCHER'
      }
    })

    testDriver = await prisma.user.create({
      data: {
        email: `driver-notif-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        role: 'DRIVER'
      }
    })

    // Create test driver profile
    testDriverProfile = await prisma.driver.create({
      data: {
        userId: testDriver.id,
        firstName: 'Test',
        lastName: 'Driver',
        licenseNumber: `LIC-NOTIF-${Date.now()}`,
        licenseCategory: 'B',
        licenseExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        status: 'ON_DUTY'
      }
    })

    // Create test vehicle
    testVehicle = await prisma.vehicle.create({
      data: {
        name: 'Test Notification Vehicle',
        model: 'Test Model',
        licensePlate: `TEST-NOTIF-${Date.now()}`,
        type: 'VAN',
        maxLoadCapacity: 1000,
        odometer: 50000,
        status: 'AVAILABLE'
      }
    })

    // Create test trip
    testTrip = await prisma.trip.create({
      data: {
        vehicleId: testVehicle.id,
        driverId: testDriverProfile.id,
        cargoWeight: 500,
        cargoDescription: 'Test cargo',
        origin: 'Test Origin',
        destination: 'Test Destination',
        status: 'DISPATCHED',
        createdBy: testDispatcher.id
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({
      where: {
        userId: {
          in: [testFleetManager.id, testDispatcher.id, testDriver.id]
        }
      }
    })
    await prisma.trip.deleteMany({
      where: { id: testTrip.id }
    })
    await prisma.driver.deleteMany({
      where: { id: testDriverProfile.id }
    })
    await prisma.vehicle.deleteMany({
      where: { id: testVehicle.id }
    })
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testFleetManager.id, testDispatcher.id, testDriver.id]
        }
      }
    })
  })

  describe('sendNotification', () => {
    it('should send notification to specified users', async () => {
      const notifications = await sendNotification(
        [testFleetManager.id, testDispatcher.id],
        'TEST_NOTIFICATION',
        'This is a test notification',
        { testData: 'test' }
      )

      expect(notifications).toHaveLength(2)
      expect(notifications[0].type).toBe('TEST_NOTIFICATION')
      expect(notifications[0].message).toBe('This is a test notification')
      expect(notifications[0].read).toBe(false)
    })

    it('should throw error for empty userIds array', async () => {
      await expect(
        sendNotification([], 'TEST', 'Message')
      ).rejects.toThrow('userIds must be a non-empty array')
    })

    it('should throw error for missing type', async () => {
      await expect(
        sendNotification([testFleetManager.id], '', 'Message')
      ).rejects.toThrow('type is required and must be a string')
    })

    it('should throw error for missing message', async () => {
      await expect(
        sendNotification([testFleetManager.id], 'TEST', '')
      ).rejects.toThrow('message is required and must be a string')
    })
  })

  describe('notifyTripIssue', () => {
    it('should notify fleet managers and dispatchers about trip issue', async () => {
      const notifications = await notifyTripIssue(testTrip.id, {
        issueDescription: 'Vehicle breakdown',
        issueType: 'breakdown'
      })

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].type).toBe('BREAKDOWN')
      expect(notifications[0].message).toContain('Vehicle breakdown')
    })

    it('should throw error for non-existent trip', async () => {
      await expect(
        notifyTripIssue('non-existent-id', {
          issueDescription: 'Test issue'
        })
      ).rejects.toThrow('Trip not found')
    })
  })

  describe('notifyLicenseExpiry', () => {
    it('should notify driver and fleet managers about license expiry', async () => {
      const notifications = await notifyLicenseExpiry(testDriverProfile.id)

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].type).toBe('LICENSE_EXPIRY')
      expect(notifications[0].message).toContain('license will expire')
    })

    it('should throw error for non-existent driver', async () => {
      await expect(
        notifyLicenseExpiry('non-existent-id')
      ).rejects.toThrow('Driver not found')
    })
  })

  describe('getUserNotifications', () => {
    it('should get all notifications for a user', async () => {
      // Create a test notification
      await sendNotification(
        [testFleetManager.id],
        'TEST',
        'Test message'
      )

      const notifications = await getUserNotifications(testFleetManager.id)

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].userId).toBe(testFleetManager.id)
    })

    it('should filter unread notifications only', async () => {
      const notifications = await getUserNotifications(testFleetManager.id, {
        unreadOnly: true
      })

      notifications.forEach(notif => {
        expect(notif.read).toBe(false)
      })
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      // Create a test notification
      const [notification] = await sendNotification(
        [testFleetManager.id],
        'TEST',
        'Test message'
      )

      const updated = await markNotificationAsRead(notification.id, testFleetManager.id)

      expect(updated.read).toBe(true)
    })

    it('should throw error for unauthorized user', async () => {
      // Create a notification for fleet manager
      const [notification] = await sendNotification(
        [testFleetManager.id],
        'TEST',
        'Test message'
      )

      // Try to mark it as read by dispatcher (different user)
      await expect(
        markNotificationAsRead(notification.id, testDispatcher.id)
      ).rejects.toThrow('You do not have permission to modify this notification')
    })
  })

  describe('getUnreadNotificationCount', () => {
    it('should return correct unread count', async () => {
      // Create some test notifications
      await sendNotification(
        [testDriver.id],
        'TEST',
        'Test message 1'
      )
      await sendNotification(
        [testDriver.id],
        'TEST',
        'Test message 2'
      )

      const count = await getUnreadNotificationCount(testDriver.id)

      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
})
