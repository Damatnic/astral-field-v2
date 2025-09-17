import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(req?: NextRequest) {
  try {
    try {
    const session = await getServerSession(request)
    
    if (!session?.user) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Not authenticated' , { status: 401 })

    return NextResponse.json({ success: true });

);
    } catch (error) {
    console.error('Error getting user session:', error)
    return NextResponse.json({ error: 'Failed to get user' , { status: 500 })
