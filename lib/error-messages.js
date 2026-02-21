/**
 * Standardized Error Messages
 * Centralized error message templates for consistent user feedback
 * Requirements: 15.4
 */

// Error type constants
export const ERROR_TYPES = {
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  // Authentication errors
  [ERROR_TYPES.AUTHENTICATION_ERROR]: {
    title: 'Authentication Required',
    message: 'You must be logged in to access this resource. Please sign in and try again.',
    action: 'Sign In'
  },
  
  // Authorization errors
  [ERROR_TYPES.AUTHORIZATION_ERROR]: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action. Please contact your administrator if you believe this is an error.',
    action: 'Go Back'
  },
  
  // Validation errors
  [ERROR_TYPES.VALIDATION_ERROR]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again. Some fields may contain invalid or missing information.',
    action: 'Review Form'
  },
  
  // Business rule violations
  [ERROR_TYPES.BUSINESS_RULE_VIOLATION]: {
    title: 'Operation Not Allowed',
    message: 'This operation cannot be completed due to business rules or constraints.',
    action: 'Review Details'
  },
  
  // Conflict errors
  [ERROR_TYPES.CONFLICT_ERROR]: {
    title: 'Conflict Detected',
    message: 'This operation conflicts with existing data. Please check for duplicates or concurrent modifications.',
    action: 'Refresh'
  },
  
  // Not found errors
  [ERROR_TYPES.NOT_FOUND_ERROR]: {
    title: 'Not Found',
    message: 'The requested resource could not be found. It may have been deleted or moved.',
    action: 'Go Back'
  },
  
  // Server errors
  [ERROR_TYPES.SERVER_ERROR]: {
    title: 'Server Error',
    message: 'An unexpected error occurred on the server. Please try again later or contact support if the problem persists.',
    action: 'Retry'
  },
  
  // Network errors
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    action: 'Retry'
  },
  
  // Timeout errors
  [ERROR_TYPES.TIMEOUT_ERROR]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete. Please try again.',
    action: 'Retry'
  }
}

// Specific error messages for common scenarios
export const SPECIFIC_ERRORS = {
  // Vehicle errors
  VEHICLE_NOT_AVAILABLE: 'The selected vehicle is not available for assignment. It may be on another trip or under maintenance.',
  VEHICLE_CAPACITY_EXCEEDED: 'The cargo weight exceeds the vehicle\'s maximum load capacity. Please select a larger vehicle or reduce the cargo weight.',
  VEHICLE_LICENSE_PLATE_DUPLICATE: 'A vehicle with this license plate already exists. License plates must be unique.',
  VEHICLE_OUT_OF_SERVICE: 'This vehicle is marked as out of service and cannot be assigned to trips.',
  
  // Driver errors
  DRIVER_NOT_AVAILABLE: 'The selected driver is not available for assignment. They may be on another trip or off duty.',
  DRIVER_LICENSE_EXPIRED: 'The driver\'s license has expired. Please update the license information before assigning trips.',
  DRIVER_LICENSE_CATEGORY_MISMATCH: 'The driver\'s license category does not match the vehicle type. Please select a driver with the appropriate license.',
  DRIVER_SUSPENDED: 'This driver is currently suspended and cannot be assigned to trips.',
  
  // Trip errors
  TRIP_INVALID_STATUS_TRANSITION: 'This trip status change is not allowed. Please check the current status and try again.',
  TRIP_ALREADY_COMPLETED: 'This trip has already been completed and cannot be modified.',
  TRIP_ODOMETER_INVALID: 'The odometer reading must be greater than or equal to the starting odometer.',
  
  // Maintenance errors
  MAINTENANCE_VEHICLE_IN_USE: 'This vehicle is currently assigned to a trip and cannot be placed under maintenance.',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  PASSWORD_RESET_TOKEN_INVALID: 'This password reset link is invalid or has expired. Please request a new one.',
  INVITATION_TOKEN_INVALID: 'This invitation link is invalid or has expired. Please contact your administrator.',
  
  // Generic errors
  OPERATION_FAILED: 'The operation could not be completed. Please try again.',
  DATA_FETCH_FAILED: 'Unable to load data. Please refresh the page and try again.',
  DATA_SAVE_FAILED: 'Unable to save changes. Please try again.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again or contact support.'
}

/**
 * Get user-friendly error message from error object
 * @param {Error|Object} error - Error object or API error response
 * @returns {Object} - { title, message, action }
 */
export function getErrorMessage(error) {
  // Handle API error responses
  if (error?.type && ERROR_MESSAGES[error.type]) {
    const template = ERROR_MESSAGES[error.type]
    return {
      title: template.title,
      message: error.message || template.message,
      action: template.action,
      details: error.errors || null
    }
  }

  // Handle specific error messages
  if (error?.message && SPECIFIC_ERRORS[error.message]) {
    return {
      title: ERROR_MESSAGES[ERROR_TYPES.BUSINESS_RULE_VIOLATION].title,
      message: SPECIFIC_ERRORS[error.message],
      action: 'Review Details',
      details: null
    }
  }

  // Handle network errors
  if (error?.message === 'Failed to fetch' || error?.name === 'NetworkError') {
    const template = ERROR_MESSAGES[ERROR_TYPES.NETWORK_ERROR]
    return {
      title: template.title,
      message: template.message,
      action: template.action,
      details: null
    }
  }

  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    const template = ERROR_MESSAGES[ERROR_TYPES.TIMEOUT_ERROR]
    return {
      title: template.title,
      message: template.message,
      action: template.action,
      details: null
    }
  }

  // Default server error
  const template = ERROR_MESSAGES[ERROR_TYPES.SERVER_ERROR]
  return {
    title: template.title,
    message: error?.message || template.message,
    action: template.action,
    details: null
  }
}

/**
 * Format validation errors for display
 * @param {Array|Object} errors - Validation errors
 * @returns {Array} - Formatted error messages
 */
export function formatValidationErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map(err => err.message || err)
  }

  if (typeof errors === 'object') {
    return Object.entries(errors).map(([field, message]) => ({
      field,
      message: Array.isArray(message) ? message[0] : message
    }))
  }

  return []
}
