/**
 * Vehicle API Routes - Individual Vehicle Operations
 * GET /api/vehicles/:id - Get vehicle by ID
 * PUT /api/vehicles/:id - Update vehicle
 * DELETE /api/vehicles/:id - Soft delete vehicle (mark as OUT_OF_SERVICE)
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import {
  getVehicleById,
  updateVehicle,
  retireVehicle
} from '@/lib/vehicle-service'
import { auditLog, AUDIT_ACTIONS, createVehicleAuditMetadata } from '@/lib/audit-helpers'

/**
 * GET /api/vehicles/:id
 * Get a specific vehicle by ID
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

    // Parse query parameters for includes
    const { searchParams } = new URL(req.url)
    const options = {
      includeTrips: searchParams.get('includeTrips') === 'true',
      includeMaintenance: searchParams.get('includeMaintenance') === 'true',
      includeFuelLogs: searchParams.get('includeFuelLogs') === 'true'
    }

    // Get vehicle
    const vehicle = await getVehicleById(params.id, options)

    return NextResponse.json({
      success: true,
      data: vehicle
    })
  } catch (error) {
    console.error('GET /api/vehicles/:id error:', error)

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
        message: 'An error occurred while fetching the vehicle'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/vehicles/:id
 * Update a vehicle
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

    // Check authorization - only FLEET_MANAGER can update vehicles
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

    // Update vehicle
    const vehicle = await updateVehicle(params.id, body)

    // Audit log the vehicle update
    await auditLog(
      session.user.id,
      AUDIT_ACTIONS.UPDATE_VEHICLE,
      'vehicle',
      vehicle.id,
      createVehicleAuditMetadata(vehicle)
    )

    return NextResponse.json({
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully'
    })
  } catch (error) {
    console.error('PUT /api/vehicles/:id error:', error)

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
          status: 404,
          type: error.type,
          message: error.message
        },
        { status: 404 }
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
        message: 'An error occurred while updating the vehicle'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vehicles/:id
 * Soft delete a vehicle (mark as OUT_OF_SERVICE)
 * Historical trip and expense records are preserved
 * Accessible by: FLEET_MANAGER only
 */
export async function DELETE(req, { params }) {
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

    // Check authorization - only FLEET_MANAGER can delete/retire vehicles
    if (!hasPermission(session.user.role, 'vehicles', 'delete')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Retire vehicle (soft delete by marking as OUT_OF_SERVICE)
    const vehicle = await retireVehicle(params.id)

    // Audit log the vehicle deletion/retirement
    await auditLog(
      session.user.id,
      AUDIT_ACTIONS.DELETE_VEHICLE,
      'vehicle',
      vehicle.id,
      createVehicleAuditMetadata(vehicle)
    )

    return NextResponse.json({
      success: true,
      data: vehicle,
      message: 'Vehicle retired successfully. Historical trip and expense records are preserved.'
    })
  } catch (error) {
    console.error('DELETE /api/vehicles/:id error:', error)

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
        message: 'An error occurred while retiring the vehicle'
      },
      { status: 500 }
    )
  }
}
