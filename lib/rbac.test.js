import { describe, it, expect } from 'vitest'
import { hasPermission, filterByRole, canAccessResource, PERMISSIONS } from './rbac'

describe('RBAC - hasPermission', () => {
  it('should allow fleet manager to create vehicles', () => {
    expect(hasPermission('FLEET_MANAGER', 'vehicles', 'create')).toBe(true)
  })

  it('should deny dispatcher from creating vehicles', () => {
    expect(hasPermission('DISPATCHER', 'vehicles', 'create')).toBe(false)
  })

  it('should allow dispatcher to read vehicles', () => {
    expect(hasPermission('DISPATCHER', 'vehicles', 'read')).toBe(true)
  })

  it('should deny driver from reading vehicles', () => {
    expect(hasPermission('DRIVER', 'vehicles', 'read')).toBe(false)
  })

  it('should allow fleet manager to suspend drivers', () => {
    expect(hasPermission('FLEET_MANAGER', 'drivers', 'suspend')).toBe(true)
  })

  it('should deny dispatcher from suspending drivers', () => {
    expect(hasPermission('DISPATCHER', 'drivers', 'suspend')).toBe(false)
  })

  it('should allow dispatcher to create trips', () => {
    expect(hasPermission('DISPATCHER', 'trips', 'create')).toBe(true)
  })

  it('should deny driver from creating trips', () => {
    expect(hasPermission('DRIVER', 'trips', 'create')).toBe(false)
  })

  it('should allow fleet manager to read analytics', () => {
    expect(hasPermission('FLEET_MANAGER', 'analytics', 'read')).toBe(true)
  })

  it('should deny dispatcher from reading analytics', () => {
    expect(hasPermission('DISPATCHER', 'analytics', 'read')).toBe(false)
  })

  it('should return false for invalid role', () => {
    expect(hasPermission('INVALID_ROLE', 'vehicles', 'read')).toBe(false)
  })

  it('should return false for invalid resource', () => {
    expect(hasPermission('FLEET_MANAGER', 'invalid_resource', 'read')).toBe(false)
  })

  it('should return false for missing parameters', () => {
    expect(hasPermission(null, 'vehicles', 'read')).toBe(false)
    expect(hasPermission('FLEET_MANAGER', null, 'read')).toBe(false)
    expect(hasPermission('FLEET_MANAGER', 'vehicles', null)).toBe(false)
  })
})

describe('RBAC - filterByRole', () => {
  const mockTrips = [
    { id: '1', driverId: 'driver-1', vehicleId: 'vehicle-1' },
    { id: '2', driverId: 'driver-2', vehicleId: 'vehicle-2' },
    { id: '3', driverId: 'driver-1', vehicleId: 'vehicle-3' }
  ]

  it('should return all trips for fleet manager', () => {
    const filtered = filterByRole(mockTrips, 'FLEET_MANAGER', 'user-1', 'trips')
    expect(filtered).toHaveLength(3)
  })

  it('should return all trips for dispatcher', () => {
    const filtered = filterByRole(mockTrips, 'DISPATCHER', 'user-1', 'trips')
    expect(filtered).toHaveLength(3)
  })

  it('should return only assigned trips for driver', () => {
    const filtered = filterByRole(mockTrips, 'DRIVER', 'driver-1', 'trips')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(trip => trip.driverId === 'driver-1')).toBe(true)
  })

  it('should return empty array for driver with no trips', () => {
    const filtered = filterByRole(mockTrips, 'DRIVER', 'driver-3', 'trips')
    expect(filtered).toHaveLength(0)
  })

  it('should handle trips with nested driver object', () => {
    const tripsWithDriver = [
      { id: '1', driver: { userId: 'user-1' } },
      { id: '2', driver: { userId: 'user-2' } }
    ]
    const filtered = filterByRole(tripsWithDriver, 'DRIVER', 'user-1', 'trips')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })

  it('should return empty array for invalid data', () => {
    expect(filterByRole(null, 'FLEET_MANAGER', 'user-1', 'trips')).toEqual([])
    expect(filterByRole(undefined, 'FLEET_MANAGER', 'user-1', 'trips')).toEqual([])
    expect(filterByRole('not-array', 'FLEET_MANAGER', 'user-1', 'trips')).toEqual([])
  })

  it('should return empty array for driver accessing non-trip resources', () => {
    const vehicles = [{ id: '1' }, { id: '2' }]
    const filtered = filterByRole(vehicles, 'DRIVER', 'user-1', 'vehicles')
    expect(filtered).toEqual([])
  })
})

