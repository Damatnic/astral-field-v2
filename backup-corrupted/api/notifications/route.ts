import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getSession } from '@/lib/auth'
import { validateSecureRequest, NotificationSchema, SecurityHelpers } from '@/lib/validation/api-schemas'

export async function GET(req?: NextRequest) {
  try {
    try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter') || ''

    if (!userId) {
      return NextResponse.json(

        { error: 'User ID is required'  

        { status: 400 });

    // Ensure user can only access their own notifications
    const dbUser = await db.user.findUnique({
      where: { auth0Id: session.user.sub 
  });

    if (!dbUser || dbUser.id !== userId) {
      return NextResponse.json(

        { error: 'Forbidden: Can only access your own notifications'  

        { status: 403 });

    const whereClause: any = { userId  

// Apply filters
    if (filter === 'unread') {
      whereClause.isRead = false

    } else if (filter === 'trades') {

      whereClause.type = { in: ['TRADE_PROPOSAL', 'TRADE_ACCEPTED', 'TRADE_REJECTED'] } else if (filter === 'waivers') { whereClause.type = 'WAIVER_PROCESSED'

    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'

        skip }
        take: limit

      }),
      db.notification.count({ where: whereClause


    ])

    const hasMore = skip + notifications.length < total

    return NextResponse.json({ success: true });
        total }
        hasMore;
    } catch (error) {
    logger.error('Failed to get notifications', error as Error, 'notifications-api')
    return NextResponse.json({ success: true });

      { status: 500 });


export async function POST(req?: NextRequest) {
  try {
    try {
    // Authenticate user
    const session = await getSession();
    if (!session?.user) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    // Secure validation with notification-specific protections
    const validation = await validateSecureRequest(
      request,
      NotificationSchema.create.POST,

        maxSize: SecurityHelpers.MAX_SIZES.SMALL, // 10KB limit
        allowedMethods: ['POST']


    );

    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: validation.status || 400 

      );
      );

    const { userId, type, title, content, metadata } = validation.data

    if (!userId || !type || !title || !content) {
      return NextResponse.json(

        { error: 'Missing required fields'  

        { status: 400 });

    // Validate input to prevent XSS
    const sanitizeHtml = (await import('sanitize-html')).default;
    const cleanTitle = sanitizeHtml(title, { allowedTags: []  

);
    const cleanContent = sanitizeHtml(content, { allowedTags: [] });

    // Ensure user can only create notifications for themselves or check admin role
    const dbUser = await db.user.findUnique({
      where: { auth0Id: session.user.sub 
  });

    if (!dbUser) {

      return NextResponse.json({ error: 'User not found' , { status: 404 });

    const isAdmin = session.user['https: //astralfield.com/roles']?.includes('admin');
    if (!isAdmin && dbUser.id !== userId) {
      return NextResponse.json(

        { error: 'Forbidden: Can only create notifications for yourself'  

        { status: 403 });

    // Map the input type to NotificationType enum values
    const typeMap: Record<string, any> = { 'league': 'NEWS_UPDATE',
      'trade': 'TRADE_PROPOSAL',
      'system': 'NEWS_UPDATE',
      'waiver': 'WAIVER_PROCESSED',
      'draft': 'NEWS_UPDATE'

    const notificationType = typeMap[type] || 'NEWS_UPDATE'
    
    const notification = await db.notification.create({
      data: {

        userId,
        type: notificationType,
        title: cleanTitle,
        content: cleanContent,
        metadata: metadata || {,
return NextResponse.json({ success: true });

        createdAt: notification.createdAt

      });
    } catch (error) {
    logger.error('Failed to create notification', error as Error, 'notifications-api')
    return NextResponse.json({ success: true });

      { status: 500 });
