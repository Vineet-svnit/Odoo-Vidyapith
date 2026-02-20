/**
 * Analytics Dashboard API Route
 * GET /api/analytics/dashboard - Get dashboard analytics
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getFleetUtilization } from '@/lib/analytics-service'

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics with fleet utilization
 * Accessible by: FLEET_MANAGER only
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

    // Check authorization - only FLEET_MANAGER can access analytics
    if (!hasPermission(session.user.role, 'analytics', 'read')) {
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
      type: searchParams.get('type') || undefined,
      region: searchParams.get('region') || undefined
    }

    // Get fleet utilization
    const utilization = await getFleetUtilization(filters)

    return NextResponse.json({
      success: true,
      data: utilization
    })
  } catch (error) {
    console.error('GET /api/analytics/dashboard error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching dashboard analytics'
      },
      { status: 500 }
    )
  }
}
