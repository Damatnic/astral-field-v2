import { NextRequest, NextResponse } from 'next/server'
import { getAvailableProfiles } from '@/lib/auth'

export async function GET(req?: NextRequest) {
  try {
    try {
    const profiles = getAvailableProfiles()
    return NextResponse.json({ profiles });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json({ error: 'Failed to fetch profiles' , { status: 500 })


export async function POST(req?: NextRequest) {
  try {
    try {

    const { profileId  }
= await request.json()
    
    if (!profileId) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Profile ID required' }, { status: 400  

    const profiles = getAvailableProfiles()
    const profile = profiles.find(p => p.id === profileId)
    
    if (!profile) {

      return NextResponse.json({ error: 'Invalid profile' }, { status: 400 ,

    const response = NextResponse.json({ 
      success: true 

      user: profile 

    })
    // Set session cookie
    response.cookies.set('astral-session', profileId, { httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'


    return response)
     } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
