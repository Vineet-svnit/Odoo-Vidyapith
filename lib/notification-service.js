/**
 * Notification Service Functions
 * Handles notification creation and delivery for critical events
 * Requirements: 4.8, 7.7, 11.7, 13.1
 */

import prisma from './prisma.js'

/**
 * Send notification to specific users
 * Validates: Requirements 4.8, 11.7, 13.1
 * @param {Array<string>} userIds - Array of user IDs to notify
 * @param {string} type - Notification type (TRIP_ISSUE, BREAKDOWN, LICENSE_EXPIRY, etc.)
 * @param {string} message - Notification message
 * @param {Object} [metadata] - Optional metadata object
 * @returns {Promise<Array>} Created notification records
 * @throws {Error} If validation fails
 */
export async function sendNotification(userIds, type, message, metadata = {}) {
  // Validate inputs
  if (!Array.isArray(userIds) || userIds.length === 0) {
    const error = new Error('userIds must be a non-empty array')
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  if (!type || typeof type !== 'string') {
    const error = new Error('type is required and must be a string')
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  if (!message || typeof message !== 'string') {
    const error = new Error('message is required and must be a string')
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  try {
    // Create notifications for all specified users
    const notifications = await prisma.$transaction(
      userIds.map(userId =>
        prisma.notification.create({
          data: {
            userId,
            type,
            message,
            metadata: metadata || {},
            read: false
          }
        })
      )
    )

    return notifications
  } catch (error) {
    // Handle foreign key violations (invalid user IDs)
    if (error.code === 'P2003') {
      const err = new Error('One or more specified users do not exist')
      err.type = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }
    throw error
  }
}

/**
 * Notify Fleet Managers and Dispatchers about a trip issue
 * Validates: Requirements 4.8, 13.1
 * @param {string} tripId - Trip ID
 * @param {Object} issueData - Issue details
 * @param {string} issueData.issueDescription - Description of the issue
 * @param {string} [issueData.issueType] - Type of issue (breakdown, delay, etc.)
 * @returns {Promise<Array>} Created notification records
 * @throws {Error} If trip not found
 */
export async function notifyTripIssue(tripId, issueData) {
  const { issueDescription, issueType } = issueData

  try {
    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            licensePlate: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!trip) {
      const error = new Error('Trip not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Get all Fleet Managers and Dispatchers
    const managersAndDispatchers = await prisma.user.findMany({
      where: {
        role: {
          in: ['FLEET_MANAGER', 'DISPATCHER']
        }
      },
      select: {
        id: true
      }
    })

    if (managersAndDispatchers.length === 0) {
      // No managers or dispatchers to notify
      return []
    }

    // Determine notification type based on issue type
    const notificationType = issueType === 'breakdown' ? 'BREAKDOWN' : 'TRIP_ISSUE'

    // Create notification message
    const message = `Issue reported on trip ${tripId}: ${issueDescription}. Vehicle: ${trip.vehicle.name} (${trip.vehicle.licensePlate}), Driver: ${trip.driver.firstName} ${trip.driver.lastName}`

    // Send notifications
    const notifications = await sendNotification(
      managersAndDispatchers.map(u => u.id),
      notificationType,
      message,
      {
        tripId,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        issueType: issueType || 'general',
        issueDescription
      }
    )

    return notifications
  } catch (error) {
    throw error
  }
}

/**
 * Notify driver and Fleet Managers about license expiry
 * Validates: Requirements 7.7, 11.8
 * @param {string} driverId - Driver ID
 * @returns {Promise<Array>} Created notification records
 * @throws {Error} If driver not found
 */
export async function notifyLicenseExpiry(driverId) {
  try {
    // Get driver details
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })

    if (!driver) {
      const error = new Error('Driver not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Calculate days until expiry
    const now = new Date()
    const daysUntilExpiry = Math.ceil((driver.licenseExpiry - now) / (1000 * 60 * 60 * 24))

    // Only notify if license is expiring within 30 days or already expired
    if (daysUntilExpiry > 30) {
      return []
    }

    // Get all Fleet Managers
    const fleetManagers = await prisma.user.findMany({
      where: {
        role: 'FLEET_MANAGER'
      },
      select: {
        id: true
      }
    })

    // Create notification message
    let message
    if (daysUntilExpiry <= 0) {
      message = `Your driver license has expired. License number: ${driver.licenseNumber}. Please renew immediately.`
    } else {
      message = `Your driver license will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. License number: ${driver.licenseNumber}. Please renew before ${driver.licenseExpiry.toISOString().split('T')[0]}.`
    }

    // Notify driver and all fleet managers
    const userIdsToNotify = [
      driver.user.id,
      ...fleetManagers.map(m => m.id)
    ]

    const notifications = await sendNotification(
      userIdsToNotify,
      'LICENSE_EXPIRY',
      message,
      {
        driverId,
        licenseNumber: driver.licenseNumber,
        licenseExpiry: driver.licenseExpiry.toISOString(),
        daysUntilExpiry
      }
    )

    return notifications
  } catch (error) {
    throw error
  }
}

/**
 * Get notifications for a specific user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {boolean} [options.unreadOnly] - Only return unread notifications
 * @param {number} [options.limit] - Limit number of results
 * @returns {Promise<Array>} List of notifications
 */
export async function getUserNotifications(userId, options = {}) {
  const where = {
    userId
  }

  if (options.unreadOnly) {
    where.read = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || undefined
  })

  return notifications
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for authorization check)
 * @returns {Promise<Object>} Updated notification record
 * @throws {Error} If notification not found or user not authorized
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    // Get notification to verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      const error = new Error('Notification not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Verify user owns this notification
    if (notification.userId !== userId) {
      const error = new Error('You do not have permission to modify this notification')
      error.type = 'AUTHORIZATION_ERROR'
      error.status = 403
      throw error
    }

    // Mark as read
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    })

    return updatedNotification
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Notification not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export async function getUnreadNotificationCount(userId) {
  const count = await prisma.notification.count({
    where: {
      userId,
      read: false
    }
  })

  return count
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result with count
 */
export async function markAllNotificationsAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false
    },
    data: {
      read: true
    }
  })

  return {
    success: true,
    count: result.count
  }
}
