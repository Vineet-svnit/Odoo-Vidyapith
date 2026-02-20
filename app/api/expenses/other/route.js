/**
 * Other Expense API Routes
 * POST /api/expenses/other - Create general expense entry
 * Requirements: 6.3, 6.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { createExpense } from '@/lib/financial-service'

/**
 * POST /api/expenses/other
 * Create a new general expense entry
 * Accessible by: FLEET_MANAGER, DISPATCHER
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

    // Check authorization - both FLEET_MANAGER and DISPATCHER can create expenses
    if (!hasPermission(session.user.role, 'expenses', 'create')) {
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

    // Create expense
    const expense = await createExpense(body, session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: expense,
        message: 'Expense created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/expenses/other error:', error)

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

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while creating the expense'
      },
      { status: 500 }
    )
  }
}
