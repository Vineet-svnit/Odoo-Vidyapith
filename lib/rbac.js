/**
 * Role-Based Access Control (RBAC) utilities
 * Defines permissions matrix and authorization functions
 */

// Permission matrix defining what each role can do
export const PERMISSIONS = {
  FLEET_MANAGER: {
    vehicles: ['create', 'read', 'update', 'delete', 'retire'],
    drivers: ['create', 'read', 'update', 'suspend'],
    trips: ['read', 'cancel', 'reassign'],
    maintenance: ['create', 'read', 'update'],
    expenses: ['create', 'read'],
    analytics: ['read', 'export'],
    audit: ['read'],
    notifications: ['create', 'read', 'update']
  },
  DISPATCHER: {
    vehicles: ['read'],
    drivers: ['read'],
    trips: ['create', 'read', 'update', 'cancel'],
    maintenance: ['read'],
    expenses: ['create', 'read'],
    analytics: [],
    audit: [],
    notifications: ['create', 'read', 'update']
  },
  DRIVER: {
    vehicles: [],
    drivers: ['read_self'],
    trips: ['read_assigned', 'update_assigned'],
    maintenance: [],
    expenses: [],
    analytics: [],
    audit: [],
    notifications: ['read', 'update']
  }
}

/**
 * Check if a user role has permission for a specific operation on a resource
 * @param {string} userRole - The user's role (FLEET_MANAGER, DISPATCHER, DRIVER)
 * @param {string} resource - The resource being accessed (vehicles, drivers, trips, etc.)
 * @param {string} operation - The operation being performed (create, read, update, delete, etc.)
 * @returns {boolean} - True if the user has permission, false otherwise
 */
export function hasPermission(userRole, resource, operation) {
  if (!userRole || !resource || !operation) {
    return false
  }

  const rolePermissions = PERMISSIONS[userRole]
  if (!rolePermissions) {
    return false
  }

  const resourcePermissions = rolePermissions[resource]
  if (!resourcePermissions) {
    return false
  }

  return resourcePermissions.includes(operation)
}

/**
 * Filter data based on user role and ownership
 * Drivers can only see their own data, others see all data they have access to
 * @param {Array} data - The data to filter
 * @param {string} userRole - The user's role
 * @param {string} userId - The user's ID
 * @param {string} resourceType - The type of resource being filtered
 * @returns {Array} - Filtered data based on role
 */
export function filterByRole(data, userRole, userId, resourceType) {
  if (!data || !Array.isArray(data)) {
    return []
  }

  // Fleet managers and dispatchers see all data
  if (userRole === 'FLEET_MANAGER' || userRole === 'DISPATCHER') {
    return data
  }

  // Drivers only see their own data
  if (userRole === 'DRIVER') {
    switch (resourceType) {
      case 'trips':
        // Filter trips to only show those assigned to this driver
        return data.filter(item => item.driverId === userId || item.driver?.userId === userId)
      
      case 'drivers':
        // Drivers can only see their own profile
        return data.filter(item => item.userId === userId)
      
      default:
        // By default, drivers see nothing for other resources
        return []
    }
  }

  // Unknown role, return empty array
  return []
}

/**
 * Middleware wrapper for API routes that require authentication and authorization
 * @param {Function} handler - The API route handler function
 * @param {Object} options - Configuration options
 * @param {string} options.resource - The resource being accessed
 * @param {string} options.operation - The operation being performed
 * @returns {Function} - Wrapped handler with auth checks
 */
export function withAuth(handler, options = {}) {
  return async (req, context) => {
    const { resource, operation } = options

    // Get session from request (NextAuth adds this)
    const session = req.session || req.auth

    // Check if user is authenticated
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

    // Check if user has required permissions
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

    // User is authenticated and authorized, proceed with handler
    return handler(req, context)
  }
}

/**
 * Check if a user can access a specific resource instance
 * Used for checking ownership or assignment
 * @param {Object} user - The user object with id and role
 * @param {Object} resource - The resource being accessed
 * @param {string} resourceType - The type of resource
 * @returns {boolean} - True if user can access this specific resource
 */
export function canAccessResource(user, resource, resourceType) {
  if (!user || !resource) {
    return false
  }

  // Fleet managers can access everything
  if (user.role === 'FLEET_MANAGER') {
    return true
  }

  // Dispatchers can access most resources
  if (user.role === 'DISPATCHER') {
    // Dispatchers cannot access audit logs
    if (resourceType === 'audit') {
      return false
    }
    return true
  }

  // Drivers can only access their own resources
  if (user.role === 'DRIVER') {
    switch (resourceType) {
      case 'trips':
        // Can access trips assigned to them
        return resource.driverId === user.id || resource.driver?.userId === user.id
      
      case 'drivers':
        // Can access their own driver profile
        return resource.userId === user.id
      
      default:
        return false
    }
  }

  return false
}
