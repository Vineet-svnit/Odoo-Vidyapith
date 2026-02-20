/**
 * Trip Service Functions
 * Handles trip CRUD operations, validation, status management, and issue reporting
 * Requirements: 4.1, 4.5, 4.6, 4.7, 4.8
 */

import prisma from './prisma.js'
import { tripSchema, tripUpdateSchema, tripCompletionSchema, validateData } from './validation.js'
import { isLicenseCategoryValid } from './driver-service.js'
import { updateVehicleStatus } from './vehicle-service.js'
import { updateDriverStatus } from './driver-service.js'

/**
 * Validate trip creation with all business rules
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 12.1, 12.2, 12.3, 12.4, 12.5
 * @param {Object} tripData - Trip data to validate
 * @param {string} tripData.vehicleId - Vehicle ID
 * @param {string} tripData.driverId - Driver ID
 * @param {number} tripData.cargoWeight - Cargo weight
 * @returns {Promise<Object>} Validation result with success flag and errors if any
 */
export async function validateTripCreation(tripData) {
  const errors = []

  try {
    // Fetch vehicle and driver data
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: tripData.vehicleId }
    })

    const driver = await prisma.driver.findUnique({
      where: { id: tripData.driverId }
    })

    // Check if vehicle exists
    if (!vehicle) {
      errors.push({
        field: 'vehicleId',
        message: 'The specified vehicle does not exist',
        code: 'VEHICLE_NOT_FOUND'
      })
    }

    // Check if driver exists
    if (!driver) {
      errors.push({
        field: 'driverId',
        message: 'The specified driver does not exist',
        code: 'DRIVER_NOT_FOUND'
      })
    }

    // If vehicle or driver not found, return early
    if (errors.length > 0) {
      return {
        valid: false,
        errors
      }
    }

    // Requirement 4.2, 12.1: Check cargo weight vs vehicle capacity
    if (tripData.cargoWeight > vehicle.maxLoadCapacity) {
      errors.push({
        field: 'cargoWeight',
        message: `Cargo weight (${tripData.cargoWeight}) exceeds vehicle capacity (${vehicle.maxLoadCapacity})`,
        code: 'CARGO_EXCEEDS_CAPACITY'
      })
    }

    // Requirement 4.3, 12.2: Check driver license validity (not expired)
    const now = new Date()
    if (driver.licenseExpiry <= now) {
      errors.push({
        field: 'driverId',
        message: `Driver license expired on ${driver.licenseExpiry.toISOString().split('T')[0]}`,
        code: 'LICENSE_EXPIRED'
      })
    }

    // Requirement 7.6, 12.3: Check driver license category matches vehicle type
    if (!isLicenseCategoryValid(driver.licenseCategory, vehicle.type)) {
      errors.push({
        field: 'driverId',
        message: `Driver license category (${driver.licenseCategory}) does not authorize operation of ${vehicle.type} vehicles`,
        code: 'LICENSE_CATEGORY_MISMATCH'
      })
    }

    // Requirement 4.4, 12.4: Check vehicle availability
    if (vehicle.status !== 'AVAILABLE') {
      errors.push({
        field: 'vehicleId',
        message: `Vehicle is not available (current status: ${vehicle.status})`,
        code: 'VEHICLE_NOT_AVAILABLE'
      })
    }

    // Requirement 12.5: Check driver availability
    if (driver.status !== 'ON_DUTY') {
      errors.push({
        field: 'driverId',
        message: `Driver is not on duty (current status: ${driver.status})`,
        code: 'DRIVER_NOT_ON_DUTY'
      })
    }

    // Return validation result
    if (errors.length > 0) {
      return {
        valid: false,
        errors
      }
    }

    return {
      valid: true,
      vehicle,
      driver
    }
  } catch (error) {
    // Handle unexpected errors
    throw error
  }
}

/**
 * Create a new trip with validation
 * Validates: Requirements 4.1
 * @param {Object} tripData - Trip data to create
 * @param {string} createdBy - User ID of the creator
 * @returns {Promise<Object>} Created trip record
 * @throws {Error} If validation fails
 */
