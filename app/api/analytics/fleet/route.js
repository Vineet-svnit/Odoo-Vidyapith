/**
 * Fleet Analytics API Route
 * GET /api/analytics/fleet - Get fleet-wide analytics
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getFleetUtilization, generateReport } from '@/lib/analytics-service'

/**
 * GET /api/analytics/fleet
 * Get fleet-wide analytics and metrics
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const vehicleType = searchParams.get('vehicleType')

    // Default to last 30 days if not provided
    const filters = {
      startDate: startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: endDate ? new Date(endDate) : new Date(),
      vehicleType: vehicleType || undefined
    }

    // Get fleet report
    const fleetReport = await generateReport('fleet', filters)

    return NextResponse.json({
      success: true,
      data: fleetReport.data
    })
  } catch (error) {
    console.error('GET /api/analytics/fleet error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching fleet analytics'
      },
      { status: 500 }
    )
  }
}
