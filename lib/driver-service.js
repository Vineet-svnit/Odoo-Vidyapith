/**
 * Driver Service Functions
 * Handles driver CRUD operations, license validation, and performance tracking
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7
 */

import prisma from './prisma.js'
import { driverSchema, driverUpdateSchema, validateData } from './validation.js'

/**
 * Create a new driver
 * Validates: Requirements 7.1
 * @param {Object} driverData - Driver data to create
 * @param {string} driverData.userId - User ID (must be unique)
 * @param {string} driverData.firstName - Driver first name
 * @param {string} driverData.lastName - Driver last name
 * @param {string} driverData.licenseNumber - License number (must be unique)
 * @param {string} driverData.licenseCategory - License category (A, B, C, D, etc.)
 * @param {Date} driverData.licenseExpiry - License expiry date
 * @param {number} [driverData.safetyScore] - Optional safety score (0-100)
 * @returns {Promise<Object>} Created driver record
 * @throws {Error} If validation fails or license number already exists
 */
export async function createDriver(driverData) {
  // Validate input data
  const validation = validateData(driverSchema, driverData)
  if (!validation.success) {
    const error = new Error('Driver validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Create driver with default status ON_DUTY
    const driver = await prisma.driver.create({
      data: {
        ...validation.data,
        status: driverData.status || 'ON_DUTY'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    })

    return driver
  } catch (error) {
    // Handle unique constraint violation for license number
    if (error.code === 'P2002' && error.meta?.target?.includes('licenseNumber')) {
      const err = new Error('A driver with this license number already exists')
      err.type = 'CONFLICT_ERROR'
      err.status = 409
      throw err
    }
    
    // Handle unique constraint violation for userId
    if (error.code === 'P2002' && error.meta?.target?.includes('userId')) {
      const err = new Error('A driver profile already exists for this user')
      err.type = 'CONFLICT_ERROR'
      err.status = 409
      throw err
    }
    
    // Handle foreign key violation for userId
    if (error.code === 'P2003' && error.meta?.field_name?.includes('userId')) {
      const err = new Error('The specified user does not exist')
      err.type = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }
    
    throw error
  }
}

/**
 * Update an existing driver
 * Validates: Requirements 7.1
 * @param {string} driverId - Driver ID to update
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated driver record
 * @throws {Error} If driver not found or validation fails
 */
export async function updateDriver(driverId, updateData) {
  // Validate update data
  const validation = validateData(driverUpdateSchema, updateData)
  if (!validation.success) {
    const error = new Error('Driver update validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Check if driver exists
    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId }
    })

    if (!existingDriver) {
      const error = new Error('Driver not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Update driver
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: validation.data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    })

    return driver
  } catch (error) {
    // Handle unique constraint violation for license number
    if (error.code === 'P2002' && error.meta?.target?.includes('licenseNumber')) {
      const err = new Error('A driver with this license number already exists')
      err.type = 'CONFLICT_ERROR'
      err.status = 409
      throw err
    }
    
    throw error
  }
}

/**
 * Check if driver's license is valid (not expired)
 * Validates: Requirements 7.2
 * @param {string} driverId - Driver ID to check
 * @returns {Promise<Object>} Validation result with isValid flag and details
 * @throws {Error} If driver not found
 */
export async function checkLicenseValidity(driverId) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId }
  })

  if (!driver) {
    const error = new Error('Driver not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  const now = new Date()
  const isValid = driver.licenseExpiry > now
  const daysUntilExpiry = Math.ceil((driver.licenseExpiry - now) / (1000 * 60 * 60 * 24))

  return {
    driverId: driver.id,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    isValid,
    daysUntilExpiry,
    isExpiringSoon: daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }
}

/**
 * Get driver performance metrics
 * Validates: Requirements 7.3
 * @param {string} driverId - Driver ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @returns {Promise<Object>} Performance metrics
 */
export async function getDriverPerformance(driverId, dateRange) {
  const { start, end } = dateRange

  // Get all trips for this driver in the date range
  const trips = await prisma.trip.findMany({
    where: {
      driverId,
      createdAt: {
        gte: start,
        lte: end
      }
    }
  })

  // Calculate metrics
  const totalTrips = trips.length
  const completedTrips = trips.filter(trip => trip.status === 'COMPLETED').length
  const cancelledTrips = trips.filter(trip => trip.status === 'CANCELLED').length
  const issueReportedTrips = trips.filter(trip => trip.issueReported).length

  // Calculate completion rate
  const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0

  // Calculate total distance traveled
  const totalDistance = trips
    .filter(trip => trip.endOdometer && trip.startOdometer)
    .reduce((sum, trip) => sum + (trip.endOdometer - trip.startOdometer), 0)

  // Get driver info for safety score
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      safetyScore: true,
      status: true
    }
  })

  return {
    driverId,
    driverName: `${driver.firstName} ${driver.lastName}`,
    dateRange: { start, end },
    totalTrips,
    completedTrips,
    cancelledTrips,
    issueReportedTrips,
    completionRate: Math.round(completionRate * 100) / 100,
    totalDistance: Math.round(totalDistance * 100) / 100,
    safetyScore: driver.safetyScore,
    status: driver.status
  }
}

