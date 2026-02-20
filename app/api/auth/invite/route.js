import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'FLEET_MANAGER') {
      return NextResponse.json(
        { error: 'Only Fleet Managers can send invitations' },
        { status: 403 }
      )
    }

    const { email, role } = await request.json()

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['FLEET_MANAGER', 'DISPATCHER', 'DRIVER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Check if there's an unused invitation for this email
    const existingInvitation = await prisma.invitationToken.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600000) // 7 days

    // Store invitation token
    await prisma.invitationToken.create({
      data: {
        token,
        email,
        role,
        invitedBy: session.user.id,
        expiresAt
      }
    })

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/auth/invitation/${token}`
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD
      }
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'FleetFlow - You\'ve been invited!',
      html: `
        <h2>Welcome to FleetFlow</h2>
        <p>You've been invited to join FleetFlow as a ${role.replace('_', ' ')}.</p>
        <p>Click the link below to accept your invitation and set up your account:</p>
        <a href="${inviteUrl}">${inviteUrl}</a>
        <p>This invitation will expire in 7 days.</p>
      `
    })

    return NextResponse.json({
      message: 'Invitation sent successfully',
      inviteUrl
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: 'An error occurred sending the invitation' },
      { status: 500 }
    )
  }
}
