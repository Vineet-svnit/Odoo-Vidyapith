/**
 * Dashboard Service Functions
 * Handles dashboard KPIs, alerts, and role-based filtering
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import prisma from './prisma.js'

/**
 * Get dashboard KPIs with role-based filtering
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * @param {string} userRole - User's role (FLEET_MANAGER, DISPATCHER, DRIVER)
 * @param {string} userId - User's ID (for driver filtering)
 * @param {Object} filters - Optional filters
 * @param {string} [filters.type] - Filter by vehicle type (TRUCK, VAN, BIKE)
 * @param {string} [filters.status] - Filter by vehicle status
 * @param {string} [filters.region] - Filter by region (not implemented in schema)
 * @returns {Promise<Object>} Dashboard KPIs
 */
export async function getDashboardKPIs(userRole, userId, filters = {}) {
  // Build vehicle where clause based on filters
  const vehicleWhere = {}
  
  if (filters.type) {
    vehicleWhere.type = filters.type
  }
  
  if (filters.status) {
    vehicleWhere.status = filters.status
  }

  // Build trip where clause for role-based filtering
  const tripWhere = {}
  
  // Drivers only see their own trips
  if (userRole === 'DRIVER') {
    // Get driver record for this user
    const driver = await prisma.driver.findUnique({
      where: { userId }
    })
    
    if (driver) {
      tripWhere.driverId = driver.id
    } else {
      // User is a driver but has no driver profile, return empty metrics
      return {
        activeFleet: 0,
        maintenanceAlerts: 0,
        utilizationRate: 0,
        pendingCargo: 0,
        filters,
        userRole
      }
    }
  }

  // Requirement 2.1: Active Fleet - count of vehicles with status "ON_TRIP"
  const activeFleet = await prisma.vehicle.count({
    where: {
      ...vehicleWhere,
      status: 'ON_TRIP'
    }
  })

  // Requirement 2.2: Maintenance Alerts - count of vehicles with status "IN_SHOP"
  const maintenanceAlerts = await prisma.vehicle.count({
    where: {
      ...vehicleWhere,
      status: 'IN_SHOP'
    }
  })

  // Requirement 2.3: Utilization Rate - (assigned vehicles / total available vehicles) * 100
  // Total available vehicles = all vehicles except OUT_OF_SERVICE
  const totalAvailableVehicles = await prisma.vehicle.count({
    where: {
      ...vehicleWhere,
      status: {
        not: 'OUT_OF_SERVICE'
      }
    }
  })

  const utilizationRate = totalAvailableVehicles > 0 
    ? (activeFleet / totalAvailableVehicles) * 100 
    : 0

  // Requirement 2.4: Pending Cargo - count of trips with status "DRAFT"
  const pendingCargo = await prisma.trip.count({
    where: {
      ...tripWhere,
      status: 'DRAFT'
    }
  })

  // Additional useful metrics
  const availableVehicles = await prisma.vehicle.count({
    where: {
      ...vehicleWhere,
      status: 'AVAILABLE'
    }
  })

  const totalVehicles = await prisma.vehicle.count({
    where: vehicleWhere
  })

  // For drivers, also include their assigned trips
  let assignedTrips = 0
  let completedTrips = 0
  
  if (userRole === 'DRIVER' && tripWhere.driverId) {
    assignedTrips = await prisma.trip.count({
      where: {
        driverId: tripWhere.driverId,
        status: {
          in: ['DISPATCHED', 'IN_PROGRESS']
        }
      }
    })
    
    completedTrips = await prisma.trip.count({
      where: {
        driverId: tripWhere.driverId,
        status: 'COMPLETED'
      }
    })
  }

  return {
    activeFleet,
    maintenanceAlerts,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    pendingCargo,
    availableVehicles,
    totalVehicles,
    totalAvailableVehicles,
    ...(userRole === 'DRIVER' && {
      assignedTrips,
      completedTrips
    }),
    filters,
    userRole
  }
}

/**
 * Get active alerts for the user
 * Validates: Requirements 7.7, 11.7, 11.8
 * @param {string} userRole - User's role
 * @param {string} userId - User's ID
 * @returns {Promise<Object>} Active alerts
 */
