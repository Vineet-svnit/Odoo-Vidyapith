/**
 * Individual Driver API Routes
 * GET /api/drivers/:id - Get driver by ID
 * PUT /api/drivers/:id - Update driver
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  getDriverById,
  updateDriver
} from '@/lib/driver-service'

/**
 * GET /api/drivers/:id
 * Get driver by ID with details
 * Accessible by: FLEET_MANAGER, DISPATCHER
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

    // Check authorization
    if (!hasPermission(session.user.role, 'drivers', 'read')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    const driverId = params.id

    // Parse query parameters for includes
    const { searchParams } = new URL(req.url)
    const includeTrips = searchParams.get('includeTrips') === 'true'

    // Get driver
    const driver = await getDriverById(driverId, { includeTrips })

    return NextResponse.json({
      success: true,
      data: driver
    })
  } catch (error) {
    console.error('GET /api/drivers/:id error:', error)

    // Handle not found errors
    if (error.type === 'NOT_FOUND_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 404,
          type: error.type,
          message: error.message
        },
        { status: error.status || 404 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching the driver'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/drivers/:id
 * Update driver details
 * Accessible by: FLEET_MANAGER only
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

    // Check authorization - only FLEET_MANAGER can update drivers
    if (!hasPermission(session.user.role, 'drivers', 'update')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    const driverId = params.id

    // Parse request body
    const body = await req.json()

    // Update driver
    const driver = await updateDriver(driverId, body)

    return NextResponse.json({
      success: true,
      data: driver,
      message: 'Driver updated successfully'
    })
  } catch (error) {
    console.error('PUT /api/drivers/:id error:', error)

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

    // Handle not found errors
    if (error.type === 'NOT_FOUND_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 404,
          type: error.type,
          message: error.message
        },
        { status: error.status || 404 }
      )
    }

    // Handle conflict errors (duplicate license number)
    if (error.type === 'CONFLICT_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 409,
          type: error.type,
          message: error.message
        },
        { status: error.status || 409 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating the driver'
      },
      { status: 500 }
    )
  }
}
