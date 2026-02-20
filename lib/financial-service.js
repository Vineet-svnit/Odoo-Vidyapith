/**
 * Financial Service Functions
 * Handles fuel logging, expense tracking, and financial calculations
 * Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 8.1
 */

import prisma from './prisma.js'
import { fuelLogSchema, expenseSchema, validateData } from './validation.js'

/**
 * Create a new fuel log entry
 * Validates: Requirements 6.1, 6.6
 * @param {Object} fuelData - Fuel log data to create
 * @param {string} fuelData.vehicleId - Vehicle ID
 * @param {number} fuelData.liters - Liters of fuel
 * @param {number} fuelData.cost - Total cost
 * @param {number} fuelData.pricePerLiter - Price per liter
 * @param {number} fuelData.odometer - Odometer reading at refuel
 * @param {Date} fuelData.fuelDate - Date of refueling
 * @param {string} createdBy - User ID of the creator
 * @returns {Promise<Object>} Created fuel log record
 * @throws {Error} If validation fails or vehicle not found
 */
export async function createFuelLog(fuelData, createdBy) {
  // Validate input data
  const validation = validateData(fuelLogSchema, fuelData)
  if (!validation.success) {
    const error = new Error('Fuel log validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: fuelData.vehicleId }
    })

    if (!vehicle) {
      const error = new Error('The specified vehicle does not exist')
      error.type = 'VALIDATION_ERROR'
      error.status = 400
      throw error
    }

    // Create the fuel log
    const fuelLog = await prisma.fuelLog.create({
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
            type: true
          }
        }
      }
    })

    return fuelLog
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
 * Calculate total operational cost for a vehicle
 * Validates: Requirements 6.3
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @returns {Promise<Object>} Total operational cost breakdown
 */
export async function getTotalOperationalCost(vehicleId, dateRange) {
  const { start, end } = dateRange

  // Get all fuel costs for this vehicle in the date range
  const fuelCosts = await prisma.fuelLog.aggregate({
    where: {
      vehicleId,
      fuelDate: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      cost: true
    },
    _count: true
  })

  // Get all maintenance costs for this vehicle in the date range
  const maintenanceCosts = await prisma.maintenanceLog.aggregate({
    where: {
      vehicleId,
      serviceDate: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      cost: true
    },
    _count: true
  })

  // Get all other expenses for this vehicle in the date range
  const otherExpenses = await prisma.expense.aggregate({
    where: {
      vehicleId,
      expenseDate: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      amount: true
    },
    _count: true
  })

  const totalFuelCost = fuelCosts._sum.cost || 0
  const totalMaintenanceCost = maintenanceCosts._sum.cost || 0
  const totalOtherExpenses = otherExpenses._sum.amount || 0
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalOtherExpenses

  return {
    vehicleId,
    dateRange: { start, end },
    totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
    breakdown: {
      fuelCost: Math.round(totalFuelCost * 100) / 100,
      fuelEntries: fuelCosts._count,
      maintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      maintenanceEntries: maintenanceCosts._count,
      otherExpenses: Math.round(totalOtherExpenses * 100) / 100,
      otherExpenseEntries: otherExpenses._count
    }
  }
}

/**
 * Calculate cost per kilometer for a vehicle
 * Validates: Requirements 6.4, 8.3
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @returns {Promise<Object>} Cost per kilometer metrics
 */
export async function getCostPerKm(vehicleId, dateRange) {
  const { start, end } = dateRange

  // Get total operational cost
  const costData = await getTotalOperationalCost(vehicleId, dateRange)

  // Get all completed trips for this vehicle in the date range
  const trips = await prisma.trip.findMany({
    where: {
      vehicleId,
      status: 'COMPLETED',
      actualEnd: {
        gte: start,
        lte: end
      },
      endOdometer: { not: null },
      startOdometer: { not: null }
    },
    select: {
      startOdometer: true,
      endOdometer: true
    }
  })

  // Calculate total distance traveled
  const totalDistance = trips.reduce((sum, trip) => {
    return sum + (trip.endOdometer - trip.startOdometer)
  }, 0)

  // Calculate cost per km
  const costPerKm = totalDistance > 0 
    ? costData.totalOperationalCost / totalDistance 
    : 0

  return {
    vehicleId,
    dateRange: { start, end },
    totalOperationalCost: costData.totalOperationalCost,
    totalDistance: Math.round(totalDistance * 100) / 100,
    costPerKm: Math.round(costPerKm * 100) / 100,
    tripCount: trips.length,
    breakdown: costData.breakdown
  }
}

/**
 * Calculate fuel efficiency for a vehicle
 * Validates: Requirements 8.1
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @returns {Promise<Object>} Fuel efficiency metrics (km per liter)
 */
