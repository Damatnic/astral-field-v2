import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get the raw text first
    const text = await request.text();
    console.log('Raw request text:', text);
    
    // Try to parse it
    let body;
    try {
      body = JSON.parse(text);
      console.log('Parsed body:', body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'JSON parse error',
          rawText: text,
          parseError: parseError.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      body,
      rawText: text
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Debug endpoint ready',
    method: 'POST',
    body: '{ email, password }'
  });
}