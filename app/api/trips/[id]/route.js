/**
 * Trip Detail API Route
 * GET /api/trips/:id - Get single trip details
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, canAccessResource } from '@/lib/rbac'
import { getTripById } from '@/lib/trip-service'

/**
 * GET /api/trips/:id
 * Get single trip with full details
 * Accessible by: FLEET_MANAGER, DISPATCHER, DRIVER (own trips only)
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

    const tripId = params.id

    // Check authorization
    const canReadAll = hasPermission(session.user.role, 'trips', 'read')
    const canReadAssigned = hasPermission(session.user.role, 'trips', 'read_assigned')

    if (!canReadAll && !canReadAssigned) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // Get trip
    const trip = await getTripById(tripId, { includeExpenses: true })

    // If driver, check they can only access their own trips
    if (session.user.role === 'DRIVER' && !canAccessResource(session.user, trip, 'trips')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You can only access your own trips'
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: trip
    })
  } catch (error) {
    console.error('GET /api/trips/:id error:', error)

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
        message: 'An error occurred while fetching trip details'
      },
      { status: 500 }
    )
  }
}
