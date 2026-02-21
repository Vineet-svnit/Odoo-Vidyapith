/**
 * Audit Log API Route Tests
 * Tests for GET /api/audit-logs endpoint
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { GET } from './route.js'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

describe('GET /api/audit-logs', () => {
  let testUserId
  let testAuditLogId

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `audit-api-test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        role: 'FLEET_MANAGER'
      }
    })
    testUserId = testUser.id

    // Create a test audit log
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: testUserId,
        action: 'TEST_ACTION',
        resource: 'test',
        resourceId: 'test-123',
        metadata: { test: true }
      }
    })
    testAuditLogId = auditLog.id
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

  it('should return 401 if not authenticated', async () => {
    getServerSession.mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/audit-logs')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('AUTHENTICATION_ERROR')
  })

  it('should return 403 if not FLEET_MANAGER', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'dispatcher@example.com',
        role: 'DISPATCHER'
      }
    })

    const req = new Request('http://localhost:3000/api/audit-logs')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.type).toBe('AUTHORIZATION_ERROR')
  })

  it('should return audit logs for FLEET_MANAGER', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'manager@example.com',
        role: 'FLEET_MANAGER'
      }
    })

    const req = new Request('http://localhost:3000/api/audit-logs')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.total).toBeGreaterThan(0)
  })

  it('should filter audit logs by userId', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'manager@example.com',
        role: 'FLEET_MANAGER'
      }
    })

    const req = new Request(`http://localhost:3000/api/audit-logs?userId=${testUserId}`)
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    data.data.forEach(log => {
      expect(log.userId).toBe(testUserId)
    })
  })

  it('should filter audit logs by action', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'manager@example.com',
        role: 'FLEET_MANAGER'
      }
    })

    const req = new Request('http://localhost:3000/api/audit-logs?action=TEST_ACTION')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    data.data.forEach(log => {
      expect(log.action).toBe('TEST_ACTION')
    })
  })

  it('should support pagination with limit and offset', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'manager@example.com',
        role: 'FLEET_MANAGER'
      }
    })

    const req = new Request('http://localhost:3000/api/audit-logs?limit=5&offset=0')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.pagination.limit).toBe(5)
    expect(data.pagination.offset).toBe(0)
    expect(data.data.length).toBeLessThanOrEqual(5)
  })

  it('should validate limit parameter', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'manager@example.com',
        role: 'FLEET_MANAGER'
      }
    })

    const req = new Request('http://localhost:3000/api/audit-logs?limit=invalid')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate date parameters', async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: testUserId,
        email: 'manager@example.com',
        role: 'FLEET_MANAGER'
      }
    })

    const req = new Request('http://localhost:3000/api/audit-logs?startDate=invalid-date')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })
})
