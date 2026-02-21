/**
 * Audit Service Tests
 * Tests for audit logging functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { logAction, getAuditLogs, getAuditLogsCount } from './audit-service.js'
import prisma from './prisma.js'

describe('Audit Service', () => {
  let testUserId
  let testAuditLogId

  beforeAll(async () => {
    // Create a test user for audit logging
    const testUser = await prisma.user.create({
      data: {
        email: `audit-test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        role: 'FLEET_MANAGER'
      }
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    // Clean up test data
    if (testAuditLogId) {
      await prisma.auditLog.deleteMany({
        where: { id: testAuditLogId }
      })
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      })
    }
  })

  it('should create an audit log entry', async () => {
    const auditData = {
      userId: testUserId,
      action: 'CREATE_VEHICLE',
      resource: 'vehicle',
      resourceId: 'test-vehicle-id',
      metadata: {
        licensePlate: 'TEST-123',
        type: 'VAN'
      }
    }

    const auditLog = await logAction(auditData)
    testAuditLogId = auditLog.id

    expect(auditLog).toBeDefined()
    expect(auditLog.id).toBeDefined()
    expect(auditLog.userId).toBe(testUserId)
    expect(auditLog.action).toBe('CREATE_VEHICLE')
    expect(auditLog.resource).toBe('vehicle')
    expect(auditLog.resourceId).toBe('test-vehicle-id')
    expect(auditLog.metadata).toEqual(auditData.metadata)
    expect(auditLog.createdAt).toBeInstanceOf(Date)
  })

  it('should retrieve audit logs with filters', async () => {
    const filters = {
      userId: testUserId,
      action: 'CREATE_VEHICLE'
    }

    const auditLogs = await getAuditLogs(filters)

    expect(Array.isArray(auditLogs)).toBe(true)
    expect(auditLogs.length).toBeGreaterThan(0)
    expect(auditLogs[0].userId).toBe(testUserId)
    expect(auditLogs[0].action).toBe('CREATE_VEHICLE')
    expect(auditLogs[0].user).toBeDefined()
    expect(auditLogs[0].user.email).toContain('audit-test')
  })

  it('should count audit logs with filters', async () => {
    const filters = {
      userId: testUserId
    }

    const count = await getAuditLogsCount(filters)

    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThan(0)
  })

  it('should reject invalid audit log data', async () => {
    const invalidData = {
      userId: 'invalid-id',
      action: '',
      resource: 'vehicle'
    }

    await expect(logAction(invalidData)).rejects.toThrow()
  })

  it('should filter audit logs by resource', async () => {
    const filters = {
      resource: 'vehicle'
    }

    const auditLogs = await getAuditLogs(filters)

    expect(Array.isArray(auditLogs)).toBe(true)
    auditLogs.forEach(log => {
      expect(log.resource).toBe('vehicle')
    })
  })

  it('should support pagination', async () => {
    const filters = {
      limit: 5,
      offset: 0
    }

    const auditLogs = await getAuditLogs(filters)

    expect(Array.isArray(auditLogs)).toBe(true)
    expect(auditLogs.length).toBeLessThanOrEqual(5)
  })
})
