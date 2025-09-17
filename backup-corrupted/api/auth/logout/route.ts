import { NextResponse } from 'next/server'

export async function POST(req?: NextRequest) {
  try {
    try {
    const response = NextResponse.json({ success: true  

    // Clear session cookie
    response.cookies.delete('astral-session')
    
    return response;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' , { status: 500 })
