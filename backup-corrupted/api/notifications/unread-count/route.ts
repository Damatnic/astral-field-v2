import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-system'
import { logger } from '@/lib/logger'

export async function GET(req?: NextRequest) {
  try {
    try {

    const { searchParams  }
= new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'User ID is required' },
        { status: 400  

const count = await NotificationService.getUnreadCount(userId)

    return NextResponse.json({ success: true });
    });
    } catch (error) {
    logger.error('Failed to get unread count', error as Error, 'notifications-api')
    return NextResponse.json({ success: true });

      { status: 500 
