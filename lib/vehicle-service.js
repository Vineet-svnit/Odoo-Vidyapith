/**
 * Vehicle Service Functions
 * Handles vehicle CRUD operations, status management, and availability queries
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6
 */

import prisma from './prisma.js'
import { vehicleSchema, vehicleUpdateSchema, validateData } from './validation.js'

/**
 * Create a new vehicle
 * Validates: Requirements 3.1, 3.4
 * @param {Object} vehicleData - Vehicle data to create
 * @param {string} vehicleData.name - Vehicle name
 * @param {string} vehicleData.model - Vehicle model
 * @param {string} vehicleData.licensePlate - License plate (must be unique)
 * @param {string} vehicleData.type - Vehicle type (TRUCK, VAN, BIKE)
 * @param {number} vehicleData.maxLoadCapacity - Maximum load capacity
 * @param {number} vehicleData.odometer - Current odometer reading
 * @param {number} [vehicleData.acquisitionCost] - Optional acquisition cost
 * @returns {Promise<Object>} Created vehicle record
 * @throws {Error} If validation fails or license plate already exists
 */
export async function createVehicle(vehicleData) {
  // Validate input data
  const validation = validateData(vehicleSchema, vehicleData)
  if (!validation.success) {
    const error = new Error('Vehicle validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Create vehicle with default status AVAILABLE
    const vehicle = await prisma.vehicle.create({
      data: {
        ...validation.data,
        status: vehicleData.status || 'AVAILABLE'
      }
    })

    return vehicle
  } catch (error) {
    // Handle unique constraint violation for license plate
    if (error.code === 'P2002' && error.meta?.target?.includes('licensePlate')) {
      const err = new Error('A vehicle with this license plate already exists')
      err.type = 'CONFLICT_ERROR'
      err.status = 409
      throw err
    }
    throw error
  }
}

/**
 * Update an existing vehicle
 * Validates: Requirements 3.4
 * @param {string} vehicleId - Vehicle ID to update
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated vehicle record
 * @throws {Error} If vehicle not found or validation fails
 */
export async function updateVehicle(vehicleId, updateData) {
  // Validate update data
  const validation = validateData(vehicleUpdateSchema, updateData)
  if (!validation.success) {
    const error = new Error('Vehicle update validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    })

    if (!existingVehicle) {
      const error = new Error('Vehicle not found')
      error.type = 'NOT_FOUND_ERROR'
      error.status = 404
      throw error
    }

    // Update vehicle
    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: validation.data
    })

    return vehicle
  } catch (error) {
    // Handle unique constraint violation for license plate
    if (error.code === 'P2002' && error.meta?.target?.includes('licensePlate')) {
      const err = new Error('A vehicle with this license plate already exists')
      err.type = 'CONFLICT_ERROR'
      err.status = 409
      throw err
    }
    throw error
  }
}

/**
 * Update vehicle status with cascade effects
 * Validates: Requirements 3.5, 3.6
 * @param {string} vehicleId - Vehicle ID
 * @param {string} newStatus - New status (AVAILABLE, ON_TRIP, IN_SHOP, OUT_OF_SERVICE)
 * @returns {Promise<Object>} Updated vehicle record
 * @throws {Error} If vehicle not found or invalid status
 */
export async function updateVehicleStatus(vehicleId, newStatus) {
  const validStatuses = ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'OUT_OF_SERVICE']
  
  if (!validStatuses.includes(newStatus)) {
    const error = new Error(`Invalid vehicle status: ${newStatus}`)
    error.type = 'VALIDATION_ERROR'
    error.status = 400
    throw error
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: newStatus }
    })

    return vehicle
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Vehicle not found')
      err.type = 'NOT_FOUND_ERROR'
      err.status = 404
      throw err
    }
    throw error
  }
}

/**
 * Get available vehicles for trip assignment
 * Validates: Requirements 3.3
 * @param {Object} filters - Optional filters
 * @param {string} [filters.type] - Filter by vehicle type
 * @param {number} [filters.minCapacity] - Minimum load capacity required
 * @returns {Promise<Array>} List of available vehicles
 */
export async function getAvailableVehicles(filters = {}) {
  const where = {
    status: 'AVAILABLE'
  }

  // Apply type filter if provided
  if (filters.type) {
    where.type = filters.type
  }

  // Apply minimum capacity filter if provided
  if (filters.minCapacity) {
    where.maxLoadCapacity = {
      gte: filters.minCapacity
    }
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { name: 'asc' }
  })

  return vehicles
}

/**
 * Calculate vehicle utilization metrics
 * Validates: Requirements 3.6
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @returns {Promise<Object>} Utilization metrics
 */
