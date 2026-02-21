/**
 * Dashboard KPIs API Route
 * GET /api/dashboard/kpis - Get dashboard KPIs with role-based filtering
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardKPIs } from '@/lib/dashboard-service'

/**
 * GET /api/dashboard/kpis
 * Get dashboard KPIs with role-based filtering
 * Accessible by: All authenticated users (data filtered by role)
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

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url)
    const filters = {}
    
    // Vehicle type filter
    const type = searchParams.get('type')
    if (type && ['TRUCK', 'VAN', 'BIKE'].includes(type)) {
      filters.type = type
    }
    
    // Vehicle status filter
    const status = searchParams.get('status')
    if (status && ['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'OUT_OF_SERVICE'].includes(status)) {
      filters.status = status
    }
    
    // Region filter (not implemented in schema, but accepted for future use)
    const region = searchParams.get('region')
    if (region) {
      filters.region = region
    }

    // Get dashboard KPIs with role-based filtering
    const kpis = await getDashboardKPIs(
      session.user.role,
      session.user.id,
      filters
    )

    return NextResponse.json({
      success: true,
      data: kpis
    })
  } catch (error) {
    console.error('GET /api/dashboard/kpis error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching dashboard KPIs',
        error: error.message
      },
      { status: 500 }
    )
  }
}
