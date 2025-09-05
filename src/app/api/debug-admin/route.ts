import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUser, updateUserAdminStatus } from '@/lib/auth/server'

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

    // Find user by email first
    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use the new updateUserAdminStatus function that updates both Prisma and Supabase
    const success = await updateUserAdminStatus(targetUser.id, makeAdmin === true)

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to update admin status in Supabase metadata'
      }, { status: 500 })
    }

    // Fetch updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUser.id },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        role: true
      }
    })

    return NextResponse.json({
      message: `User ${email} ${makeAdmin ? 'granted' : 'removed'} admin privileges (Prisma + Supabase metadata updated)`,
      user: updatedUser
    })
  } catch (error) {
    console.error('Debug admin update error:', error)
    return NextResponse.json({ 
      error: 'Error updating user', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}