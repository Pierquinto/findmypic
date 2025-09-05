import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth/server'

export async function GET() {
  try {
    // List all users with their admin status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
        role: true,
        plan: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      users,
      total: users.length,
      admins: users.filter(u => u.isAdmin).length
    })
  } catch (error) {
    console.error('Debug admin error:', error)
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, makeAdmin } = await req.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Get current user to check permissions (basic protection)
    const currentUser = await getUser()
    console.log('Current user making admin request:', currentUser?.email)

    const user = await prisma.user.update({
      where: { email },
      data: {
        isAdmin: makeAdmin === true,
        role: makeAdmin === true ? 'admin' : 'user'
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        role: true
      }
    })

    return NextResponse.json({
      message: `User ${email} ${makeAdmin ? 'granted' : 'removed'} admin privileges`,
      user
    })
  } catch (error) {
    console.error('Debug admin update error:', error)
    return NextResponse.json({ 
      error: 'Error updating user', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}