export async function getActiveAlerts(userRole, userId) {
  const alerts = []

  // License expiry warnings (30 days threshold)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  if (userRole === 'FLEET_MANAGER' || userRole === 'DISPATCHER') {
    // Get all drivers with expiring licenses
    const expiringLicenses = await prisma.driver.findMany({
      where: {
        licenseExpiry: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        licenseNumber: true,
        licenseExpiry: true
      }
    })

    expiringLicenses.forEach(driver => {
      const daysUntilExpiry = Math.ceil(
        (driver.licenseExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      
      alerts.push({
        type: 'LICENSE_EXPIRY',
        severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
        message: `Driver ${driver.firstName} ${driver.lastName}'s license expires in ${daysUntilExpiry} days`,
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        licenseNumber: driver.licenseNumber,
        expiryDate: driver.licenseExpiry,
        daysUntilExpiry
      })
    })

    // Get expired licenses
    const expiredLicenses = await prisma.driver.findMany({
      where: {
        licenseExpiry: {
          lt: new Date()
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        licenseNumber: true,
        licenseExpiry: true
      }
    })

    expiredLicenses.forEach(driver => {
      alerts.push({
        type: 'LICENSE_EXPIRED',
        severity: 'critical',
        message: `Driver ${driver.firstName} ${driver.lastName}'s license has expired`,
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        licenseNumber: driver.licenseNumber,
        expiryDate: driver.licenseExpiry
      })
    })

    // Get trips with reported issues
    const issueTrips = await prisma.trip.findMany({
      where: {
        issueReported: true,
        status: {
          in: ['ISSUE_REPORTED', 'IN_PROGRESS', 'DISPATCHED']
        }
      },
      include: {
        Vehicle: {
          select: {
            name: true,
            licensePlate: true
          }
        },
        Driver: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    issueTrips.forEach(trip => {
      alerts.push({
        type: 'TRIP_ISSUE',
        severity: 'high',
        message: `Issue reported on trip from ${trip.origin} to ${trip.destination}`,
        tripId: trip.id,
        vehicleName: trip.Vehicle.name,
        licensePlate: trip.Vehicle.licensePlate,
        driverName: `${trip.Driver.firstName} ${trip.Driver.lastName}`,
        issueDescription: trip.issueDescription,
        origin: trip.origin,
        destination: trip.destination
      })
    })

    // Get vehicles in maintenance for extended periods (more than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const extendedMaintenance = await prisma.maintenanceLog.findMany({
      where: {
        completedAt: null,
        serviceDate: {
          lte: sevenDaysAgo
        }
      },
      include: {
        Vehicle: {
          select: {
            id: true,
            name: true,
            licensePlate: true
          }
        }
      }
    })

    extendedMaintenance.forEach(log => {
      const daysInMaintenance = Math.ceil(
        (new Date().getTime() - log.serviceDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      alerts.push({
        type: 'EXTENDED_MAINTENANCE',
        severity: 'medium',
        message: `Vehicle ${log.Vehicle.name} has been in maintenance for ${daysInMaintenance} days`,
        vehicleId: log.Vehicle.id,
        vehicleName: log.Vehicle.name,
        licensePlate: log.Vehicle.licensePlate,
        serviceType: log.serviceType,
        serviceDate: log.serviceDate,
        daysInMaintenance
      })
    })
  }

  // Driver-specific alerts
  if (userRole === 'DRIVER') {
    // Get driver record
    const driver = await prisma.driver.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        licenseExpiry: true,
        licenseNumber: true
      }
    })

    if (driver) {
      // Check own license expiry
      if (driver.licenseExpiry <= thirtyDaysFromNow) {
        const daysUntilExpiry = Math.ceil(
          (driver.licenseExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysUntilExpiry < 0) {
          alerts.push({
            type: 'LICENSE_EXPIRED',
            severity: 'critical',
            message: 'Your license has expired',
            expiryDate: driver.licenseExpiry
          })
        } else {
          alerts.push({
            type: 'LICENSE_EXPIRY',
            severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
            message: `Your license expires in ${daysUntilExpiry} days`,
            expiryDate: driver.licenseExpiry,
            daysUntilExpiry
          })
        }
      }

      // Get assigned trips that are overdue
      const now = new Date()
      const overdueTrips = await prisma.trip.findMany({
        where: {
          driverId: driver.id,
          status: {
            in: ['DISPATCHED', 'IN_PROGRESS']
          },
          scheduledStart: {
            lt: now
          }
        },
        include: {
          Vehicle: {
            select: {
              name: true,
              licensePlate: true
            }
          }
        }
      })

      overdueTrips.forEach(trip => {
        alerts.push({
          type: 'OVERDUE_TRIP',
          severity: 'high',
          message: `Trip from ${trip.origin} to ${trip.destination} is overdue`,
          tripId: trip.id,
          vehicleName: trip.Vehicle.name,
          origin: trip.origin,
          destination: trip.destination,
          scheduledStart: trip.scheduledStart
        })
      })
    }
  }

  // Sort alerts by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return {
    alerts,
    count: alerts.length,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
    highCount: alerts.filter(a => a.severity === 'high').length,
    mediumCount: alerts.filter(a => a.severity === 'medium').length,
    userRole
  }
}
