import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  if (!req.body) {
    return NextResponse.json({ success: false, error: 'No body' }, { status: 400 });
  }

  const reader = req.body.getReader();
  let receivedBytes = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
      }
    }
  } catch (err) {
    console.error('Error reading upload stream:', err);
    return NextResponse.json({ success: false, error: 'Stream error' }, { status: 500 });
  }

  return NextResponse.json({ success: true, receivedBytes });
}

// Needed to sometimes clear CORS preflight if called from elsewhere although not typical here
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
