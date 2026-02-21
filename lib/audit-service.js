/**
 * Audit Logging Service
 * Provides centralized audit logging for all critical operations
 * Requirements: 9.6, 13.5
 */

import prisma from './prisma.js'
import { auditLogSchema } from './validation.js'

/**
 * Log an action to the audit trail
 * @param {Object} data - Audit log data
 * @param {string} data.userId - ID of the user performing the action
 * @param {string} data.action - Action being performed (e.g., 'CREATE_VEHICLE', 'UPDATE_TRIP')
 * @param {string} data.resource - Resource type (e.g., 'vehicle', 'trip', 'driver')
 * @param {string} [data.resourceId] - ID of the specific resource being acted upon
 * @param {Object} [data.metadata] - Additional context about the action
 * @returns {Promise<Object>} Created audit log entry
 * @throws {Error} If validation fails or database operation fails
 */
export async function logAction(data) {
  // Validate input
  const validation = auditLogSchema.safeParse(data)
  if (!validation.success) {
    const error = new Error('Audit log validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
    throw error
  }

  try {
    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        metadata: data.metadata || null
      }
    })

    return auditLog
  } catch (error) {
    console.error('Error creating audit log:', error)
    throw error
  }
}

/**
 * Get audit logs with filtering
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.userId] - Filter by user ID
 * @param {string} [filters.action] - Filter by action type
 * @param {string} [filters.resource] - Filter by resource type
 * @param {string} [filters.resourceId] - Filter by resource ID
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @param {number} [filters.limit] - Maximum number of results
 * @param {number} [filters.offset] - Number of results to skip
 * @returns {Promise<Array>} Array of audit log entries
 */
export async function getAuditLogs(filters = {}) {
  const where = {}

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.action) {
    where.action = filters.action
  }

  if (filters.resource) {
    where.resource = filters.resource
  }

  if (filters.resourceId) {
    where.resourceId = filters.resourceId
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate
    }
  }

  try {
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters.limit || 100,
      skip: filters.offset || 0
    })

    return auditLogs
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw error
  }
}

/**
 * Get total count of audit logs matching filters
 * @param {Object} filters - Filter criteria (same as getAuditLogs)
 * @returns {Promise<number>} Total count of matching audit logs
 */
export async function getAuditLogsCount(filters = {}) {
  const where = {}

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.action) {
    where.action = filters.action
  }

  if (filters.resource) {
    where.resource = filters.resource
  }

  if (filters.resourceId) {
    where.resourceId = filters.resourceId
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {}
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate
    }
  }

  try {
    const count = await prisma.auditLog.count({ where })
    return count
  } catch (error) {
    console.error('Error counting audit logs:', error)
    throw error
  }
}
