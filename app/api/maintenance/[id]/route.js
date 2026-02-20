/**
 * Individual Maintenance Log API Routes
 * PUT /api/maintenance/:id - Update maintenance log
 * Requirements: 5.4
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  getMaintenanceLogById,
  updateMaintenanceLog
} from '@/lib/maintenance-service'

/**
 * PUT /api/maintenance/:id
 * Update an existing maintenance log
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

    // Check authorization - only FLEET_MANAGER can update maintenance logs
    if (!hasPermission(session.user.role, 'maintenance', 'update')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Get maintenance log ID from params
    const { id } = params

    // Parse request body
    const body = await req.json()

    // Update maintenance log
    const maintenanceLog = await updateMaintenanceLog(id, body)

    return NextResponse.json({
      success: true,
      data: maintenanceLog,
      message: 'Maintenance log updated successfully'
    })
  } catch (error) {
    console.error('PUT /api/maintenance/:id error:', error)

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

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating the maintenance log'
      },
      { status: 500 }
    )
  }
}
