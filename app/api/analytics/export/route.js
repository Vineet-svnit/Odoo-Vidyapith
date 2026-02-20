/**
 * Analytics Export API Route
 * POST /api/analytics/export - Generate and export reports
 * Requirements: 8.4, 8.6
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { generateReport } from '@/lib/analytics-service'

/**
 * POST /api/analytics/export
 * Generate and export a report
 * Accessible by: FLEET_MANAGER only
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

    // Check authorization - only FLEET_MANAGER can export reports
    if (!hasPermission(session.user.role, 'analytics', 'export')) {
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
    const { reportType, filters, format } = body

    // Validate report type
    const validReportTypes = ['fleet', 'vehicle', 'financial', 'driver']
    if (!reportType || !validReportTypes.includes(reportType)) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: 'Invalid report type. Must be one of: fleet, vehicle, financial, driver'
        },
        { status: 400 }
      )
    }

    // Parse date filters
    const reportFilters = {
      ...filters,
      startDate: filters?.startDate ? new Date(filters.startDate) : new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: filters?.endDate ? new Date(filters.endDate) : new Date()
    }

    // Generate report
    const report = await generateReport(reportType, reportFilters)

    // For now, return JSON data
    // In a full implementation, this would generate CSV or PDF based on format parameter
    return NextResponse.json({
      success: true,
      data: report,
      format: format || 'json',
      message: 'Report generated successfully'
    })
  } catch (error) {
    console.error('POST /api/analytics/export error:', error)

    // Handle validation errors
    if (error.message.includes('required')) {
      return NextResponse.json(
        {
          status: 400,
          type: 'VALIDATION_ERROR',
          message: error.message
        },
        { status: 400 }
      )
    }

    // Handle not found errors
    if (error.message.includes('not found')) {
      return NextResponse.json(
        {
          status: 404,
          type: 'NOT_FOUND_ERROR',
          message: error.message
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        status: 500,
        type: 'SERVER_ERROR',
        message: 'An error occurred while generating the report'
      },
      { status: 500 }
    )
  }
}
