/**
 * Notification Read API Route
 * PATCH /api/notifications/:id/read - Mark notification as read
 * Requirements: 4.8, 11.7
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markNotificationAsRead } from '@/lib/notification-service'

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 * Accessible by: Notification owner only
 */
export async function PATCH(req, { params }) {
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

    const notificationId = params.id

    // Mark notification as read (includes authorization check)
    const notification = await markNotificationAsRead(notificationId, session.user.id)

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    })
  } catch (error) {
    console.error('PATCH /api/notifications/:id/read error:', error)

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

    // Handle authorization errors
    if (error.type === 'AUTHORIZATION_ERROR') {
      return NextResponse.json(
        {
          status: error.status || 403,
          type: error.type,
          message: error.message
        },
        { status: error.status || 403 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating the notification'
      },
      { status: 500 }
    )
  }
}
