/**
 * Custom API Error Classes
 * Standardized error handling for API operations
 * Requirements: 15.4
 */

import { ERROR_TYPES } from './error-messages'

/**
 * Base API Error class
 */
export class APIError extends Error {
  constructor(message, type, status, errors = null) {
    super(message)
    this.name = 'APIError'
    this.type = type
    this.status = status
    this.errors = errors
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_TYPES.AUTHENTICATION_ERROR, 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Access denied') {
    super(message, ERROR_TYPES.AUTHORIZATION_ERROR, 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * Validation Error
 */
export class ValidationError extends APIError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, ERROR_TYPES.VALIDATION_ERROR, 400, errors)
    this.name = 'ValidationError'
  }
}

/**
 * Business Rule Violation Error
 */
export class BusinessRuleError extends APIError {
  constructor(message, errors = null) {
    super(message, ERROR_TYPES.BUSINESS_RULE_VIOLATION, 422, errors)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends APIError {
  constructor(message = 'Resource conflict') {
    super(message, ERROR_TYPES.CONFLICT_ERROR, 409)
    this.name = 'ConflictError'
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, ERROR_TYPES.NOT_FOUND_ERROR, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Server Error
 */
export class ServerError extends APIError {
  constructor(message = 'Internal server error') {
    super(message, ERROR_TYPES.SERVER_ERROR, 500)
    this.name = 'ServerError'
  }
}

/**
 * Handle API response and throw appropriate error
 * @param {Response} response - Fetch API response
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function handleAPIResponse(response) {
  if (!response.ok) {
    let errorData
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: 'An error occurred' }
    }

    const { status, type, message, errors } = errorData

    switch (status) {
      case 401:
        throw new AuthenticationError(message)
      case 403:
        throw new AuthorizationError(message)
      case 400:
        throw new ValidationError(message, errors)
      case 422:
        throw new BusinessRuleError(message, errors)
      case 409:
        throw new ConflictError(message)
      case 404:
        throw new NotFoundError(message)
      default:
        throw new ServerError(message)
    }
  }

  return response.json()
}

/**
 * Create standardized error response for API routes
 * @param {Error} error - Error object
 * @returns {Object} - Standardized error response
 */
export function createErrorResponse(error) {
  // Handle known API errors
  if (error instanceof APIError) {
    return {
      status: error.status,
      type: error.type,
      message: error.message,
      errors: error.errors
    }
  }

  // Handle validation errors from services
  if (error.type === ERROR_TYPES.VALIDATION_ERROR) {
    return {
      status: 400,
      type: error.type,
      message: error.message,
      errors: error.errors
    }
  }

  // Handle business rule violations from services
  if (error.type === ERROR_TYPES.BUSINESS_RULE_VIOLATION) {
    return {
      status: 422,
      type: error.type,
      message: error.message,
      errors: error.errors
    }
  }

  // Handle conflict errors from services
  if (error.type === ERROR_TYPES.CONFLICT_ERROR) {
    return {
      status: 409,
      type: error.type,
      message: error.message
    }
  }

  // Default server error
  console.error('Unhandled error:', error)
  return {
    status: 500,
    type: ERROR_TYPES.SERVER_ERROR,
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An unexpected error occurred'
  }
}
