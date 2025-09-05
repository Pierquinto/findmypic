import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint just confirms it's working
  // The real debugging will happen on the client side
  return NextResponse.json({
    message: 'Check browser console for client-side auth debugging',
    timestamp: new Date().toISOString(),
    instructions: [
      'Open browser console',
      'Check for [CLIENT-DEBUG] messages',
      'Look for localStorage keys and values',
      'Verify Supabase session status'
    ]
  })
}

export async function POST(req: Request) {
  // Accept debug data from client
  const debugData = await req.json()
  
  console.log('[CLIENT-DEBUG] Received from browser:', JSON.stringify(debugData, null, 2))
  
  return NextResponse.json({
    message: 'Debug data received and logged',
    timestamp: new Date().toISOString()
  })
}