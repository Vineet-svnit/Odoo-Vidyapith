/**
 * Vehicle Expense API Routes
 * GET /api/expenses/vehicle/:id - Get expenses for a specific vehicle
 * Requirements: 6.3, 6.5, 6.6
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getVehicleExpenses } from '@/lib/financial-service'

/**
 * GET /api/expenses/vehicle/:id
 * Get all expenses for a specific vehicle
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

    // Check authorization - both FLEET_MANAGER and DISPATCHER can read expenses
    if (!hasPermission(session.user.role, 'expenses', 'read')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Get vehicle ID from params
    const vehicleId = params.id

    // Parse query parameters for date range
    const { searchParams } = new URL(req.url)
    const options = {
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined
    }

    // Get expenses for the vehicle
    const expenses = await getVehicleExpenses(vehicleId, options)

    return NextResponse.json({
      success: true,
      data: expenses,
      count: expenses.length,
      vehicleId
    })
  } catch (error) {
    console.error('GET /api/expenses/vehicle/:id error:', error)

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
        message: 'An error occurred while fetching vehicle expenses'
      },
      { status: 500 }
    )
  }
}
