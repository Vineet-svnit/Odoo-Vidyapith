/**
 * Maintenance API Routes
 * GET /api/maintenance - List all maintenance logs with filters
 * POST /api/maintenance - Create new maintenance log
 * Requirements: 5.1, 5.3, 5.4
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  createMaintenanceLog,
  getAllMaintenanceLogs
} from '@/lib/maintenance-service'

/**
 * GET /api/maintenance
 * List all maintenance logs with optional filters
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

    // Check authorization - both FLEET_MANAGER and DISPATCHER can read maintenance logs
    if (!hasPermission(session.user.role, 'maintenance', 'read')) {
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
      vehicleId: searchParams.get('vehicleId') || undefined,
      serviceType: searchParams.get('serviceType') || undefined,
      completed: searchParams.get('completed') === 'true' ? true : 
                 searchParams.get('completed') === 'false' ? false : undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined
    }

    // Get maintenance logs with filters
    const maintenanceLogs = await getAllMaintenanceLogs(filters)

    return NextResponse.json({
      success: true,
      data: maintenanceLogs,
      count: maintenanceLogs.length
    })
  } catch (error) {
    console.error('GET /api/maintenance error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching maintenance logs'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/maintenance
 * Create a new maintenance log
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

    // Check authorization - only FLEET_MANAGER can create maintenance logs
    if (!hasPermission(session.user.role, 'maintenance', 'create')) {
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

    // Create maintenance log
    const maintenanceLog = await createMaintenanceLog(body, session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: maintenanceLog,
        message: 'Maintenance log created successfully. Vehicle status updated to IN_SHOP.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/maintenance error:', error)

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
          message: error.message
        },
        { status: error.status || 422 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while creating the maintenance log'
      },
      { status: 500 }
    )
  }
}
