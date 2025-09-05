import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Search test API called with:', body)
    
    return NextResponse.json({
      success: true,
      message: 'Test API working',
      received: body
    })
  } catch (error) {
    console.error('Search test API error:', error)
    return NextResponse.json(
      { error: 'Test API error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Search test API is working',
    methods: ['POST']
  })
}