export async function getFuelEfficiency(vehicleId, dateRange) {
  const { start, end } = dateRange

  // Get all fuel logs for this vehicle in the date range
  const fuelLogs = await prisma.fuelLog.aggregate({
    where: {
      vehicleId,
      fuelDate: {
        gte: start,
        lte: end
      }
    },
    _sum: {
      liters: true,
      cost: true
    },
    _count: true
  })

  // Get all completed trips for this vehicle in the date range
  const trips = await prisma.trip.findMany({
    where: {
      vehicleId,
      status: 'COMPLETED',
      actualEnd: {
        gte: start,
        lte: end
      },
      endOdometer: { not: null },
      startOdometer: { not: null }
    },
    select: {
      startOdometer: true,
      endOdometer: true
    }
  })

  // Calculate total distance traveled
  const totalDistance = trips.reduce((sum, trip) => {
    return sum + (trip.endOdometer - trip.startOdometer)
  }, 0)

  const totalLiters = fuelLogs._sum.liters || 0
  const totalFuelCost = fuelLogs._sum.cost || 0

  // Calculate fuel efficiency (km per liter)
  const fuelEfficiency = totalLiters > 0 
    ? totalDistance / totalLiters 
    : 0

  // Calculate average cost per liter
  const avgCostPerLiter = totalLiters > 0
    ? totalFuelCost / totalLiters
    : 0

  return {
    vehicleId,
    dateRange: { start, end },
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalLiters: Math.round(totalLiters * 100) / 100,
    totalFuelCost: Math.round(totalFuelCost * 100) / 100,
    fuelEfficiency: Math.round(fuelEfficiency * 100) / 100, // km per liter
    avgCostPerLiter: Math.round(avgCostPerLiter * 100) / 100,
    fuelEntries: fuelLogs._count,
    tripCount: trips.length
  }
}

/**
 * Create a general expense entry
 * @param {Object} expenseData - Expense data to create
 * @param {string} [expenseData.vehicleId] - Vehicle ID (optional)
 * @param {string} [expenseData.tripId] - Trip ID (optional)
 * @param {string} expenseData.category - Expense category
 * @param {string} [expenseData.description] - Optional description
 * @param {number} expenseData.amount - Expense amount
 * @param {Date} expenseData.expenseDate - Date of expense
 * @param {string} createdBy - User ID of the creator
 * @returns {Promise<Object>} Created expense record
 * @throws {Error} If validation fails
 */
export async function createExpense(expenseData, createdBy) {
  // Validate input data
  const validation = validateData(expenseSchema, expenseData)
  if (!validation.success) {
    const error = new Error('Expense validation failed')
    error.type = 'VALIDATION_ERROR'
    error.errors = validation.errors
    throw error
  }

  try {
    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        ...validation.data,
        createdBy
      },
      include: {
        vehicle: expenseData.vehicleId ? {
          select: {
            id: true,
            name: true,
            licensePlate: true,
            type: true
          }
        } : false,
        trip: expenseData.tripId ? {
          select: {
            id: true,
            origin: true,
            destination: true,
            status: true
          }
        } : false
      }
    })

    return expense
  } catch (error) {
    // Handle foreign key violations
    if (error.code === 'P2003') {
      const err = new Error('The specified vehicle or trip does not exist')
      err.type = 'VALIDATION_ERROR'
      err.status = 400
      throw err
    }
    throw error
  }
}

/**
 * Get all fuel logs with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.vehicleId] - Filter by vehicle
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @returns {Promise<Array>} List of fuel logs
 */
export async function getAllFuelLogs(filters = {}) {
  const where = {}

  if (filters.vehicleId) {
    where.vehicleId = filters.vehicleId
  }

  if (filters.startDate || filters.endDate) {
    where.fuelDate = {}
    if (filters.startDate) {
      where.fuelDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.fuelDate.lte = filters.endDate
    }
  }

  const fuelLogs = await prisma.fuelLog.findMany({
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
    orderBy: { fuelDate: 'desc' }
  })

  return fuelLogs
}

/**
 * Get all expenses with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.vehicleId] - Filter by vehicle
 * @param {string} [filters.tripId] - Filter by trip
 * @param {string} [filters.category] - Filter by category
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @returns {Promise<Array>} List of expenses
 */
export async function getAllExpenses(filters = {}) {
  const where = {}

  if (filters.vehicleId) {
    where.vehicleId = filters.vehicleId
  }

  if (filters.tripId) {
    where.tripId = filters.tripId
  }

  if (filters.category) {
    where.category = {
      contains: filters.category,
      mode: 'insensitive'
    }
  }

  if (filters.startDate || filters.endDate) {
    where.expenseDate = {}
    if (filters.startDate) {
      where.expenseDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.expenseDate.lte = filters.endDate
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      vehicle: filters.vehicleId ? {
        select: {
          id: true,
          name: true,
          licensePlate: true,
          type: true
        }
      } : false,
      trip: filters.tripId ? {
        select: {
          id: true,
          origin: true,
          destination: true,
          status: true
        }
      } : false
    },
    orderBy: { expenseDate: 'desc' }
  })

  return expenses
}

/**
 * Get expenses for a specific vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} options - Query options
 * @param {Date} [options.startDate] - Filter by start date
 * @param {Date} [options.endDate] - Filter by end date
 * @returns {Promise<Array>} List of expenses for the vehicle
 */
export async function getVehicleExpenses(vehicleId, options = {}) {
  return getAllExpenses({
    vehicleId,
    startDate: options.startDate,
    endDate: options.endDate
  })
}
