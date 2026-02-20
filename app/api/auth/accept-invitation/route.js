import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { token, password, firstName, lastName, licenseNumber, licenseCategory, licenseExpiry } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Find valid invitation token
    const invitation = await prisma.invitationToken.findUnique({
      where: { token }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if token has been used
    if (invitation.used) {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    // If role is DRIVER, validate driver-specific fields
    if (invitation.role === 'DRIVER') {
      if (!firstName || !lastName || !licenseNumber || !licenseCategory || !licenseExpiry) {
        return NextResponse.json(
          { error: 'Driver profile information is required (firstName, lastName, licenseNumber, licenseCategory, licenseExpiry)' },
          { status: 400 }
        )
      }

      // Validate license expiry is in the future
      const expiryDate = new Date(licenseExpiry)
      if (expiryDate <= new Date()) {
        return NextResponse.json(
          { error: 'License expiry date must be in the future' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user and mark invitation as used
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          invitedBy: invitation.invitedBy
        }
      })

      // If driver, create driver profile
      if (invitation.role === 'DRIVER') {
        await tx.driver.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            licenseNumber,
            licenseCategory,
            licenseExpiry: new Date(licenseExpiry)
          }
        })
      }

      // Mark invitation as used
      await tx.invitationToken.update({
        where: { id: invitation.id },
        data: { used: true }
      })

      return newUser
    })

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'email') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      if (field === 'licenseNumber') {
        return NextResponse.json(
          { error: 'This license number is already registered' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'An error occurred creating your account' },
      { status: 500 }
    )
  }
}
