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
  validateTripCreation
} from '@/lib/trip-service'
import prisma from '@/lib/prisma'

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

    // Vehicle reassignment rules: can only reassign if trip hasn't started (not IN_PROGRESS)
    if (vehicleId && currentTrip.status === 'IN_PROGRESS') {
      return NextResponse.json(
        {
          status: 422,
          type: 'BUSINESS_RULE_VIOLATION',
          message: 'Cannot reassign vehicle for a trip that is already in progress'
        },
        { status: 422 }
      )
    }

    // Prepare new trip data for validation
    const newTripData = {
      vehicleId: vehicleId || currentTrip.vehicleId,
      driverId: driverId || currentTrip.driverId,
      cargoWeight: currentTrip.cargoWeight
    }

    // Validate the new assignment
    const validation = await validateTripCreation(newTripData)
    if (!validation.valid) {
      return NextResponse.json(
        {
          status: 422,
          type: 'BUSINESS_RULE_VIOLATION',
          message: 'Reassignment validation failed',
          errors: validation.errors
        },
        { status: 422 }
      )
    }

    // Perform reassignment in a transaction
    const trip = await prisma.$transaction(async (tx) => {
      // Store original assignment for audit
      const originalVehicleId = currentTrip.vehicleId
      const originalDriverId = currentTrip.driverId

      // Update trip with new assignment
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          vehicleId: vehicleId || currentTrip.vehicleId,
          driverId: driverId || currentTrip.driverId
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

      // If vehicle was reassigned and trip is dispatched, update vehicle statuses
      if (vehicleId && currentTrip.status === 'DISPATCHED') {
        // Return old vehicle to AVAILABLE
        await tx.vehicle.update({
          where: { id: originalVehicleId },
          data: { status: 'AVAILABLE' }
        })

        // Set new vehicle to ON_TRIP
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: 'ON_TRIP' }
        })
      }

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'TRIP_REASSIGNMENT',
          resource: 'trip',
          resourceId: tripId,
          metadata: {
            originalVehicleId,
            originalDriverId,
            newVehicleId: vehicleId || originalVehicleId,
            newDriverId: driverId || originalDriverId,
            reason,
            timestamp: new Date().toISOString()
          }
        }
      })

      // Create notifications for affected drivers
      if (driverId) {
        // Notify original driver
        const originalDriver = await tx.driver.findUnique({
          where: { id: originalDriverId },
          include: { user: true }
        })

        if (originalDriver) {
          await tx.notification.create({
            data: {
              userId: originalDriver.userId,
              type: 'TRIP_REASSIGNMENT',
              message: `Trip ${tripId} has been reassigned to another driver. Reason: ${reason}`,
              metadata: {
                tripId,
                reason
              }
            }
          })
        }

        // Notify new driver
        const newDriver = await tx.driver.findUnique({
          where: { id: driverId },
          include: { user: true }
        })

        if (newDriver) {
          await tx.notification.create({
            data: {
              userId: newDriver.userId,
              type: 'TRIP_ASSIGNMENT',
              message: `You have been assigned to trip ${tripId}. Reason: ${reason}`,
              metadata: {
                tripId,
                reason
              }
            }
          })
        }
      }

      return updatedTrip
    })

    return NextResponse.json({
      success: true,
      data: trip,
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
