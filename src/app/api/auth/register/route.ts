import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // Check database connection first
    console.log('Starting registration process...')
    
    const { email, password } = await req.json()
    console.log('Registration attempt for email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Test database connection
    console.log('Testing database connection...')
    await prisma.$connect()
    console.log('Database connected successfully')

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    console.log('Existing user check completed:', !!existingUser)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    console.log('Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)
    
    console.log('Creating user in database...')
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      }
    })
    console.log('User created successfully:', user.id)

    return NextResponse.json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email }
    })
  } catch (error) {
    console.error('Registration error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}