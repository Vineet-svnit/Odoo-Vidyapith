/**
 * Analytics Service Functions
 * Handles fleet analytics, ROI calculations, report generation, and cost trends
 * Requirements: 2.3, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import prisma from './prisma.js'
import { getFuelEfficiency, getTotalOperationalCost, getCostPerKm } from './financial-service.js'

/**
 * Calculate fleet utilization rate
 * Validates: Requirements 2.3
 * @param {Object} filters - Optional filters
 * @param {string} [filters.type] - Filter by vehicle type
 * @param {string} [filters.region] - Filter by region (not implemented in schema)
 * @returns {Promise<Object>} Fleet utilization metrics
 */
export async function getFleetUtilization(filters = {}) {
  const where = {
    status: {
      not: 'OUT_OF_SERVICE'
    }
  }

  // Apply type filter if provided
  if (filters.type) {
    where.type = filters.type
  }

  // Get total available vehicles (not out of service)
  const totalVehicles = await prisma.vehicle.count({ where })

  // Get vehicles currently on trip
  const activeVehicles = await prisma.vehicle.count({
    where: {
      ...where,
      status: 'ON_TRIP'
    }
  })

  // Get vehicles in maintenance
  const inShopVehicles = await prisma.vehicle.count({
    where: {
      ...where,
      status: 'IN_SHOP'
    }
  })

  // Get available vehicles
  const availableVehicles = await prisma.vehicle.count({
    where: {
      ...where,
      status: 'AVAILABLE'
    }
  })

  // Calculate utilization rate
  const utilizationRate = totalVehicles > 0 
    ? (activeVehicles / totalVehicles) * 100 
    : 0

  return {
    totalVehicles,
    activeVehicles,
    availableVehicles,
    inShopVehicles,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    filters
  }
}

/**
 * Calculate vehicle ROI (Return on Investment)
 * Validates: Requirements 8.2
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} dateRange - Date range for calculation
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @param {number} [revenue] - Optional revenue (if not provided, ROI cannot be calculated)
 * @returns {Promise<Object>} ROI metrics
 */
export async function calculateVehicleROI(vehicleId, dateRange, revenue = null) {
  const { start, end } = dateRange

  // Get vehicle data
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId }
  })

  if (!vehicle) {
    const error = new Error('Vehicle not found')
    error.type = 'NOT_FOUND_ERROR'
    error.status = 404
    throw error
  }

  // Get total operational cost
  const costData = await getTotalOperationalCost(vehicleId, dateRange)

  // Calculate ROI if revenue and acquisition cost are provided
  let roi = null
  let roiPercentage = null

  if (revenue !== null && vehicle.acquisitionCost) {
    const profit = revenue - costData.totalOperationalCost
    roi = profit
    roiPercentage = (profit / vehicle.acquisitionCost) * 100
  }

  return {
    vehicleId,
    vehicleName: vehicle.name,
    dateRange: { start, end },
    acquisitionCost: vehicle.acquisitionCost || null,
    totalOperationalCost: costData.totalOperationalCost,
    revenue: revenue,
    profit: roi,
    roiPercentage: roiPercentage !== null ? Math.round(roiPercentage * 100) / 100 : null,
    costBreakdown: costData.breakdown,
    canCalculateROI: revenue !== null && vehicle.acquisitionCost !== null
  }
}

/**
 * Generate report data for export
 * Validates: Requirements 8.3, 8.4
 * @param {string} reportType - Type of report (fleet, vehicle, financial, driver)
 * @param {Object} filters - Report filters
 * @param {Date} [filters.startDate] - Start date
 * @param {Date} [filters.endDate] - End date
 * @param {string} [filters.vehicleId] - Specific vehicle ID
 * @param {string} [filters.driverId] - Specific driver ID
 * @param {string} [filters.vehicleType] - Vehicle type filter
 * @returns {Promise<Object>} Report data ready for export
 */
export async function generateReport(reportType, filters = {}) {
  const dateRange = {
    start: filters.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: filters.endDate || new Date()
  }

  let reportData = {
    reportType,
    generatedAt: new Date(),
    dateRange,
    filters,
    data: null
  }

  switch (reportType) {
    case 'fleet':
      reportData.data = await generateFleetReport(dateRange, filters)
      break

    case 'vehicle':
      if (!filters.vehicleId) {
        throw new Error('Vehicle ID is required for vehicle report')
      }
      reportData.data = await generateVehicleReport(filters.vehicleId, dateRange)
      break

    case 'financial':
      reportData.data = await generateFinancialReport(dateRange, filters)
      break

    case 'driver':
      if (!filters.driverId) {
        throw new Error('Driver ID is required for driver report')
      }
      reportData.data = await generateDriverReport(filters.driverId, dateRange)
      break

    default:
      throw new Error(`Unknown report type: ${reportType}`)
  }

  return reportData
}

