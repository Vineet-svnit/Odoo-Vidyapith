import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from './prisma'
import bcrypt from 'bcryptjs'

describe('Authentication System', () => {
  let testUser

  beforeAll(async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash('testpassword123', 10)
    testUser = await prisma.user.create({
      data: {
        email: 'test@fleetflow.com',
        passwordHash,
        role: 'FLEET_MANAGER'
      }
    })
  }, 10000) // Increase timeout to 10 seconds

  afterAll(async () => {
    // Clean up test data only if testUser was created
    if (testUser?.id) {
      await prisma.passwordResetToken.deleteMany({
        where: { userId: testUser.id }
      })
      await prisma.user.delete({
        where: { id: testUser.id }
      })
    }
    await prisma.$disconnect()
  })

  it('should create a user with hashed password', async () => {
    expect(testUser.id).toBeDefined()
    expect(testUser.email).toBe('test@fleetflow.com')
    expect(testUser.passwordHash).toBeDefined()
    expect(testUser.passwordHash).not.toBe('testpassword123')
  })

  it('should verify password correctly', async () => {
    const isValid = await bcrypt.compare('testpassword123', testUser.passwordHash)
    expect(isValid).toBe(true)

    const isInvalid = await bcrypt.compare('wrongpassword', testUser.passwordHash)
    expect(isInvalid).toBe(false)
  })

  it('should create password reset token', async () => {
    const token = 'test-reset-token-' + Date.now()
    const expiresAt = new Date(Date.now() + 3600000)

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        token,
        userId: testUser.id,
        expiresAt
      }
    })

    expect(resetToken.id).toBeDefined()
    expect(resetToken.token).toBe(token)
    expect(resetToken.userId).toBe(testUser.id)
    expect(resetToken.used).toBe(false)
  })

  it('should create invitation token', async () => {
    const token = 'test-invite-token-' + Date.now()
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600000)

    const inviteToken = await prisma.invitationToken.create({
      data: {
        token,
        email: 'newuser@fleetflow.com',
        role: 'DISPATCHER',
        invitedBy: testUser.id,
        expiresAt
      }
    })

    expect(inviteToken.id).toBeDefined()
    expect(inviteToken.token).toBe(token)
    expect(inviteToken.email).toBe('newuser@fleetflow.com')
    expect(inviteToken.role).toBe('DISPATCHER')
    expect(inviteToken.used).toBe(false)

    // Clean up
    await prisma.invitationToken.delete({
      where: { id: inviteToken.id }
    })
  })
})