describe('RBAC - canAccessResource', () => {
  it('should allow fleet manager to access any resource', () => {
    const user = { id: 'user-1', role: 'FLEET_MANAGER' }
    const trip = { id: 'trip-1', driverId: 'driver-2' }
    expect(canAccessResource(user, trip, 'trips')).toBe(true)
  })

  it('should allow dispatcher to access most resources', () => {
    const user = { id: 'user-1', role: 'DISPATCHER' }
    const trip = { id: 'trip-1', driverId: 'driver-2' }
    expect(canAccessResource(user, trip, 'trips')).toBe(true)
  })

  it('should deny dispatcher access to audit logs', () => {
    const user = { id: 'user-1', role: 'DISPATCHER' }
    const audit = { id: 'audit-1' }
    expect(canAccessResource(user, audit, 'audit')).toBe(false)
  })

  it('should allow driver to access their own trips', () => {
    const user = { id: 'user-1', role: 'DRIVER' }
    const trip = { id: 'trip-1', driverId: 'user-1' }
    expect(canAccessResource(user, trip, 'trips')).toBe(true)
  })

  it('should deny driver access to other drivers trips', () => {
    const user = { id: 'user-1', role: 'DRIVER' }
    const trip = { id: 'trip-1', driverId: 'user-2' }
    expect(canAccessResource(user, trip, 'trips')).toBe(false)
  })

  it('should allow driver to access their own profile', () => {
    const user = { id: 'user-1', role: 'DRIVER' }
    const driver = { id: 'driver-1', userId: 'user-1' }
    expect(canAccessResource(user, driver, 'drivers')).toBe(true)
  })

  it('should deny driver access to other driver profiles', () => {
    const user = { id: 'user-1', role: 'DRIVER' }
    const driver = { id: 'driver-2', userId: 'user-2' }
    expect(canAccessResource(user, driver, 'drivers')).toBe(false)
  })

  it('should return false for invalid parameters', () => {
    expect(canAccessResource(null, {}, 'trips')).toBe(false)
    expect(canAccessResource({ role: 'DRIVER' }, null, 'trips')).toBe(false)
  })
})

describe('RBAC - PERMISSIONS matrix', () => {
  it('should have all required roles defined', () => {
    expect(PERMISSIONS).toHaveProperty('FLEET_MANAGER')
    expect(PERMISSIONS).toHaveProperty('DISPATCHER')
    expect(PERMISSIONS).toHaveProperty('DRIVER')
  })

  it('should have all required resources for fleet manager', () => {
    const fm = PERMISSIONS.FLEET_MANAGER
    expect(fm).toHaveProperty('vehicles')
    expect(fm).toHaveProperty('drivers')
    expect(fm).toHaveProperty('trips')
    expect(fm).toHaveProperty('maintenance')
    expect(fm).toHaveProperty('expenses')
    expect(fm).toHaveProperty('analytics')
    expect(fm).toHaveProperty('audit')
  })

  it('should grant fleet manager full vehicle permissions', () => {
    const vehiclePerms = PERMISSIONS.FLEET_MANAGER.vehicles
    expect(vehiclePerms).toContain('create')
    expect(vehiclePerms).toContain('read')
    expect(vehiclePerms).toContain('update')
    expect(vehiclePerms).toContain('delete')
    expect(vehiclePerms).toContain('retire')
  })

  it('should grant dispatcher limited vehicle permissions', () => {
    const vehiclePerms = PERMISSIONS.DISPATCHER.vehicles
    expect(vehiclePerms).toContain('read')
    expect(vehiclePerms).not.toContain('create')
    expect(vehiclePerms).not.toContain('update')
    expect(vehiclePerms).not.toContain('delete')
  })

  it('should grant driver no vehicle permissions', () => {
    const vehiclePerms = PERMISSIONS.DRIVER.vehicles
    expect(vehiclePerms).toEqual([])
  })

  it('should grant dispatcher trip management permissions', () => {
    const tripPerms = PERMISSIONS.DISPATCHER.trips
    expect(tripPerms).toContain('create')
    expect(tripPerms).toContain('read')
    expect(tripPerms).toContain('update')
    expect(tripPerms).toContain('cancel')
  })

  it('should grant driver limited trip permissions', () => {
    const tripPerms = PERMISSIONS.DRIVER.trips
    expect(tripPerms).toContain('read_assigned')
    expect(tripPerms).toContain('update_assigned')
    expect(tripPerms).not.toContain('create')
    expect(tripPerms).not.toContain('cancel')
  })

  it('should deny dispatcher access to analytics', () => {
    const analyticsPerms = PERMISSIONS.DISPATCHER.analytics
    expect(analyticsPerms).toEqual([])
  })

  it('should grant fleet manager analytics access', () => {
    const analyticsPerms = PERMISSIONS.FLEET_MANAGER.analytics
    expect(analyticsPerms).toContain('read')
    expect(analyticsPerms).toContain('export')
  })
})