/**
 * Generate fleet-wide report
 * @private
 */
async function generateFleetReport(dateRange, filters) {
  const { start, end } = dateRange

  // Get fleet utilization
  const utilization = await getFleetUtilization(filters)

  // Get all vehicles
  const vehicleWhere = {}
  if (filters.vehicleType) {
    vehicleWhere.type = filters.vehicleType
  }

  const vehicles = await prisma.vehicle.findMany({
    where: vehicleWhere,
    include: {
      trips: {
        where: {
          createdAt: { gte: start, lte: end }
        }
      },
      maintenanceLogs: {
        where: {
          serviceDate: { gte: start, lte: end }
        }
      },
      fuelLogs: {
        where: {
          fuelDate: { gte: start, lte: end }
        }
      }
    }
  })

  // Calculate aggregated metrics
  const totalTrips = vehicles.reduce((sum, v) => sum + v.trips.length, 0)
  const completedTrips = vehicles.reduce((sum, v) => 
    sum + v.trips.filter(t => t.status === 'COMPLETED').length, 0)
  const totalMaintenanceCost = vehicles.reduce((sum, v) =>
    sum + v.maintenanceLogs.reduce((s, m) => s + m.cost, 0), 0)
  const totalFuelCost = vehicles.reduce((sum, v) =>
    sum + v.fuelLogs.reduce((s, f) => s + f.cost, 0), 0)

  return {
    utilization,
    vehicleCount: vehicles.length,
    totalTrips,
    completedTrips,
    completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
    totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
    totalFuelCost: Math.round(totalFuelCost * 100) / 100,
    totalOperationalCost: Math.round((totalMaintenanceCost + totalFuelCost) * 100) / 100,
    vehicles: vehicles.map(v => ({
      id: v.id,
      name: v.name,
      licensePlate: v.licensePlate,
      type: v.type,
      status: v.status,
      tripCount: v.trips.length,
      maintenanceCount: v.maintenanceLogs.length,
      fuelEntries: v.fuelLogs.length
    }))
  }
}

/**
 * Generate vehicle-specific report
 * @private
 */
async function generateVehicleReport(vehicleId, dateRange) {
  const { start, end } = dateRange

  // Get vehicle data
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      trips: {
        where: {
          createdAt: { gte: start, lte: end }
        },
        include: {
          driver: {
            select: {
              firstName: true,
              lastName: true,
              licenseNumber: true
            }
          }
        }
      },
      maintenanceLogs: {
        where: {
          serviceDate: { gte: start, lte: end }
        }
      },
      fuelLogs: {
        where: {
          fuelDate: { gte: start, lte: end }
        }
      }
    }
  })

  if (!vehicle) {
    throw new Error('Vehicle not found')
  }

  // Calculate metrics
  const costData = await getTotalOperationalCost(vehicleId, dateRange)
  const costPerKmData = await getCostPerKm(vehicleId, dateRange)
  const fuelEfficiencyData = await getFuelEfficiency(vehicleId, dateRange)

  const completedTrips = vehicle.trips.filter(t => t.status === 'COMPLETED')
  const totalDistance = completedTrips.reduce((sum, t) => 
    t.endOdometer && t.startOdometer ? sum + (t.endOdometer - t.startOdometer) : sum, 0)

  return {
    vehicle: {
      id: vehicle.id,
      name: vehicle.name,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate,
      type: vehicle.type,
      status: vehicle.status,
      maxLoadCapacity: vehicle.maxLoadCapacity,
      odometer: vehicle.odometer,
      acquisitionCost: vehicle.acquisitionCost
    },
    metrics: {
      totalTrips: vehicle.trips.length,
      completedTrips: completedTrips.length,
      completionRate: vehicle.trips.length > 0 ? (completedTrips.length / vehicle.trips.length) * 100 : 0,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalOperationalCost: costData.totalOperationalCost,
      costPerKm: costPerKmData.costPerKm,
      fuelEfficiency: fuelEfficiencyData.fuelEfficiency,
      maintenanceCount: vehicle.maintenanceLogs.length,
      fuelEntries: vehicle.fuelLogs.length
    },
    costBreakdown: costData.breakdown,
    trips: vehicle.trips.map(t => ({
      id: t.id,
      status: t.status,
      origin: t.origin,
      destination: t.destination,
      cargoWeight: t.cargoWeight,
      driver: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : null,
      createdAt: t.createdAt,
      actualStart: t.actualStart,
      actualEnd: t.actualEnd,
      distance: t.endOdometer && t.startOdometer ? t.endOdometer - t.startOdometer : null
    })),
    maintenanceLogs: vehicle.maintenanceLogs.map(m => ({
      id: m.id,
      serviceType: m.serviceType,
      description: m.description,
      cost: m.cost,
      serviceDate: m.serviceDate,
      completedAt: m.completedAt
    })),
    fuelLogs: vehicle.fuelLogs.map(f => ({
      id: f.id,
      liters: f.liters,
      cost: f.cost,
      pricePerLiter: f.pricePerLiter,
      fuelDate: f.fuelDate
    }))
  }
}

