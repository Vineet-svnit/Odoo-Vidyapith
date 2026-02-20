/**
 * Trip Status API Route
 * PATCH /api/trips/:id/status - Update trip status
 * Requirements: 4.5, 4.6, 4.7
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, canAccessResource } from '@/lib/rbac'
import {
  getTripById,
  updateTripStatus,
  completeTrip
} from '@/lib/trip-service'

/**
 * PATCH /api/trips/:id/status
 * Update trip status with cascade effects
 * Accessible by: DISPATCHER, FLEET_MANAGER, DRIVER (own trips only, limited statuses)
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

    // Get current trip
    const currentTrip = await getTripById(tripId)

    // Check if user can access this specific trip
    const canUpdate = hasPermission(session.user.role, 'trips', 'update')
    const canUpdateAssigned = hasPermission(session.user.role, 'trips', 'update_assigned')

    if (!canUpdate && !canUpdateAssigned) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // If driver, check they can only update their own trips
    if (session.user.role === 'DRIVER' && !canAccessResource(session.user, currentTrip, 'trips')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You can only update your own trips'
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { status: newStatus, endOdometer, startOdometer } = body

    if (!newStatus) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Status is required'
        },
        { status: 400 }
      )
    }

    // Drivers can only update to certain statuses
    if (session.user.role === 'DRIVER') {
      const allowedDriverStatuses = ['DISPATCHED', 'IN_PROGRESS', 'COMPLETED']
      if (!allowedDriverStatuses.includes(newStatus)) {
        return NextResponse.json(
          {
            status: 403,
            type: 'AUTHORIZATION_ERROR',
            message: 'Drivers can only update status to DISPATCHED, IN_PROGRESS, or COMPLETED'
          },
          { status: 403 }
        )
      }
    }

    // If completing trip, use completeTrip function which requires odometer
    if (newStatus === 'COMPLETED') {
      if (!endOdometer) {
        return NextResponse.json(
          {
            status: 400,
            type: 'VALIDATION_ERROR',
            message: 'End odometer reading is required to complete a trip'
          },
          { status: 400 }
        )
      }

      const trip = await completeTrip(tripId, endOdometer)

      return NextResponse.json({
        success: true,
        data: trip,
        message: 'Trip completed successfully'
      })
    }

    // For other status updates
    const metadata = {}
    if (startOdometer !== undefined) {
      metadata.startOdometer = startOdometer
    }
    if (newStatus === 'IN_PROGRESS' && !currentTrip.actualStart) {
      metadata.actualStart = new Date()
    }

    const trip = await updateTripStatus(tripId, newStatus, metadata)

    return NextResponse.json({
      success: true,
      data: trip,
      message: 'Trip status updated successfully'
    })
  } catch (error) {
    console.error('PATCH /api/trips/:id/status error:', error)

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
          message: error.message
        },
        { status: error.status || 422 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating trip status'
      },
      { status: 500 }
    )
  }
}
