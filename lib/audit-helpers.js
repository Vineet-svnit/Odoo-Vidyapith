/**
 * Audit Logging Helpers
 * Convenience functions for adding audit logging to API routes
 * Requirements: 9.6, 13.5
 */

import { logAction } from './audit-service.js'

/**
 * Audit action constants for consistency
 */
export const AUDIT_ACTIONS = {
  // Vehicle actions
  CREATE_VEHICLE: 'CREATE_VEHICLE',
  UPDATE_VEHICLE: 'UPDATE_VEHICLE',
  DELETE_VEHICLE: 'DELETE_VEHICLE',
  UPDATE_VEHICLE_STATUS: 'UPDATE_VEHICLE_STATUS',
  
  // Driver actions
  CREATE_DRIVER: 'CREATE_DRIVER',
  UPDATE_DRIVER: 'UPDATE_DRIVER',
  UPDATE_DRIVER_STATUS: 'UPDATE_DRIVER_STATUS',
  SUSPEND_DRIVER: 'SUSPEND_DRIVER',
  
  // Trip actions
  CREATE_TRIP: 'CREATE_TRIP',
  UPDATE_TRIP: 'UPDATE_TRIP',
  UPDATE_TRIP_STATUS: 'UPDATE_TRIP_STATUS',
  CANCEL_TRIP: 'CANCEL_TRIP',
  COMPLETE_TRIP: 'COMPLETE_TRIP',
  REPORT_TRIP_ISSUE: 'REPORT_TRIP_ISSUE',
  TRIP_REASSIGNMENT: 'TRIP_REASSIGNMENT',
  
  // Maintenance actions
  CREATE_MAINTENANCE: 'CREATE_MAINTENANCE',
  UPDATE_MAINTENANCE: 'UPDATE_MAINTENANCE',
  COMPLETE_MAINTENANCE: 'COMPLETE_MAINTENANCE',
  
  // Expense actions
  CREATE_FUEL_LOG: 'CREATE_FUEL_LOG',
  CREATE_EXPENSE: 'CREATE_EXPENSE',
  
  // Auth actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  INVITE_USER: 'INVITE_USER',
  ACCEPT_INVITATION: 'ACCEPT_INVITATION',
  
  // Report actions
  EXPORT_REPORT: 'EXPORT_REPORT'
}

/**
 * Log an audit action with error handling
 * Silently fails to prevent audit logging from breaking main operations
 * @param {string} userId - User performing the action
 * @param {string} action - Action being performed (use AUDIT_ACTIONS constants)
 * @param {string} resource - Resource type
 * @param {string} [resourceId] - Resource ID
 * @param {Object} [metadata] - Additional context
 */
export async function auditLog(userId, action, resource, resourceId = null, metadata = null) {
  try {
    await logAction({
      userId,
      action,
      resource,
      resourceId,
      metadata
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break main operations
    console.error('Audit logging failed:', error)
  }
}

/**
 * Create audit metadata for vehicle operations
 * @param {Object} vehicle - Vehicle data
 * @returns {Object} Metadata object
 */
export function createVehicleAuditMetadata(vehicle) {
  return {
    licensePlate: vehicle.licensePlate,
    type: vehicle.type,
    status: vehicle.status,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create audit metadata for driver operations
 * @param {Object} driver - Driver data
 * @returns {Object} Metadata object
 */
export function createDriverAuditMetadata(driver) {
  return {
    driverName: `${driver.firstName} ${driver.lastName}`,
    licenseNumber: driver.licenseNumber,
    status: driver.status,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create audit metadata for trip operations
 * @param {Object} trip - Trip data
 * @returns {Object} Metadata object
 */
export function createTripAuditMetadata(trip) {
  return {
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    status: trip.status,
    origin: trip.origin,
    destination: trip.destination,
    timestamp: new Date().toISOString()
  }
}
