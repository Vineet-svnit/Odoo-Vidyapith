/**
 * API Route Middleware for authentication and authorization
 * Integrates with NextAuth for session management
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import { hasPermission, canAccessResource } from './rbac'

/**
 * Middleware to check if user is authenticated
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with authentication check
 */
export function requireAuth(handler) {
  return async (req, context) => {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return new Response(
        JSON.stringify({
          status: 401,
          type: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in to access this resource'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Attach session to request for downstream use
    req.session = session

    return handler(req, context)
  }
}

/**
 * Middleware to check if user has required permissions
 * @param {string} resource - The resource being accessed
 * @param {string} operation - The operation being performed
 * @returns {Function} - Middleware function
 */
export function requirePermission(resource, operation) {
  return (handler) => {
    return async (req, context) => {
      const session = await getServerSession(authOptions)

      if (!session || !session.user) {
        return new Response(
          JSON.stringify({
            status: 401,
            type: 'AUTHENTICATION_ERROR',
            message: 'You must be logged in to access this resource'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Check if user has required permission
      const hasAccess = hasPermission(session.user.role, resource, operation)

      if (!hasAccess) {
        return new Response(
          JSON.stringify({
            status: 403,
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to perform this action'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Attach session to request
      req.session = session

      return handler(req, context)
    }
  }
}

/**
 * Combined middleware for authentication and authorization
 * @param {Object} options - Configuration options
 * @param {string} options.resource - The resource being accessed
 * @param {string} options.operation - The operation being performed
 * @returns {Function} - Middleware function
 */
export function withAuthAndPermission(options = {}) {
  const { resource, operation } = options

  return (handler) => {
    return async (req, context) => {
      const session = await getServerSession(authOptions)

      // Check authentication
      if (!session || !session.user) {
        return new Response(
          JSON.stringify({
            status: 401,
            type: 'AUTHENTICATION_ERROR',
            message: 'You must be logged in to access this resource'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Check authorization if resource and operation are specified
      if (resource && operation) {
        const hasAccess = hasPermission(session.user.role, resource, operation)

        if (!hasAccess) {
          return new Response(
            JSON.stringify({
              status: 403,
              type: 'AUTHORIZATION_ERROR',
              message: 'You do not have permission to perform this action'
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }

      // Attach session to request
      req.session = session

      return handler(req, context)
    }
  }
}

/**
 * Middleware to verify user can access a specific resource instance
 * Used for checking ownership or assignment
 * @param {string} resourceType - The type of resource
 * @param {Function} getResource - Function to fetch the resource
 * @returns {Function} - Middleware function
 */
export function requireResourceAccess(resourceType, getResource) {
  return (handler) => {
    return async (req, context) => {
      const session = await getServerSession(authOptions)

      if (!session || !session.user) {
        return new Response(
          JSON.stringify({
            status: 401,
            type: 'AUTHENTICATION_ERROR',
            message: 'You must be logged in to access this resource'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Fetch the resource
      const resource = await getResource(req, context)

      if (!resource) {
        return new Response(
          JSON.stringify({
            status: 404,
            type: 'NOT_FOUND_ERROR',
            message: 'Resource not found'
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Check if user can access this specific resource
      const hasAccess = canAccessResource(session.user, resource, resourceType)

      if (!hasAccess) {
        return new Response(
          JSON.stringify({
            status: 403,
            type: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to access this resource'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Attach session and resource to request
      req.session = session
      req.resource = resource

      return handler(req, context)
    }
  }
}

/**
 * Error handler wrapper for API routes
 * Catches errors and returns appropriate error responses
 * @param {Function} handler - The API route handler
 * @returns {Function} - Wrapped handler with error handling
 */
export function withErrorHandler(handler) {
  return async (req, context) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error('API Error:', error)

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return new Response(
          JSON.stringify({
            status: 400,
            type: 'VALIDATION_ERROR',
            message: error.message,
            errors: error.errors || {}
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      if (error.code === 'P2002') {
        // Prisma unique constraint violation
        return new Response(
          JSON.stringify({
            status: 409,
            type: 'CONFLICT_ERROR',
            message: 'A record with this value already exists'
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      if (error.code === 'P2003') {
        // Prisma foreign key constraint violation
        return new Response(
          JSON.stringify({
            status: 400,
            type: 'VALIDATION_ERROR',
            message: 'The specified resource does not exist'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Generic error response
      return new Response(
        JSON.stringify({
          status: 500,
          type: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Compose multiple middleware functions
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} - Composed middleware function
 */
export function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc)
    }, handler)
  }
}
