/**
 * Vehicle Analytics API Route
 * GET /api/analytics/vehicle/:id - Get vehicle-specific analytics
 * Requirements: 8.1, 8.2, 8.3
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { calculateVehicleROI, generateReport } from '@/lib/analytics-service'
import { getFuelEfficiency, getCostPerKm } from '@/lib/financial-service'

/**
 * GET /api/analytics/vehicle/:id
 * Get analytics for a specific vehicle
 * Accessible by: FLEET_MANAGER only
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

    const vehicleId = params.id

    // Parse query parameters for date range and revenue
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const revenue = searchParams.get('revenue')

    // Default to last 30 days if not provided
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30)),
      end: endDate ? new Date(endDate) : new Date()
    }

    // Get vehicle analytics
    const [roiData, fuelEfficiency, costPerKm] = await Promise.all([
      calculateVehicleROI(vehicleId, dateRange, revenue ? parseFloat(revenue) : null),
      getFuelEfficiency(vehicleId, dateRange),
      getCostPerKm(vehicleId, dateRange)
    ])

    return NextResponse.json({
      success: true,
      data: {
        roi: roiData,
        fuelEfficiency,
        costPerKm
      }
    })
  } catch (error) {
    console.error('GET /api/analytics/vehicle/:id error:', error)

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

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching vehicle analytics'
      },
      { status: 500 }
    )
  }
}
