/**
 * Driver API Routes
 * GET /api/drivers - List all drivers with filters
 * POST /api/drivers - Create new driver
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  createDriver,
  getAllDrivers
} from '@/lib/driver-service'
import { auditLog, AUDIT_ACTIONS, createDriverAuditMetadata } from '@/lib/audit-helpers'

/**
 * GET /api/drivers
 * List all drivers with optional filters
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

    // Check authorization - both FLEET_MANAGER and DISPATCHER can read drivers
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

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url)
    const filters = {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined
    }

    // Get drivers with filters
    const drivers = await getAllDrivers(filters)

    return NextResponse.json({
      success: true,
      data: drivers,
      count: drivers.length
    })
  } catch (error) {
    console.error('GET /api/drivers error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching drivers'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/drivers
 * Create a new driver
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

    // Check authorization - only FLEET_MANAGER can create drivers
    if (!hasPermission(session.user.role, 'drivers', 'create')) {
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

    // Create driver
    const driver = await createDriver(body)

    // Audit log the driver creation
    await auditLog(
      session.user.id,
      AUDIT_ACTIONS.CREATE_DRIVER,
      'driver',
      driver.id,
      createDriverAuditMetadata(driver)
    )

    return NextResponse.json(
      {
        success: true,
        data: driver,
        message: 'Driver created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/drivers error:', error)

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

    // Handle conflict errors (duplicate license number or userId)
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
        message: 'An error occurred while creating the driver'
      },
      { status: 500 }
    )
  }
}