/**
 * Generate financial report
 * @private
 */
async function generateFinancialReport(dateRange, filters) {
  const { start, end } = dateRange

  // Get all expenses in date range
  const fuelLogs = await prisma.fuelLog.findMany({
    where: {
      fuelDate: { gte: start, lte: end },
      ...(filters.vehicleId && { vehicleId: filters.vehicleId })
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

  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: {
      serviceDate: { gte: start, lte: end },
      ...(filters.vehicleId && { vehicleId: filters.vehicleId })
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

  const otherExpenses = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: start, lte: end },
      ...(filters.vehicleId && { vehicleId: filters.vehicleId })
    },
    include: {
      vehicle: filters.vehicleId ? {
        select: {
          id: true,
          name: true,
          licensePlate: true,
          type: true
        }
      } : false
    }
  })

  // Calculate totals
  const totalFuelCost = fuelLogs.reduce((sum, f) => sum + f.cost, 0)
  const totalMaintenanceCost = maintenanceLogs.reduce((sum, m) => sum + m.cost, 0)
  const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalCost = totalFuelCost + totalMaintenanceCost + totalOtherExpenses

  return {
    summary: {
      totalFuelCost: Math.round(totalFuelCost * 100) / 100,
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalOtherExpenses: Math.round(totalOtherExpenses * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      fuelEntries: fuelLogs.length,
      maintenanceEntries: maintenanceLogs.length,
      otherExpenseEntries: otherExpenses.length
    },
    fuelLogs: fuelLogs.map(f => ({
      id: f.id,
      vehicleId: f.vehicleId,
      vehicleName: f.vehicle.name,
      licensePlate: f.vehicle.licensePlate,
      liters: f.liters,
      cost: f.cost,
      pricePerLiter: f.pricePerLiter,
      fuelDate: f.fuelDate
    })),
    maintenanceLogs: maintenanceLogs.map(m => ({
      id: m.id,
      vehicleId: m.vehicleId,
      vehicleName: m.vehicle.name,
      licensePlate: m.vehicle.licensePlate,
      serviceType: m.serviceType,
      description: m.description,
      cost: m.cost,
      serviceDate: m.serviceDate
    })),
    otherExpenses: otherExpenses.map(e => ({
      id: e.id,
      vehicleId: e.vehicleId,
      vehicleName: e.vehicle?.name || null,
      category: e.category,
      description: e.description,
      amount: e.amount,
      expenseDate: e.expenseDate
    }))
  }
}

/**
 * Generate driver performance report
 * @private
 */
async function generateDriverReport(driverId, dateRange) {
  const { start, end } = dateRange

  // Get driver data
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      },
      trips: {
        where: {
          createdAt: { gte: start, lte: end }
        },
        include: {
          vehicle: {
            select: {
              name: true,
              licensePlate: true,
              type: true
            }
          }
        }
      }
    }
  })

  if (!driver) {
    throw new Error('Driver not found')
  }

  // Calculate metrics
  const totalTrips = driver.trips.length
  const completedTrips = driver.trips.filter(t => t.status === 'COMPLETED').length
  const cancelledTrips = driver.trips.filter(t => t.status === 'CANCELLED').length
  const issueReportedTrips = driver.trips.filter(t => t.issueReported).length

  const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0

  // Calculate total distance
  const totalDistance = driver.trips
    .filter(t => t.endOdometer && t.startOdometer)
    .reduce((sum, t) => sum + (t.endOdometer - t.startOdometer), 0)

  return {
    driver: {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.user.email,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiry: driver.licenseExpiry,
      status: driver.status,
      safetyScore: driver.safetyScore
    },
    metrics: {
      totalTrips,
      completedTrips,
      cancelledTrips,
      issueReportedTrips,
      completionRate: Math.round(completionRate * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100
    },
    trips: driver.trips.map(t => ({
      id: t.id,
      status: t.status,
      origin: t.origin,
      destination: t.destination,
      cargoWeight: t.cargoWeight,
      vehicle: t.vehicle ? `${t.vehicle.name} (${t.vehicle.licensePlate})` : null,
      createdAt: t.createdAt,
      actualStart: t.actualStart,
      actualEnd: t.actualEnd,
      distance: t.endOdometer && t.startOdometer ? t.endOdometer - t.startOdometer : null,
      issueReported: t.issueReported,
      issueDescription: t.issueDescription
    }))
  }
}

