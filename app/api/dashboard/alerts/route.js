/**
 * Dashboard Alerts API Route
 * GET /api/dashboard/alerts - Get active alerts for the user
 * Requirements: 7.7, 11.7, 11.8
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveAlerts } from '@/lib/dashboard-service'

/**
 * GET /api/dashboard/alerts
 * Get active alerts for the user based on their role
 * Accessible by: All authenticated users (alerts filtered by role)
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

    // Get active alerts with role-based filtering
    const alerts = await getActiveAlerts(
      session.user.role,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: alerts
    })
  } catch (error) {
    console.error('GET /api/dashboard/alerts error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching alerts',
        error: error.message
      },
      { status: 500 }
    )
  }
}
