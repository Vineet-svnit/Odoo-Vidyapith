/**
 * Audit Log API Routes
 * GET /api/audit-logs - List all audit logs with filters
 * Requirements: 9.6
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { getAuditLogs, getAuditLogsCount } from '@/lib/audit-service'

/**
 * GET /api/audit-logs
 * List all audit logs with optional filters
 * Accessible by: FLEET_MANAGER only
 * 
 * Query Parameters:
 * - userId: Filter by user ID
 * - action: Filter by action type
 * - resource: Filter by resource type
 * - resourceId: Filter by resource ID
 * - startDate: Filter by start date (ISO 8601 format)
 * - endDate: Filter by end date (ISO 8601 format)
 * - limit: Maximum number of results (default: 100)
 * - offset: Number of results to skip (default: 0)
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

    // Check authorization - only FLEET_MANAGER can view audit logs
    if (session.user.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        {
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to view audit logs'
        },
        { status: 403 }
      )
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url)
    const filters = {}

    // User filter
    if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId')
    }

    // Action filter
    if (searchParams.get('action')) {
      filters.action = searchParams.get('action')
    }

    // Resource filter
    if (searchParams.get('resource')) {
      filters.resource = searchParams.get('resource')
    }

    // Resource ID filter
    if (searchParams.get('resourceId')) {
      filters.resourceId = searchParams.get('resourceId')
    }

    // Date range filters
    if (searchParams.get('startDate')) {
      try {
        const startDate = new Date(searchParams.get('startDate'))
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            {
              status: 400,
              type: 'VALIDATION_ERROR',
              message: 'Invalid startDate format. Use ISO 8601 format.'
            },
            { status: 400 }
          )
        }
        filters.startDate = startDate
      } catch (error) {
        return NextResponse.json(
          {
            status: 400,
            type: 'VALIDATION_ERROR',
            message: 'Invalid startDate format. Use ISO 8601 format.'
          },
          { status: 400 }
        )
      }
    }

    if (searchParams.get('endDate')) {
      try {
        const endDate = new Date(searchParams.get('endDate'))
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            {
              status: 400,
              type: 'VALIDATION_ERROR',
              message: 'Invalid endDate format. Use ISO 8601 format.'
            },
            { status: 400 }
          )
        }
        filters.endDate = endDate
      } catch (error) {
        return NextResponse.json(
          {
            status: 400,
            type: 'VALIDATION_ERROR',
            message: 'Invalid endDate format. Use ISO 8601 format.'
          },
          { status: 400 }
        )
      }
    }

    // Pagination
    if (searchParams.get('limit')) {
      const limit = parseInt(searchParams.get('limit'), 10)
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        return NextResponse.json(
          {
            status: 400,
            type: 'VALIDATION_ERROR',
            message: 'Limit must be a number between 1 and 1000'
          },
          { status: 400 }
        )
      }
      filters.limit = limit
    }

    if (searchParams.get('offset')) {
      const offset = parseInt(searchParams.get('offset'), 10)
      if (isNaN(offset) || offset < 0) {
        return NextResponse.json(
          {
            status: 400,
            type: 'VALIDATION_ERROR',
            message: 'Offset must be a non-negative number'
          },
          { status: 400 }
        )
      }
      filters.offset = offset
    }

    // Get audit logs with filters
    const auditLogs = await getAuditLogs(filters)

    // Get total count for pagination
    const totalCount = await getAuditLogsCount(filters)

    return NextResponse.json({
      success: true,
      data: auditLogs,
      pagination: {
        count: auditLogs.length,
        total: totalCount,
        limit: filters.limit || 100,
        offset: filters.offset || 0
      }
    })
  } catch (error) {
    console.error('GET /api/audit-logs error:', error)
    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while fetching audit logs'
      },
      { status: 500 }
    )
  }
}