/**
 * Get cost trends over time with monthly aggregation
 * Validates: Requirements 8.5
 * @param {string} [vehicleId] - Optional vehicle ID (if null, returns fleet-wide trends)
 * @param {Object} dateRange - Date range for trends
 * @param {Date} dateRange.start - Start date
 * @param {Date} dateRange.end - End date
 * @param {string} [groupBy='month'] - Grouping period (month, week, day)
 * @returns {Promise<Object>} Cost trends data
 */
export async function getCostTrends(vehicleId, dateRange, groupBy = 'month') {
  const { start, end } = dateRange

  // Build where clause
  const fuelWhere = {
    fuelDate: { gte: start, lte: end }
  }
  const maintenanceWhere = {
    serviceDate: { gte: start, lte: end }
  }
  const expenseWhere = {
    expenseDate: { gte: start, lte: end }
  }

  if (vehicleId) {
    fuelWhere.vehicleId = vehicleId
    maintenanceWhere.vehicleId = vehicleId
    expenseWhere.vehicleId = vehicleId
  }

  // Get all expenses
  const fuelLogs = await prisma.fuelLog.findMany({
    where: fuelWhere,
    select: {
      cost: true,
      fuelDate: true
    }
  })

  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: maintenanceWhere,
    select: {
      cost: true,
      serviceDate: true
    }
  })

  const otherExpenses = await prisma.expense.findMany({
    where: expenseWhere,
    select: {
      amount: true,
      expenseDate: true
    }
  })

  // Group by period
  const trends = {}

  // Helper function to get period key
  const getPeriodKey = (date) => {
    const d = new Date(date)
    if (groupBy === 'month') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } else if (groupBy === 'week') {
      const weekNum = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)
      return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
    } else {
      return d.toISOString().split('T')[0]
    }
  }

  // Initialize trend structure
  const initPeriod = () => ({
    fuelCost: 0,
    maintenanceCost: 0,
    otherExpenses: 0,
    totalCost: 0,
    fuelEntries: 0,
    maintenanceEntries: 0,
    otherExpenseEntries: 0
  })

  // Aggregate fuel costs
  fuelLogs.forEach(log => {
    const key = getPeriodKey(log.fuelDate)
    if (!trends[key]) trends[key] = initPeriod()
    trends[key].fuelCost += log.cost
    trends[key].fuelEntries++
  })

  // Aggregate maintenance costs
  maintenanceLogs.forEach(log => {
    const key = getPeriodKey(log.serviceDate)
    if (!trends[key]) trends[key] = initPeriod()
    trends[key].maintenanceCost += log.cost
    trends[key].maintenanceEntries++
  })

  // Aggregate other expenses
  otherExpenses.forEach(expense => {
    const key = getPeriodKey(expense.expenseDate)
    if (!trends[key]) trends[key] = initPeriod()
    trends[key].otherExpenses += expense.amount
    trends[key].otherExpenseEntries++
  })

  // Calculate totals and round
  Object.keys(trends).forEach(key => {
    trends[key].totalCost = trends[key].fuelCost + trends[key].maintenanceCost + trends[key].otherExpenses
    trends[key].fuelCost = Math.round(trends[key].fuelCost * 100) / 100
    trends[key].maintenanceCost = Math.round(trends[key].maintenanceCost * 100) / 100
    trends[key].otherExpenses = Math.round(trends[key].otherExpenses * 100) / 100
    trends[key].totalCost = Math.round(trends[key].totalCost * 100) / 100
  })

  // Convert to array and sort by period
  const trendsArray = Object.keys(trends)
    .sort()
    .map(period => ({
      period,
      ...trends[period]
    }))

  return {
    vehicleId: vehicleId || null,
    dateRange: { start, end },
    groupBy,
    trends: trendsArray,
    summary: {
      totalPeriods: trendsArray.length,
      totalFuelCost: Math.round(trendsArray.reduce((sum, t) => sum + t.fuelCost, 0) * 100) / 100,
      totalMaintenanceCost: Math.round(trendsArray.reduce((sum, t) => sum + t.maintenanceCost, 0) * 100) / 100,
      totalOtherExpenses: Math.round(trendsArray.reduce((sum, t) => sum + t.otherExpenses, 0) * 100) / 100,
      totalCost: Math.round(trendsArray.reduce((sum, t) => sum + t.totalCost, 0) * 100) / 100
    }
  }
}
