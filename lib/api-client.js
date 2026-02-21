/**
 * API Client Utility
 * Centralized API request handling with error management
 * Requirements: 15.4
 */

import { handleAPIResponse } from './api-error'

/**
 * Make an API request with standardized error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Response data
 */
export async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  const config = { ...defaultOptions, ...options }

  try {
    const response = await fetch(url, config)
    return await handleAPIResponse(response)
  } catch (error) {
    // Re-throw API errors
    if (error.name?.includes('Error')) {
      throw error
    }

    // Handle network errors
    if (error.message === 'Failed to fetch') {
      const networkError = new Error('Unable to connect to the server')
      networkError.type = 'NETWORK_ERROR'
      throw networkError
    }

    // Handle other errors
    throw error
  }
}

/**
 * GET request
 */
export async function get(url, options = {}) {
  return apiRequest(url, { ...options, method: 'GET' })
}

/**
 * POST request
 */
export async function post(url, data, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  })
}

/**
 * PUT request
 */
export async function put(url, data, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

/**
 * PATCH request
 */
export async function patch(url, data, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

/**
 * DELETE request
 */
export async function del(url, options = {}) {
  return apiRequest(url, { ...options, method: 'DELETE' })
}

/**
 * Upload file with multipart/form-data
 */
export async function upload(url, formData, options = {}) {
  const uploadOptions = {
    ...options,
    method: 'POST',
    body: formData
  }

  // Remove Content-Type header to let browser set it with boundary
  if (uploadOptions.headers) {
    delete uploadOptions.headers['Content-Type']
  }

  return apiRequest(url, uploadOptions)
}