/**
 * Get drivers with expiring licenses
 * Validates: Requirements 7.7
 * @param {number} daysThreshold - Number of days threshold (default 30)
 * @returns {Promise<Array>} List of drivers with expiring licenses
 */
export async function getExpiringLicenses(daysThreshold = 30) {
  const now = new Date()
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

  const drivers = await prisma.driver.findMany({
    where: {
      licenseExpiry: {
        gte: now,
        lte: thresholdDate
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    },
    orderBy: {
      licenseExpiry: 'asc'
    }
  })

  // Add days until expiry to each driver
  return drivers.map(driver => {
    const daysUntilExpiry = Math.ceil((driver.licenseExpiry - now) / (1000 * 60 * 60 * 24))
    return {
      ...driver,
      daysUntilExpiry
    }
  })
}

/**
 * Update driver safety score
 * Validates: Requirements 7.1
 * @param {string} driverId - Driver ID
 * @param {number} score - New safety score (0-100)
 * @returns {Promise<Object>} Updated driver record
 * @throws {Error} If driver not found or score is invalid
 */
export async function updateSafetyScore(driverId, score) {
  // Validate score
  if (typeof score !== 'number' || score < 0 || score > 100) {
    const error = new Error('Safety score must be a number between 0 and 100')
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  try {
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: { safetyScore: score },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    })

    return driver
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Driver not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Update driver status
 * Validates: Requirements 7.5
 * @param {string} driverId - Driver ID
 * @param {string} newStatus - New status (ON_DUTY, OFF_DUTY, SUSPENDED)
 * @returns {Promise<Object>} Updated driver record
 * @throws {Error} If driver not found or invalid status
 */
export async function updateDriverStatus(driverId, newStatus) {
  const validStatuses = ['ON_DUTY', 'OFF_DUTY', 'SUSPENDED']
  
  if (!validStatuses.includes(newStatus)) {
    const error = new Error(`Invalid driver status: ${newStatus}`)
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  try {
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: { status: newStatus },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    })

    return driver
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Driver not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Get driver by ID with related data
 * @param {string} driverId - Driver ID
 * @param {Object} options - Query options
 * @param {boolean} [options.includeTrips] - Include trip history
 * @param {boolean} [options.includeUser] - Include user details
 * @returns {Promise<Object>} Driver with related data
 */
export async function getDriverById(driverId, options = {}) {
  const include = {}

  if (options.includeTrips) {
    include.trips = {
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            licensePlate: true,
            type: true
          }
        }
      }
    }
  }

  if (options.includeUser !== false) {
    include.user = {
      select: {
        id: true,
        email: true,
        role: true
      }
    }
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: Object.keys(include).length > 0 ? include : undefined
  })

  if (!driver) {
    const error = new Error('Driver not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  return driver
}

/**
 * Get all drivers with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.search] - Search by name or license number
 * @returns {Promise<Array>} List of drivers
 */
export async function getAllDrivers(filters = {}) {
  const where = {}

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { licenseNumber: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  const drivers = await prisma.driver.findMany({
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
    orderBy: { createdAt: 'desc' }
  })

  return drivers
}

/**
 * Get available drivers for trip assignment
 * Validates: Requirements 7.2, 7.5
 * @param {Object} filters - Optional filters
 * @param {string} [filters.licenseCategory] - Filter by license category
 * @returns {Promise<Array>} List of available drivers
 */
export async function getAvailableDrivers(filters = {}) {
  const now = new Date()
  const where = {
    status: 'ON_DUTY',
    licenseExpiry: {
      gt: now
    }
  }

  // Apply license category filter if provided
  if (filters.licenseCategory) {
    where.licenseCategory = filters.licenseCategory
  }

  const drivers = await prisma.driver.findMany({
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
    orderBy: { firstName: 'asc' }
  })

  return drivers
}

/**
 * Validate license category matches vehicle type
 * Validates: Requirements 7.6
 * @param {string} licenseCategory - Driver's license category
 * @param {string} vehicleType - Vehicle type (TRUCK, VAN, BIKE)
 * @returns {boolean} True if license category is valid for vehicle type
 */
export function isLicenseCategoryValid(licenseCategory, vehicleType) {
  // License category mapping
  // A - Motorcycles/Bikes
  // B - Cars and light vans
  // C - Trucks and heavy vehicles
  // D - Buses
  
  const categoryMapping = {
    'BIKE': ['A'],
    'VAN': ['B', 'C', 'D'],
    'TRUCK': ['C', 'D']
  }

  const validCategories = categoryMapping[vehicleType] || []
  return validCategories.includes(licenseCategory)
}