export async function getVehicleUtilization(vehicleId, dateRange) {
  const { start, end } = dateRange

  // Get all trips for this vehicle in the date range
  const trips = await prisma.trip.findMany({
    where: {
      vehicleId,
      createdAt: {
        gte: start,
        lte: end
      }
    }
  })

  // Calculate total days in range
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

  // Calculate days on trip (completed or in progress)
  const activeTripStatuses = ['DISPATCHED', 'IN_PROGRESS', 'COMPLETED']
  const activeTrips = trips.filter(trip => activeTripStatuses.includes(trip.status))

  // Calculate utilization metrics
  const totalTrips = trips.length
  const completedTrips = trips.filter(trip => trip.status === 'COMPLETED').length
  const cancelledTrips = trips.filter(trip => trip.status === 'CANCELLED').length

  // Calculate total distance traveled
  const totalDistance = trips
    .filter(trip => trip.endOdometer && trip.startOdometer)
    .reduce((sum, trip) => sum + (trip.endOdometer - trip.startOdometer), 0)

  return {
    vehicleId,
    dateRange: { start, end },
    totalDays,
    totalTrips,
    completedTrips,
    cancelledTrips,
    activeTrips: activeTrips.length,
    totalDistance,
    utilizationRate: totalDays > 0 ? (activeTrips.length / totalDays) * 100 : 0
  }
}

/**
 * Get vehicle by ID with related data
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} options - Query options
 * @param {boolean} [options.includeTrips] - Include trip history
 * @param {boolean} [options.includeMaintenance] - Include maintenance logs
 * @param {boolean} [options.includeFuelLogs] - Include fuel logs
 * @returns {Promise<Object>} Vehicle with related data
 */
export async function getVehicleById(vehicleId, options = {}) {
  const include = {}

  if (options.includeTrips) {
    include.trips = {
      orderBy: { createdAt: 'desc' },
      take: 10
    }
  }

  if (options.includeMaintenance) {
    include.maintenanceLogs = {
      orderBy: { serviceDate: 'desc' },
      take: 10
    }
  }

  if (options.includeFuelLogs) {
    include.fuelLogs = {
      orderBy: { fuelDate: 'desc' },
      take: 10
    }
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: Object.keys(include).length > 0 ? include : undefined
  })

  if (!vehicle) {
    const error = new Error('Vehicle not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  return vehicle
}

/**
 * Get all vehicles with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.type] - Filter by type
 * @param {string} [filters.search] - Search by name, model, or license plate
 * @returns {Promise<Array>} List of vehicles
 */
export async function getAllVehicles(filters = {}) {
  const where = {}

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.type) {
    where.type = filters.type
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
      { licensePlate: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  return vehicles
}

/**
 * Soft delete a vehicle (mark as OUT_OF_SERVICE)
 * Validates: Requirements 3.4, 14.4
 * Historical trip and expense records are preserved
 * @param {string} vehicleId - Vehicle ID to retire
 * @returns {Promise<Object>} Updated vehicle record
 */
export async function retireVehicle(vehicleId) {
  return updateVehicleStatus(vehicleId, 'OUT_OF_SERVICE')
}


/**
 * Get historical trip records for a vehicle (including OUT_OF_SERVICE vehicles)
 * Validates: Requirements 14.4
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} options - Query options
 * @param {Date} [options.startDate] - Start date for filtering
 * @param {Date} [options.endDate] - End date for filtering
 * @param {number} [options.limit] - Maximum number of records to return
 * @returns {Promise<Array>} List of historical trip records
 */
export async function getVehicleHistoricalTrips(vehicleId, options = {}) {
  const where = {
    vehicleId
  }

  // Add date range filter if provided
  if (options.startDate || options.endDate) {
    where.createdAt = {}
    if (options.startDate) {
      where.createdAt.gte = options.startDate
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate
    }
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      Driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseNumber: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit || undefined
  })

  return trips
}

/**
 * Get historical expense records for a vehicle (including OUT_OF_SERVICE vehicles)
 * Validates: Requirements 14.4
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} options - Query options
 * @param {Date} [options.startDate] - Start date for filtering
 * @param {Date} [options.endDate] - End date for filtering
 * @param {number} [options.limit] - Maximum number of records to return
 * @returns {Promise<Object>} Historical expense records (fuel logs, maintenance logs, other expenses)
 */
export async function getVehicleHistoricalExpenses(vehicleId, options = {}) {
  const dateFilter = {}
  if (options.startDate || options.endDate) {
    if (options.startDate) {
      dateFilter.gte = options.startDate
    }
    if (options.endDate) {
      dateFilter.lte = options.endDate
    }
  }

  // Get fuel logs
  const fuelLogs = await prisma.fuelLog.findMany({
    where: {
      vehicleId,
      ...(Object.keys(dateFilter).length > 0 ? { fuelDate: dateFilter } : {})
    },
    orderBy: { fuelDate: 'desc' },
    take: options.limit || undefined
  })

  // Get maintenance logs
  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: {
      vehicleId,
      ...(Object.keys(dateFilter).length > 0 ? { serviceDate: dateFilter } : {})
    },
    orderBy: { serviceDate: 'desc' },
    take: options.limit || undefined
  })

  // Get other expenses
  const otherExpenses = await prisma.expense.findMany({
    where: {
      vehicleId,
      ...(Object.keys(dateFilter).length > 0 ? { expenseDate: dateFilter } : {})
    },
    orderBy: { expenseDate: 'desc' },
    take: options.limit || undefined
  })

  return {
    fuelLogs,
    maintenanceLogs,
    otherExpenses,
    totalFuelCost: fuelLogs.reduce((sum, log) => sum + log.cost, 0),
    totalMaintenanceCost: maintenanceLogs.reduce((sum, log) => sum + log.cost, 0),
    totalOtherExpenses: otherExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  }
}
