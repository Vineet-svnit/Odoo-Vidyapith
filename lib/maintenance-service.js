/**
 * Maintenance Service Functions
 * Handles maintenance CRUD operations, status management, and cost tracking
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import prisma from './prisma.js'
import { maintenanceSchema, maintenanceUpdateSchema, validateData } from './validation.js'
import { updateVehicleStatus } from './vehicle-service.js'

/**
 * Create a new maintenance log with automatic vehicle status update
 * Validates: Requirements 5.1, 5.2
 * @param {Object} maintenanceData - Maintenance data to create
 * @param {string} maintenanceData.vehicleId - Vehicle ID
 * @param {string} maintenanceData.serviceType - Type of service
 * @param {string} [maintenanceData.description] - Optional description
 * @param {number} maintenanceData.cost - Service cost
 * @param {number} maintenanceData.odometer - Odometer reading at service
 * @param {Date} maintenanceData.serviceDate - Date of service
 * @param {string} createdBy - User ID of the creator
 * @returns {Promise<Object>} Created maintenance log record
 * @throws {Error} If validation fails or vehicle not found
 */
export async function createMaintenanceLog(maintenanceData, createdBy) {
  // Validate input data
  const validation = validateData(maintenanceSchema, maintenanceData)
  if (!validation.success) {
    const error = new Error('Maintenance validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Create maintenance log and update vehicle status in a transaction
    const maintenanceLog = await prisma.$transaction(async (tx) => {
      // Check if vehicle exists
      const vehicle = await tx.vehicle.findUnique({
        where: { id: maintenanceData.vehicleId }
      })

      if (!vehicle) {
        const error = new Error('The specified vehicle does not exist')
        error.type = 'VALIDATION_ERROR'
        error.status = 400
        throw error
      }

      // Create the maintenance log
      const log = await tx.maintenanceLog.create({
        data: {
          ...validation.data,
          createdBy
        },
        include: {
          vehicle: {
            select: {
              id: true,
              name: true,
              licensePlate: true,
              type: true,
              status: true
            }
          }
        }
      })

      // Automatically update vehicle status to IN_SHOP
      await tx.vehicle.update({
        where: { id: maintenanceData.vehicleId },
        data: { status: 'IN_SHOP' }
      })

      return log
    })

    return maintenanceLog
  } catch (error) {
    // Handle foreign key violations
    if (error.code === 'P2003') {
      const err = new Error('The specified vehicle does not exist')
      err.type = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }
    throw error
  }
}

/**
 * Complete a maintenance log and restore vehicle status
 * Validates: Requirements 5.3
 * @param {string} logId - Maintenance log ID
 * @returns {Promise<Object>} Updated maintenance log record
 * @throws {Error} If maintenance log not found
 */
export async function completeMaintenanceLog(logId) {
  try {
    // Complete maintenance and update vehicle status in a transaction
    const maintenanceLog = await prisma.$transaction(async (tx) => {
      // Get the maintenance log
      const log = await tx.maintenanceLog.findUnique({
        where: { id: logId },
        include: {
          vehicle: true
        }
      })

      if (!log) {
        const error = new Error('Maintenance log not found')
        error.type = 'NOT_FOUND_ERROR'
        error.status = 404
        throw error
      }

      // Check if already completed
      if (log.completedAt) {
        const error = new Error('Maintenance log is already marked as completed')
        error.type = 'BUSINESS_RULE_VIOLATION'
        error.status = 422
        throw error
      }

      // Update maintenance log with completion timestamp
      const updatedLog = await tx.maintenanceLog.update({
        where: { id: logId },
        data: { completedAt: new Date() },
        include: {
          vehicle: {
            select: {
              id: true,
              name: true,
              licensePlate: true,
              type: true,
              status: true
            }
          }
        }
      })

      // Restore vehicle status to AVAILABLE
      await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: 'AVAILABLE' }
      })

      return updatedLog
    })

    return maintenanceLog
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Maintenance log not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Get maintenance history for a vehicle
 * Validates: Requirements 5.4, 5.5
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} options - Query options
 * @param {Date} [options.startDate] - Filter by start date
 * @param {Date} [options.endDate] - Filter by end date
 * @param {number} [options.limit] - Limit number of results
 * @returns {Promise<Array>} List of maintenance logs
 */
