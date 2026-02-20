/**
 * Individual Trip API Routes
 * GET /api/trips/:id - Get trip by ID
 * PUT /api/trips/:id - Update trip details
 * Requirements: 4.1, 4.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, canAccessResource } from '@/lib/rbac'
import {
  getTripById,
  updateTripStatus
} from '@/lib/trip-service'
import prisma from '@/lib/prisma'
import { tripUpdateSchema, validateData } from '@/lib/validation'

/**
 * GET /api/trips/:id
 * Get a single trip by ID
 * Accessible by: FLEET_MANAGER, DISPATCHER, DRIVER (own trips only)
 */
export async function GET(req, { params }) {
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

    // Get trip
    const trip = await getTripById(tripId)

    // Check if user can access this specific trip
    if (!canAccessResource(session.user, trip, 'trips')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to access this trip'
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: trip
    })
  } catch (error) {
    console.error('GET /api/trips/:id error:', error)

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

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching the trip'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/trips/:id
 * Update trip details (not status - use PATCH /api/trips/:id/status for that)
 * Accessible by: DISPATCHER, FLEET_MANAGER, DRIVER (own trips only, limited fields)
 */
export async function PUT(req, { params }) {
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

    // Validate update data
    const validation = validateData(tripUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Trip update validation failed',
          errors: validation.errors
        },
        { status: 400 }
      )
    }

    // Update trip
    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: validation.data,
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

    return NextResponse.json({
      success: true,
      data: trip,
      message: 'Trip updated successfully'
    })
  } catch (error) {
    console.error('PUT /api/trips/:id error:', error)

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

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating the trip'
      },
      { status: 500 }
    )
  }
}
