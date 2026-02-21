/**
 * Trip Reassignment API Route
 * PATCH /api/trips/:id/reassign - Reassign vehicle or driver for a trip
 * Requirements: 13.2, 13.3, 13.4, 13.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  getTripById,
  emergencyVehicleReassignment,
  emergencyDriverReassignment
} from '@/lib/trip-service'

/**
 * PATCH /api/trips/:id/reassign
 * Reassign vehicle or driver for emergency situations
 * Accessible by: DISPATCHER, FLEET_MANAGER
 */
export async function PATCH(req, { params }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        {
          status: 401,
          type: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in to access this resource'
        },
        { status: 401 }
      )
    }

    const tripId = params.id

    // Check authorization - only DISPATCHER and FLEET_MANAGER can reassign
    if (!hasPermission(session.user.role, 'trips', 'reassign')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Get current trip
    const currentTrip = await getTripById(tripId)

    // Parse request body
    const body = await req.json()
    const { vehicleId, driverId, reason } = body

    if (!vehicleId && !driverId) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Either vehicleId or driverId must be provided for reassignment'
        },
        { status: 400 }
      )
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Reason for reassignment is required'
        },
        { status: 400 }
      )
    }

    // Perform emergency reassignment
    let result
    if (vehicleId && driverId) {
      // Both vehicle and driver reassignment
      const vehicleResult = await emergencyVehicleReassignment(tripId, vehicleId, reason, session.user.id)
      result = await emergencyDriverReassignment(tripId, driverId, reason, session.user.id)
      result.vehicleAuditLog = vehicleResult.auditLog
    } else if (vehicleId) {
      // Vehicle reassignment only
      result = await emergencyVehicleReassignment(tripId, vehicleId, reason, session.user.id)
    } else {
      // Driver reassignment only
      result = await emergencyDriverReassignment(tripId, driverId, reason, session.user.id)
    }

    return NextResponse.json({
      success: true,
      data: result.trip,
      auditLog: result.auditLog,
      notifications: result.notifications,
      message: 'Trip reassigned successfully'
    })
  } catch (error) {
    console.error('PATCH /api/trips/:id/reassign error:', error)

    if (error.type === 'NOT_FOUND_ERROR') {
      return NextResponse.json(
        {
          status: 404,
          type: error.type,
          message: error.message
        },
        { status: 404 }
      )
    }

    if (error.type === 'VALIDATION_ERROR') {
      return NextResponse.json(
        {
          status: 400,
          type: error.type,
          message: error.message,
          errors: error.errors
        },
        { status: 400 }
      )
    }

    if (error.type === 'BUSINESS_RULE_VIOLATION') {
      return NextResponse.json(
        {
          status: error.status || 422,
          type: error.type,
          message: error.message,
          errors: error.errors
        },
        { status: error.status || 422 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while reassigning the trip'
      },
      { status: 500 }
    )
  }
}
