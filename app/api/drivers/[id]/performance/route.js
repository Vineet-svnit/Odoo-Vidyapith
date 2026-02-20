/**
 * Driver Performance API Route
 * GET /api/drivers/:id/performance - Get driver performance metrics
 * Requirements: 7.3
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getDriverPerformance } from '@/lib/driver-service'

/**
 * GET /api/drivers/:id/performance
 * Get driver performance metrics for a date range
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
    if (!hasPermission(session.user.role, 'drivers', 'read')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    const driverId = params.id

    // Parse query parameters for date range
    const { searchParams } = new URL(req.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')

    // Default to last 30 days if not provided
    const end = endParam ? new Date(endParam) : new Date()
    const start = startParam ? new Date(startParam) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
        },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Start date must be before end date'
        },
        { status: 400 }
      )
    }

    // Get performance metrics
    const performance = await getDriverPerformance(driverId, { start, end })

    return NextResponse.json({
      success: true,
      data: performance
    })
  } catch (error) {
    console.error('GET /api/drivers/:id/performance error:', error)

    // Handle not found errors
    if (error.type === 'NOT_FOUND_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 404,
          type: error.type,
          message: error.message
        },
        { status: error.status || 404 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching driver performance'
      },
      { status: 500 }
    )
  }
}
