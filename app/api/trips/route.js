/**
 * Trip API Routes
 * GET /api/trips - List all trips with role-based filtering
 * POST /api/trips - Create new trip
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, filterByRole } from '@/lib/rbac'
import {
  createTrip,
  getAllTrips
} from '@/lib/trip-service'
import { auditLog, AUDIT_ACTIONS, createTripAuditMetadata } from '@/lib/audit-helpers'

/**
 * GET /api/trips
 * List all trips with optional filters and role-based access
 * Accessible by: FLEET_MANAGER, DISPATCHER, DRIVER (own trips only)
 */
export async function GET(req) {
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

    // Check authorization
    const canReadAll = hasPermission(session.user.role, 'trips', 'read')
    const canReadAssigned = hasPermission(session.user.role, 'trips', 'read_assigned')

    if (!canReadAll && !canReadAssigned) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url)
    const filters = {
      status: searchParams.get('status') || undefined,
      vehicleId: searchParams.get('vehicleId') || undefined,
      driverId: searchParams.get('driverId') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined
    }

    // Get trips with filters
    let trips = await getAllTrips(filters)

    // Apply role-based filtering
    // Drivers can only see their own trips
    if (session.user.role === 'DRIVER') {
      trips = filterByRole(trips, session.user.role, session.user.id, 'trips')
    }

    return NextResponse.json({
      success: true,
      data: trips,
      count: trips.length
    })
  } catch (error) {
    console.error('GET /api/trips error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching trips'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/trips
 * Create a new trip with validation
 * Accessible by: DISPATCHER, FLEET_MANAGER
 */
export async function POST(req) {
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

    // Check authorization - DISPATCHER and FLEET_MANAGER can create trips
    if (!hasPermission(session.user.role, 'trips', 'create')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()

    // Create trip
    const trip = await createTrip(body, session.user.id)

    // Audit log the trip creation
    await auditLog(
      session.user.id,
      AUDIT_ACTIONS.CREATE_TRIP,
      'trip',
      trip.id,
      createTripAuditMetadata(trip)
    )

    return NextResponse.json(
      {
        success: true,
        data: trip,
        message: 'Trip created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/trips error:', error)

    // Handle validation errors
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

    // Handle business rule violations
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

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while creating the trip'
      },
      { status: 500 }
    )
  }
}
