/**
 * Cost Trends Analytics API Route
 * GET /api/analytics/costs - Get cost trends over time
 * Requirements: 8.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getCostTrends } from '@/lib/analytics-service'

/**
 * GET /api/analytics/costs
 * Get cost trends with monthly aggregation
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

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const vehicleId = searchParams.get('vehicleId') || null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'month'

    // Validate groupBy parameter
    const validGroupBy = ['month', 'week', 'day']
    if (!validGroupBy.includes(groupBy)) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Invalid groupBy parameter. Must be one of: month, week, day'
        },
        { status: 400 }
      )
    }

    // Default to last 6 months if not provided
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6)),
      end: endDate ? new Date(endDate) : new Date()
    }

    // Get cost trends
    const trends = await getCostTrends(vehicleId, dateRange, groupBy)

    return NextResponse.json({
      success: true,
      data: trends
    })
  } catch (error) {
    console.error('GET /api/analytics/costs error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching cost trends'
      },
      { status: 500 }
    )
  }
}
