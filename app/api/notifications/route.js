/**
 * Notification API Routes
 * GET /api/notifications - List user notifications
 * Requirements: 4.8, 11.7
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead
} from '@/lib/notification-service'

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 * Accessible by: All authenticated users
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

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : undefined

    // Get notifications for the authenticated user
    const notifications = await getUserNotifications(session.user.id, {
      unreadOnly,
      limit
    })

    // Get unread count
    const unreadCount = await getUnreadNotificationCount(session.user.id)

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount
    })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching notifications'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for the authenticated user
 * Accessible by: All authenticated users
 */
export async function PATCH(req) {
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

    // Mark all notifications as read
    const result = await markAllNotificationsAsRead(session.user.id)

    return NextResponse.json({
      success: true,
      message: `${result.count} notification${result.count === 1 ? '' : 's'} marked as read`,
      count: result.count
    })
  } catch (error) {
    console.error('PATCH /api/notifications error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while updating notifications'
      },
      { status: 500 }
    )
  }
}
