import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'An error occurred retrieving session' },
      { status: 500 }
    )
  }
}
