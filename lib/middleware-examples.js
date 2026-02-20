/**
 * Examples of how to use RBAC middleware in API routes
 * This file demonstrates various patterns for protecting API endpoints
 */

import {
  requireAuth,
  requirePermission,
  withAuthAndPermission,
  requireResourceAccess,
  withErrorHandler,
  compose
} from './middleware'
import prisma from './prisma'

// Example 1: Simple authentication check
// Use when you just need to verify user is logged in
export const GET = requireAuth(async (req, context) => {
  const { session } = req
  
  return new Response(
    JSON.stringify({ user: session.user }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 2: Authentication + Permission check
// Use when you need to verify user has specific permission
export const POST = requirePermission('vehicles', 'create')(async (req, context) => {
  const { session } = req
  const body = await req.json()
  
  // Create vehicle logic here
  const vehicle = await prisma.vehicle.create({
    data: {
      ...body,
      createdBy: session.user.id
    }
  })
  
  return new Response(
    JSON.stringify(vehicle),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 3: Combined auth and permission (alternative syntax)
export const PUT = withAuthAndPermission({
  resource: 'vehicles',
  operation: 'update'
})(async (req, context) => {
  const { session } = req
  const body = await req.json()
  const { id } = context.params
  
  // Update vehicle logic here
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: body
  })
  
  return new Response(
    JSON.stringify(vehicle),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 4: Resource-specific access control
// Use when you need to verify user can access a specific resource instance
export const GET_TRIP = requireResourceAccess(
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
  
  return new Response(
    JSON.stringify(resource),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 5: Composing multiple middleware
// Use when you need multiple layers of protection and error handling
export const DELETE = compose(
  withErrorHandler,
  requirePermission('vehicles', 'delete')
)(async (req, context) => {
  const { id } = context.params
  
  // Soft delete vehicle
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { status: 'OUT_OF_SERVICE' }
  })
  
  return new Response(
    JSON.stringify(vehicle),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 6: Role-based data filtering
// Use when different roles should see different data
export const GET_LIST = requireAuth(async (req, context) => {
  const { session } = req
  const { role, id: userId } = session.user
  
  let trips
  
  if (role === 'DRIVER') {
    // Drivers only see their own trips
    const driver = await prisma.driver.findUnique({
      where: { userId }
    })
    
    trips = await prisma.trip.findMany({
      where: { driverId: driver?.id },
      include: { vehicle: true, driver: true }
    })
  } else {
    // Fleet managers and dispatchers see all trips
    trips = await prisma.trip.findMany({
      include: { vehicle: true, driver: true }
    })
  }
  
  return new Response(
    JSON.stringify(trips),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 7: Multiple operations in one endpoint (different methods)
// GET - requires 'read' permission
export const GET_VEHICLES = requirePermission('vehicles', 'read')(async (req, context) => {
  const vehicles = await prisma.vehicle.findMany()
  
  return new Response(
    JSON.stringify(vehicles),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// POST - requires 'create' permission
export const POST_VEHICLES = compose(
  withErrorHandler,
  requirePermission('vehicles', 'create')
)(async (req, context) => {
  const body = await req.json()
  
  const vehicle = await prisma.vehicle.create({
    data: body
  })
  
  return new Response(
    JSON.stringify(vehicle),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})

// Example 8: Custom authorization logic
// Use when you need more complex authorization rules
export const PATCH = requireAuth(async (req, context) => {
  const { session } = req
  const { id } = context.params
  const body = await req.json()
  
  // Custom logic: Only fleet managers can suspend drivers
  if (body.status === 'SUSPENDED' && session.user.role !== 'FLEET_MANAGER') {
    return new Response(
      JSON.stringify({
        status: 403,
        type: 'AUTHORIZATION_ERROR',
        message: 'Only fleet managers can suspend drivers'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  const driver = await prisma.driver.update({
    where: { id },
    data: body
  })
  
  return new Response(
    JSON.stringify(driver),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
