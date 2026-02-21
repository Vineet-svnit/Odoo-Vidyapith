/**
 * API Middleware Utilities
 * Reusable middleware for API routes with standardized error handling
 * Requirements: 15.4
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { createErrorResponse } from './api-error'

/**
 * Wrap API handler with error handling
 * @param {Function} handler - API route handler
 * @returns {Function} - Wrapped handler
 */
export function withErrorHandling(handler) {
  return async (req, context) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error('API Error:', error)
      const errorResponse = createErrorResponse(error)
      return NextResponse.json(errorResponse, { status: errorResponse.status })
    }
  }
}

/**
 * Wrap API handler with authentication check
 * @param {Function} handler - API route handler
 * @returns {Function} - Wrapped handler
 */
export function withAuth(handler) {
  return withErrorHandling(async (req, context) => {
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

    // Add session to request context
    req.session = session
    
    return handler(req, context)
  })
}

/**
 * Wrap API handler with authorization check
 * @param {string} resource - Resource name (e.g., 'vehicles', 'trips')
 * @param {string} operation - Operation name (e.g., 'read', 'create')
 * @returns {Function} - Middleware function
 */
export function withPermission(resource, operation) {
  return (handler) => {
    return withAuth(async (req, context) => {
      const { session } = req

      if (!hasPermission(session.user.role, resource, operation)) {
        return NextResponse.json(
          {
            status: 403,
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to perform this action'
          },
          { status: 403 }
        )
      }

      return handler(req, context)
    })
  }
}

/**
 * Compose multiple middleware functions
 * @param {...Function} middlewares - Middleware functions
 * @returns {Function} - Composed middleware
 */
export function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    )
  }
}

/**
 * Parse and validate request body
 * @param {Request} req - Request object
 * @param {Object} schema - Zod schema for validation
 * @returns {Promise<Object>} - Parsed and validated data
 */
export async function parseBody(req, schema) {
  try {
    const body = await req.json()
    
    if (schema) {
      const result = schema.safeParse(body)
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        
        const error = new Error('Validation failed')
        error.type = 'VALIDATION_ERROR'
        error.errors = errors
        throw error
      }
      
      return result.data
    }
    
    return body
  } catch (error) {
    if (error.type === 'VALIDATION_ERROR') {
      throw error
    }
    
    const validationError = new Error('Invalid request body')
    validationError.type = 'VALIDATION_ERROR'
    throw validationError
  }
}

/**
 * Create success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 * @returns {NextResponse} - JSON response
 */
export function successResponse(data, message = null, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {string} type - Error type
 * @param {number} status - HTTP status code
 * @param {Object} errors - Additional error details
 * @returns {NextResponse} - JSON response
 */
export function errorResponse(message, type = 'SERVER_ERROR', status = 500, errors = null) {
  return NextResponse.json(
    {
      status,
      type,
      message,
      errors,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}
