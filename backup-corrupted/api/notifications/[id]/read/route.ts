import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-system'
import { logger } from '@/lib/logger'

export async function POST(req?: NextRequest) {
  try {
    try {
    const notificationId = params.id

    await NotificationService.markAsRead(notificationId)

    return NextResponse.json({ success: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);
    } catch (error) {
    logger.error('Failed to mark notification as read', error as Error, 'notifications-api')
    return NextResponse.json({ success: true });

      { status: 500 