export async function getMaintenanceHistory(vehicleId, options = {}) {
  const where = {
    vehicleId
  }

  // Apply date range filters if provided
  if (options.startDate || options.endDate) {
    where.serviceDate = {}
    if (options.startDate) {
      where.serviceDate.gte = options.startDate
    }
    if (options.endDate) {
      where.serviceDate.lte = options.endDate
    }
  }

  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where,
    include: {
      vehicle: {
        select: {
          id: true,
          name: true,
          licensePlate: true,
          type: true
        }
      }
    },
    orderBy: { serviceDate: 'desc' },
    take: options.limit || undefined
  })

  return maintenanceLogs
}

/**
 * Get total maintenance cost for a vehicle
 * Validates: Requirements 5.6
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @returns {Promise<Object>} Maintenance cost summary
 */
export async function getMaintenanceCost(vehicleId, dateRange) {
  const { start, end } = dateRange

  // Get all maintenance logs for this vehicle in the date range
  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: {
      vehicleId,
      serviceDate: {
        gte: start,
        lte: end
      }
    }
  })

  // Calculate total cost
  const totalCost = maintenanceLogs.reduce((sum, log) => sum + log.cost, 0)

  // Count completed vs pending maintenance
  const completedCount = maintenanceLogs.filter(log => log.completedAt).length
  const pendingCount = maintenanceLogs.length - completedCount

  // Group by service type
  const costByServiceType = maintenanceLogs.reduce((acc, log) => {
    if (!acc[log.serviceType]) {
      acc[log.serviceType] = {
        count: 0,
        totalCost: 0
      }
    }
    acc[log.serviceType].count++
    acc[log.serviceType].totalCost += log.cost
    return acc
  }, {})

  return {
    vehicleId,
    dateRange: { start, end },
    totalCost: Math.round(totalCost * 100) / 100,
    totalServices: maintenanceLogs.length,
    completedServices: completedCount,
    pendingServices: pendingCount,
    costByServiceType
  }
}

/**
 * Get maintenance log by ID
 * @param {string} logId - Maintenance log ID
 * @returns {Promise<Object>} Maintenance log with related data
 * @throws {Error} If maintenance log not found
 */
export async function getMaintenanceLogById(logId) {
  const maintenanceLog = await prisma.maintenanceLog.findUnique({
    where: { id: logId },
    include: {
      vehicle: {
        select: {
          id: true,
          name: true,
          licensePlate: true,
          type: true,
          status: true
        }
      }
    }
  })

  if (!maintenanceLog) {
    const error = new Error('Maintenance log not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  return maintenanceLog
}

/**
 * Get all maintenance logs with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.vehicleId] - Filter by vehicle
 * @param {string} [filters.serviceType] - Filter by service type
 * @param {boolean} [filters.completed] - Filter by completion status
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @returns {Promise<Array>} List of maintenance logs
 */
export async function getAllMaintenanceLogs(filters = {}) {
  const where = {}

  if (filters.vehicleId) {
    where.vehicleId = filters.vehicleId
  }

  if (filters.serviceType) {
    where.serviceType = {
      contains: filters.serviceType,
      mode: 'insensitive'
    }
  }

  if (filters.completed !== undefined) {
    if (filters.completed) {
      where.completedAt = { not: null }
    } else {
      where.completedAt = null
    }
  }

  if (filters.startDate || filters.endDate) {
    where.serviceDate = {}
    if (filters.startDate) {
      where.serviceDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.serviceDate.lte = filters.endDate
    }
  }

  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where,
    include: {
      vehicle: {
        select: {
          id: true,
          name: true,
          licensePlate: true,
          type: true,
          status: true
        }
      }
    },
    orderBy: { serviceDate: 'desc' }
  })

  return maintenanceLogs
}

/**
 * Update an existing maintenance log
 * Validates: Requirements 5.4
 * @param {string} logId - Maintenance log ID to update
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated maintenance log record
 * @throws {Error} If maintenance log not found or validation fails
 */
export async function updateMaintenanceLog(logId, updateData) {
  // Validate update data
  const validation = validateData(maintenanceUpdateSchema, updateData)
  if (!validation.success) {
    const error = new Error('Maintenance update validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Check if maintenance log exists
    const existingLog = await prisma.maintenanceLog.findUnique({
      where: { id: logId }
    })

    if (!existingLog) {
      const error = new Error('Maintenance log not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Update maintenance log
    const maintenanceLog = await prisma.maintenanceLog.update({
      where: { id: logId },
      data: validation.data,
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            licensePlate: true,
            type: true,
            status: true
          }
        }
      }
    })

    return maintenanceLog
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Maintenance log not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}
