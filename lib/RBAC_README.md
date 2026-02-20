# RBAC (Role-Based Access Control) System

This directory contains the RBAC implementation for FleetFlow, providing authentication and authorization middleware for API routes.

## Overview

The RBAC system enforces three user roles with distinct permissions:

- **FLEET_MANAGER**: Full system access including vehicle management, driver management, maintenance oversight, and financial analytics
- **DISPATCHER**: Operations controller with trip creation, vehicle/driver assignment, and expense logging
- **DRIVER**: Execution role with access to assigned trips and issue reporting

## Files

- `rbac.js` - Core RBAC utilities and permission matrix
- `middleware.js` - API route middleware for authentication and authorization
- `middleware-examples.js` - Usage examples for different scenarios
- `rbac.test.js` - Unit tests for RBAC functionality

## Permission Matrix

```javascript
PERMISSIONS = {
  FLEET_MANAGER: {
    vehicles: ['create', 'read', 'update', 'delete', 'retire'],
    drivers: ['create', 'read', 'update', 'suspend'],
    trips: ['read', 'cancel', 'reassign'],
    maintenance: ['create', 'read', 'update'],
    expenses: ['create', 'read'],
    analytics: ['read', 'export'],
    audit: ['read']
  },
  DISPATCHER: {
    vehicles: ['read'],
    drivers: ['read'],
    trips: ['create', 'read', 'update', 'cancel'],
    maintenance: ['read'],
    expenses: ['create', 'read'],
    analytics: [],
    audit: []
  },
  DRIVER: {
    vehicles: [],
    drivers: ['read_self'],
    trips: ['read_assigned', 'update_assigned'],
    maintenance: [],
    expenses: [],
    analytics: [],
    audit: []
  }
}
```

## Usage

### Basic Authentication

Require user to be logged in:

```javascript
import { requireAuth } from '@/lib/middleware'

export const GET = requireAuth(async (req, context) => {
  const { session } = req
  // session.user contains { id, email, role }
  
  return new Response(JSON.stringify({ user: session.user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Permission-Based Authorization

Require specific permission:

```javascript
import { requirePermission } from '@/lib/middleware'

// Only FLEET_MANAGER can create vehicles
export const POST = requirePermission('vehicles', 'create')(async (req, context) => {
  const body = await req.json()
  
  const vehicle = await prisma.vehicle.create({ data: body })
  
  return new Response(JSON.stringify(vehicle), { status: 201 })
})
```

### Combined Auth + Permission

Alternative syntax for auth and permission:

```javascript
import { withAuthAndPermission } from '@/lib/middleware'

export const PUT = withAuthAndPermission({
  resource: 'vehicles',
  operation: 'update'
})(async (req, context) => {
  const { id } = context.params
  const body = await req.json()
  
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: body
  })
  
  return new Response(JSON.stringify(vehicle), { status: 200 })
})
```

### Resource-Specific Access Control

Verify user can access a specific resource instance:

```javascript
import { requireResourceAccess } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// Drivers can only access their own trips
export const GET = requireResourceAccess(
  'trips',
  async (req, context) => {
    const { id } = context.params
    return await prisma.trip.findUnique({
      where: { id },
      include: { driver: true, vehicle: true }
    })
  }
)(async (req, context) => {
  const { resource } = req
  
  return new Response(JSON.stringify(resource), { status: 200 })
})
```

### Error Handling

Wrap handlers with error handling:

```javascript
import { withErrorHandler, requirePermission, compose } from '@/lib/middleware'

export const DELETE = compose(
  withErrorHandler,
  requirePermission('vehicles', 'delete')
)(async (req, context) => {
  const { id } = context.params
  
  // This will automatically handle errors
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { status: 'OUT_OF_SERVICE' }
  })
  
  return new Response(JSON.stringify(vehicle), { status: 200 })
})
```

### Role-Based Data Filtering

Filter data based on user role:

```javascript
import { requireAuth } from '@/lib/middleware'
import { filterByRole } from '@/lib/rbac'

