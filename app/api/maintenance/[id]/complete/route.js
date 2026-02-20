/**
 * Maintenance Completion API Route
 * PATCH /api/maintenance/:id/complete - Mark maintenance as complete
 * Requirements: 5.3
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { completeMaintenanceLog } from '@/lib/maintenance-service'

/**
 * PATCH /api/maintenance/:id/complete
 * Mark a maintenance log as complete and restore vehicle status
 * Accessible by: FLEET_MANAGER only
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

    // Check authorization - only FLEET_MANAGER can complete maintenance logs
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

    // Complete maintenance log
    const maintenanceLog = await completeMaintenanceLog(id)

    return NextResponse.json({
      success: true,
      data: maintenanceLog,
      message: 'Maintenance completed successfully. Vehicle status restored to AVAILABLE.'
    })
  } catch (error) {
    console.error('PATCH /api/maintenance/:id/complete error:', error)

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
        message: 'An error occurred while completing the maintenance log'
      },
      { status: 500 }
    )
  }
}
