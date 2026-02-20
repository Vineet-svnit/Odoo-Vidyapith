/**
 * Trip Issue Reporting API Route
 * POST /api/trips/:id/issue - Report an issue on a trip
 * Requirements: 4.8, 11.6, 11.7
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, canAccessResource } from '@/lib/rbac'
import {
  getTripById,
  reportTripIssue
} from '@/lib/trip-service'

/**
 * POST /api/trips/:id/issue
 * Report an issue on a trip
 * Accessible by: DRIVER (own trips), DISPATCHER, FLEET_MANAGER
 */
export async function POST(req, { params }) {
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

    // Get current trip
    const currentTrip = await getTripById(tripId)

    // Check if user can access this specific trip
    const canUpdate = hasPermission(session.user.role, 'trips', 'update')
    const canUpdateAssigned = hasPermission(session.user.role, 'trips', 'update_assigned')

    if (!canUpdate && !canUpdateAssigned) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to perform this action'
        },
        { status: 403 }
      )
    }

    // If driver, check they can only report issues on their own trips
    if (session.user.role === 'DRIVER' && !canAccessResource(session.user, currentTrip, 'trips')) {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You can only report issues on your own trips'
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { issueDescription, issueType } = body

    if (!issueDescription || issueDescription.trim().length === 0) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Issue description is required'
        },
        { status: 400 }
      )
    }

    // Report issue
    const trip = await reportTripIssue(tripId, {
      issueDescription,
      issueType: issueType || 'general'
    })

    return NextResponse.json({
      success: true,
      data: trip,
      message: 'Issue reported successfully. Fleet managers and dispatchers have been notified.'
    })
  } catch (error) {
    console.error('POST /api/trips/:id/issue error:', error)

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

    if (error.type === 'VALIDATION_ERROR') {
      return NextResponse.json(
        {
          status: 400,
          type: error.type,
          message: error.message
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while reporting the issue'
      },
      { status: 500 }
    )
  }
}
