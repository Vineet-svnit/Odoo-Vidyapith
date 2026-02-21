/**
 * Vehicle Status API Route
 * PATCH /api/vehicles/:id/status - Update vehicle status
 * Requirements: 3.5, 3.6
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { updateVehicleStatus } from '@/lib/vehicle-service'
import { auditLog, AUDIT_ACTIONS, createVehicleAuditMetadata } from '@/lib/audit-helpers'

/**
 * PATCH /api/vehicles/:id/status
 * Update vehicle status
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

    // Check authorization - only FLEET_MANAGER can update vehicle status
    if (!hasPermission(session.user.role, 'vehicles', 'update')) {
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

    // Update vehicle status
    const vehicle = await updateVehicleStatus(params.id, status)

    // Audit log the status update
    await auditLog(
      session.user.id,
      AUDIT_ACTIONS.UPDATE_VEHICLE_STATUS,
      'vehicle',
      vehicle.id,
      createVehicleAuditMetadata(vehicle)
    )

    return NextResponse.json({
      success: true,
      data: vehicle,
      message: 'Vehicle status updated successfully'
    })
  } catch (error) {
    console.error('PATCH /api/vehicles/:id/status error:', error)

    // Handle validation errors
    if (error.type === 'VALIDATION_ERROR') {
      return NextResponse.json(
        {
          status: 400,
          type: error.type,
          message: error.message
        },
        { status: 400 }
      )
    }

    // Handle not found errors
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

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating vehicle status'
      },
      { status: 500 }
    )
  }
}
