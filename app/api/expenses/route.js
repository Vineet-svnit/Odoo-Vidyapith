/**
 * Expense API Routes
 * GET /api/expenses - List all expenses with filters
 * Requirements: 6.1, 6.3, 6.5, 6.6
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getAllExpenses } from '@/lib/financial-service'

/**
 * GET /api/expenses
 * List all expenses with optional filters
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

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url)
    const filters = {
      vehicleId: searchParams.get('vehicleId') || undefined,
      tripId: searchParams.get('tripId') || undefined,
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined
    }

    // Get expenses with filters
    const expenses = await getAllExpenses(filters)

    return NextResponse.json({
      success: true,
      data: expenses,
      count: expenses.length
    })
  } catch (error) {
    console.error('GET /api/expenses error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching expenses'
      },
      { status: 500 }
    )
  }
}