export async function createTrip(tripData, createdBy) {
  // Validate basic schema
  const schemaValidation = validateData(tripSchema, tripData)
  if (!schemaValidation.success) {
    const error = new Error('Trip validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = schemaValidation.errors
    throw error
  }

  // Validate business rules
  const businessValidation = await validateTripCreation(tripData)
  if (!businessValidation.valid) {
    const error = new Error('Trip creation failed validation')
    error.type = 'BUSINESS_RULE_VIOLATION'
    error.status = 422
    error.errors = businessValidation.errors
    throw error
  }

  try {
    // Create trip in a transaction with status updates
    const trip = await prisma.$transaction(async (tx) => {
      // Create the trip
      const newTrip = await tx.trip.create({
        data: {
          ...schemaValidation.data,
          createdBy,
          status: tripData.status || 'DRAFT'
        },
        include: {
          vehicle: true,
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      })

      // If trip is being dispatched immediately, update vehicle and driver status
      if (newTrip.status === 'DISPATCHED' || newTrip.status === 'IN_PROGRESS') {
        await tx.vehicle.update({
          where: { id: tripData.vehicleId },
          data: { status: 'ON_TRIP' }
        })

        // Note: Driver status remains ON_DUTY but they are now assigned
      }

      return newTrip
    })

    return trip
  } catch (error) {
    // Handle foreign key violations
    if (error.code === 'P2003') {
      const err = new Error('The specified vehicle or driver does not exist')
      err.type = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }
    throw error
  }
}

/**
 * Update trip status with cascade effects
 * Validates: Requirements 4.5, 4.6, 4.7
 * @param {string} tripId - Trip ID
 * @param {string} newStatus - New status
 * @param {Object} metadata - Additional metadata (e.g., odometer readings)
 * @returns {Promise<Object>} Updated trip record
 * @throws {Error} If trip not found or invalid status transition
 */
export async function updateTripStatus(tripId, newStatus, metadata = {}) {
  const validStatuses = ['DRAFT', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ISSUE_REPORTED']
  
  if (!validStatuses.includes(newStatus)) {
    const error = new Error(`Invalid trip status: ${newStatus}`)
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  try {
    // Get current trip
    const currentTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        driver: true
      }
    })

    if (!currentTrip) {
      const error = new Error('Trip not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Validate state transitions
    const validTransitions = {
      'DRAFT': ['DISPATCHED', 'CANCELLED'],
      'DISPATCHED': ['IN_PROGRESS', 'CANCELLED', 'ISSUE_REPORTED'],
      'IN_PROGRESS': ['COMPLETED', 'ISSUE_REPORTED'],
      'COMPLETED': [],
      'CANCELLED': [],
      'ISSUE_REPORTED': ['IN_PROGRESS', 'CANCELLED', 'COMPLETED']
    }

    const allowedTransitions = validTransitions[currentTrip.status] || []
    if (!allowedTransitions.includes(newStatus)) {
      const error = new Error(`Invalid status transition from ${currentTrip.status} to ${newStatus}`)
      error.type = 'BUSINESS_RULE_VIOLATION'
      error.status = 422
      throw error
    }

    // Update trip and cascade status changes in a transaction
    const trip = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData = {
        status: newStatus,
        ...metadata
      }

      // Add timestamps based on status
      if (newStatus === 'IN_PROGRESS' && !currentTrip.actualStart) {
        updateData.actualStart = new Date()
      }
      if (newStatus === 'COMPLETED' && !currentTrip.actualEnd) {
        updateData.actualEnd = new Date()
      }

      // Update the trip
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: updateData,
        include: {
          vehicle: true,
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      })

      // Cascade effects based on new status
      if (newStatus === 'DISPATCHED' || newStatus === 'IN_PROGRESS') {
        // Set vehicle to ON_TRIP
        await tx.vehicle.update({
          where: { id: currentTrip.vehicleId },
          data: { status: 'ON_TRIP' }
        })
      } else if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        // Return vehicle to AVAILABLE
        await tx.vehicle.update({
          where: { id: currentTrip.vehicleId },
          data: { status: 'AVAILABLE' }
        })
        // Driver remains ON_DUTY (they're available for next trip)
      }

      return updatedTrip
    })

    return trip
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Trip not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Get available drivers for trip assignment
 * Validates: Requirements 7.2, 7.5
 * @param {Object} filters - Optional filters
 * @param {string} [filters.vehicleType] - Filter by vehicle type to match license category
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

  // Get drivers
  let drivers = await prisma.driver.findMany({
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

  // Filter by vehicle type if provided
  if (filters.vehicleType) {
    drivers = drivers.filter(driver => 
      isLicenseCategoryValid(driver.licenseCategory, filters.vehicleType)
    )
  }

  return drivers
}

/**
 * Complete a trip with final odometer reading
 * Validates: Requirements 11.5, 12.7
 * @param {string} tripId - Trip ID
 * @param {number} endOdometer - Final odometer reading
 * @returns {Promise<Object>} Completed trip record
 * @throws {Error} If validation fails or trip not found
 */
export async function completeTrip(tripId, endOdometer) {
  // Validate completion data
  const validation = validateData(tripCompletionSchema, { endOdometer })
  if (!validation.success) {
    const error = new Error('Trip completion validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  // Get current trip
  const currentTrip = await prisma.trip.findUnique({
    where: { id: tripId }
  })

  if (!currentTrip) {
    const error = new Error('Trip not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  // Validate odometer reading is greater than start odometer
  if (currentTrip.startOdometer && endOdometer < currentTrip.startOdometer) {
    const error = new Error(`End odometer (${endOdometer}) must be greater than or equal to start odometer (${currentTrip.startOdometer})`)
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  // Update trip status to COMPLETED with odometer reading
  return updateTripStatus(tripId, 'COMPLETED', {
    endOdometer,
    actualEnd: new Date()
  })
}

/**
 * Report an issue on a trip
 * Validates: Requirements 4.8, 11.6
 * @param {string} tripId - Trip ID
 * @param {Object} issueData - Issue details
 * @param {string} issueData.issueDescription - Description of the issue
 * @param {string} [issueData.issueType] - Type of issue (breakdown, delay, etc.)
 * @returns {Promise<Object>} Updated trip with issue reported
 * @throws {Error} If trip not found
 */
export async function reportTripIssue(tripId, issueData) {
  const { issueDescription, issueType } = issueData

  if (!issueDescription || issueDescription.trim().length === 0) {
    const error = new Error('Issue description is required')
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  try {
    // Get current trip
    const currentTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    })

    if (!currentTrip) {
      const error = new Error('Trip not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Update trip in a transaction
    const trip = await prisma.$transaction(async (tx) => {
      // Update trip with issue
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: 'ISSUE_REPORTED',
          issueReported: true,
          issueDescription
        },
        include: {
          vehicle: true,
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      })

      // Create notifications for Fleet Managers and Dispatchers
      const managersAndDispatchers = await tx.user.findMany({
        where: {
          role: {
            in: ['FLEET_MANAGER', 'DISPATCHER']
          }
        }
      })

      // Create notification for each manager/dispatcher
      const notificationPromises = managersAndDispatchers.map(user =>
        tx.notification.create({
          data: {
            userId: user.id,
            type: issueType === 'breakdown' ? 'BREAKDOWN' : 'TRIP_ISSUE',
            message: `Issue reported on trip ${tripId}: ${issueDescription}`,
            metadata: {
              tripId,
              vehicleId: currentTrip.vehicleId,
              driverId: currentTrip.driverId,
              issueType: issueType || 'general'
            }
          }
        })
      )

      await Promise.all(notificationPromises)

      return updatedTrip
    })

    return trip
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Trip not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Get trip by ID with related data
 * @param {string} tripId - Trip ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Trip with related data
 */
export async function getTripById(tripId, options = {}) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: true,
      driver: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      },
      expenses: options.includeExpenses || false
    }
  })

  if (!trip) {
    const error = new Error('Trip not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  return trip
}

/**
 * Get all trips with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.vehicleId] - Filter by vehicle
 * @param {string} [filters.driverId] - Filter by driver
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @returns {Promise<Array>} List of trips
 */
export async function getAllTrips(filters = {}) {
  const where = {}

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.vehicleId) {
    where.vehicleId = filters.vehicleId
  }

  if (filters.driverId) {
    where.driverId = filters.driverId
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

  const trips = await prisma.trip.findMany({
    where,
    include: {
      vehicle: {
        select: {
          id: true,
          name: true,
          licensePlate: true,
          type: true
        }
      },
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseNumber: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return trips
}
