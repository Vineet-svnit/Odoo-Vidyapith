/**
 * Vehicle API Routes
 * GET /api/vehicles - List all vehicles with filters
 * POST /api/vehicles - Create new vehicle
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  createVehicle,
  getAllVehicles
} from '@/lib/vehicle-service'

/**
 * GET /api/vehicles
 * List all vehicles with optional filters
 * Accessible by: FLEET_MANAGER, DISPATCHER
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

    // Check authorization - both FLEET_MANAGER and DISPATCHER can read vehicles
    if (!hasPermission(session.user.role, 'vehicles', 'read')) {
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
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined
    }

    // Get vehicles with filters
    const vehicles = await getAllVehicles(filters)

    return NextResponse.json({
      success: true,
      data: vehicles,
      count: vehicles.length
    })
  } catch (error) {
    console.error('GET /api/vehicles error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching vehicles'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vehicles
 * Create a new vehicle
 * Accessible by: FLEET_MANAGER only
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

    // Check authorization - only FLEET_MANAGER can create vehicles
    if (!hasPermission(session.user.role, 'vehicles', 'create')) {
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

    // Create vehicle
    const vehicle = await createVehicle(body)

    return NextResponse.json(
      {
        success: true,
        data: vehicle,
        message: 'Vehicle created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/vehicles error:', error)

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

    // Handle conflict errors (duplicate license plate)
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

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while creating the vehicle'
      },
      { status: 500 }
    )
  }
}