export const GET = requireAuth(async (req, context) => {
  const { session } = req
  
  // Fetch all trips
  const allTrips = await prisma.trip.findMany({
    include: { vehicle: true, driver: true }
  })
  
  // Filter based on role (drivers only see their trips)
  const filteredTrips = filterByRole(
    allTrips,
    session.user.role,
    session.user.id,
    'trips'
  )
  
  return new Response(JSON.stringify(filteredTrips), { status: 200 })
})
```

### Custom Authorization Logic

Implement custom authorization rules:

```javascript
import { requireAuth } from '@/lib/middleware'
import { hasPermission } from '@/lib/rbac'

export const PATCH = requireAuth(async (req, context) => {
  const { session } = req
  const body = await req.json()
  
  // Custom rule: Only fleet managers can suspend drivers
  if (body.status === 'SUSPENDED') {
    if (!hasPermission(session.user.role, 'drivers', 'suspend')) {
      return new Response(
        JSON.stringify({
          status: 403,
          type: 'AUTHORIZATION_ERROR',
          message: 'Only fleet managers can suspend drivers'
        }),
        { status: 403 }
      )
    }
  }
  
  const driver = await prisma.driver.update({
    where: { id: context.params.id },
    data: body
  })
  
  return new Response(JSON.stringify(driver), { status: 200 })
})
```

## API Functions

### `hasPermission(userRole, resource, operation)`

Check if a role has permission for an operation.

**Parameters:**
- `userRole` (string): User's role (FLEET_MANAGER, DISPATCHER, DRIVER)
- `resource` (string): Resource being accessed (vehicles, drivers, trips, etc.)
- `operation` (string): Operation being performed (create, read, update, delete, etc.)

**Returns:** `boolean`

### `filterByRole(data, userRole, userId, resourceType)`

Filter data array based on user role and ownership.

**Parameters:**
- `data` (Array): Data to filter
- `userRole` (string): User's role
- `userId` (string): User's ID
- `resourceType` (string): Type of resource (trips, drivers, etc.)

**Returns:** `Array` - Filtered data

### `canAccessResource(user, resource, resourceType)`

Check if user can access a specific resource instance.

**Parameters:**
- `user` (Object): User object with id and role
- `resource` (Object): Resource being accessed
- `resourceType` (string): Type of resource

**Returns:** `boolean`

## Error Responses

### Authentication Error (401)
```json
{
  "status": 401,
  "type": "AUTHENTICATION_ERROR",
  "message": "You must be logged in to access this resource"
}
```

### Authorization Error (403)
```json
{
  "status": 403,
  "type": "AUTHORIZATION_ERROR",
  "message": "You do not have permission to perform this action"
}
```

### Validation Error (400)
```json
{
  "status": 400,
  "type": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": {
    "field": "error message"
  }
}
```

### Conflict Error (409)
```json
{
  "status": 409,
  "type": "CONFLICT_ERROR",
  "message": "A record with this value already exists"
}
```

## Testing

Run RBAC tests:

```bash
npm test lib/rbac.test.js
```

The test suite covers:
- Permission checks for all roles
- Data filtering by role
- Resource access control
- Permission matrix validation

## Best Practices

1. **Always use middleware**: Don't implement auth checks manually in handlers
2. **Compose middleware**: Use `compose()` to combine multiple middleware functions
3. **Handle errors**: Wrap handlers with `withErrorHandler` for consistent error responses
4. **Filter data by role**: Use `filterByRole()` when different roles see different data
5. **Check resource access**: Use `requireResourceAccess()` for instance-level permissions
6. **Test permissions**: Write tests for new permission rules

## Requirements Validation

This RBAC implementation validates the following requirements:

- **Requirement 1.6**: Role-based access control enforcement
- **Requirement 9.1**: Fleet Manager vehicle operations
- **Requirement 9.2**: Dispatcher vehicle restrictions
- **Requirement 9.3**: Driver financial analytics restrictions
- **Requirement 9.4**: Dispatcher driver suspension restrictions
- **Requirement 9.5**: Driver trip cancellation restrictions
- **Requirement 9.7**: Dispatcher trip creation permissions
- **Requirement 9.8**: Driver trip status update permissions
- **Requirement 9.9**: Driver data isolation

## Next Steps

When implementing API routes:

1. Import appropriate middleware from `@/lib/middleware`
2. Wrap your handler with the middleware
3. Access `req.session` for user information
4. Use `filterByRole()` or `canAccessResource()` for data filtering
5. Return appropriate error responses for authorization failures
