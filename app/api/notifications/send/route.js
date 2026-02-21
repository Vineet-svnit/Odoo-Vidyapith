/**
 * Notification Send API Route
 * POST /api/notifications/send - Send notification (internal only)
 * Requirements: 4.8, 11.7, 13.1
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { sendNotification } from '@/lib/notification-service'

/**
 * POST /api/notifications/send
 * Send notification to specific users (internal use only)
 * Accessible by: FLEET_MANAGER, DISPATCHER only
 * 
 * This endpoint is primarily for internal system use and administrative purposes.
 * Most notifications are automatically created by other services (trip-service, etc.)
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

    // Check authorization - only FLEET_MANAGER and DISPATCHER can send notifications
    if (!hasPermission(session.user.role, 'notifications', 'create')) {
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
    const { userIds, type, message, metadata } = body

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'userIds must be a non-empty array'
        },
        { status: 400 }
      )
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'type is required and must be a string'
        },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'message is required and must be a string'
        },
        { status: 400 }
      )
    }

    // Send notifications
    const notifications = await sendNotification(userIds, type, message, metadata)

    return NextResponse.json(
      {
        success: true,
        data: notifications,
        count: notifications.length,
        message: `${notifications.length} notification${notifications.length === 1 ? '' : 's'} sent successfully`
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/notifications/send error:', error)

    // Handle validation errors
    if (error.type === 'VALIDATION_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 400,
          type: error.type,
          message: error.message
        },
        { status: error.status || 400 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while sending notifications'
      },
      { status: 500 }
    )
  }
}
