/**
 * Driver Status API Route
 * PATCH /api/drivers/:id/status - Update driver status
 * Requirements: 7.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { updateDriverStatus } from '@/lib/driver-service'
import { auditLog, AUDIT_ACTIONS, createDriverAuditMetadata } from '@/lib/audit-helpers'

/**
 * PATCH /api/drivers/:id/status
 * Update driver status (ON_DUTY, OFF_DUTY, SUSPENDED)
 * Accessible by: FLEET_MANAGER only (for suspend operation)
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

    // Check authorization - only FLEET_MANAGER can suspend drivers
    if (!hasPermission(session.user.role, 'drivers', 'suspend')) {
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
    const { status } = body

    if (!status) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Status is required'
        },
        { status: 400 }
      )
    }

    // Update driver status
    const driver = await updateDriverStatus(driverId, status)

    // Audit log the status update (especially important for suspensions)
    const action = status === 'SUSPENDED' ? AUDIT_ACTIONS.SUSPEND_DRIVER : AUDIT_ACTIONS.UPDATE_DRIVER_STATUS
    await auditLog(
      session.user.id,
      action,
      'driver',
      driver.id,
      createDriverAuditMetadata(driver)
    )

    return NextResponse.json({
      success: true,
      data: driver,
      message: `Driver status updated to ${status}`
    })
  } catch (error) {
    console.error('PATCH /api/drivers/:id/status error:', error)

    // Handle validation errors
    if (error.type === 'VALIDATION_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 400,
          type: error.type,
          message: error.message
        },
        { status: error.status || 400 }
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

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating driver status'
      },
      { status: 500 }
    )
  }
}
