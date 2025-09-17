import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-system'
import { logger } from '@/lib/logger'
import { NotificationSchema, validateSecureRequest } from '@/lib/validation/api-schemas'

export async function POST(req?: NextRequest) {
  try {
    try {
    // Validate request data with security measures

    const validation = await validateSecureRequest(request, NotificationSchema.markAllRead.POST, {
      maxSize: 10 * 1024, // 10KB limit for simple operations
      allowedMethods: ['POST']


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);

    const { userId } = validation.data;

    await NotificationService.markAllAsRead(userId)

    return NextResponse.json({ success: true });

);
    } catch (error) {
    logger.error('Failed to mark all notifications as read', error as Error, 'notifications-api')
    return NextResponse.json({ success: true });

      { status: 500 
