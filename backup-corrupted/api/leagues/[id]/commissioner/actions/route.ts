import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/leagues/[id]/commissioner/actions - Get commissioner action log
export async function GET(req?: NextRequest) {
  try {
    try {
    const session = await getSession();
    if (!session?.user?.sub) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const leagueId = params.id;

    // Verify user is commissioner
    const league = await prisma.league.findUnique({ where: { id: leagueId  

      include: {
        teams: {

          where: { ownerId: session.user.sub });

    if (!league) {

      return NextResponse.json({ error: 'League not found' , { status: 404 });

    const isCommissioner = league.commissionerId === session.user.sub;
    if (!isCommissioner) {

      return NextResponse.json({ error: 'Not authorized as commissioner' , { status: 403 });

    // Get recent commissioner actions (mock data for now)
    const actions = [

        id: '1',
        type: 'SETTINGS_UPDATE',
        description: 'Updated league scoring settings',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        performedBy: session.user.name || 'Commissioner'

        id: '2',
        type: 'WAIVER_RESET',
        description: 'Reset waiver order for Week 8',
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
        performedBy: session.user.name || 'Commissioner'

      },

        id: '3',
        type: 'TRADE_OVERRIDE',
        description: 'Commissioner approved stuck trade between Team A and Team B',
        timestamp: new Date(Date.now() - 259200000), // 3 days ago
        performedBy: session.user.name || 'Commissioner'


    ];

    return NextResponse.json({ actions  }
)); catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    const { logger } = await import('@/lib/logger')
    const { getRequestId } = await import('@/lib/request-id')
    logger.error('Failed to get commissioner actions', err, 'API', { requestId: getRequestId(request)  

return NextResponse.json(
      { error: 'Failed to get commissioner actions' },
      { status: 500 ,
);


// POST /api/leagues/[id]/commissioner/actions - Log commissioner action
export async function POST(req?: NextRequest) {
  try {
    try {
    const session = await getSession();
    if (!session?.user?.sub) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 });

    const leagueId = params.id;
    const { type, description } = await request.json();

    // Verify user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId 
  });

    if (!league) {

      return NextResponse.json({ error: 'League not found' , { status: 404 });

    const isCommissioner = league.commissionerId === session.user.sub;
    if (!isCommissioner) {

      return NextResponse.json({ error: 'Not authorized as commissioner' , { status: 403 });

    // In a real implementation, you would save this to a commissioner_actions table
    // For now, we'll just return success
    const action = { id: Date.now().toString(),
      type,
      description,
      timestamp: new Date(),
      performedBy: session.user.name || 'Commissioner' 

      leagueId
    };

    const { logger: l2  

= await import('@/lib/logger')
    l2.info('Commissioner action logged', 'API', { actionId: action.id 

    return NextResponse.json({ success: true });

      action 
    })); catch (error) { const err2 = error instanceof Error ? error : new Error('Unknown error')
    const { logger: l3  

= await import('@/lib/logger')
    const { getRequestId: g2 } = await import('@/lib/request-id')
    l3.error('Failed to log commissioner action', err2, 'API', { requestId: g2(request)  

return NextResponse.json(
      { error: 'Failed to log commissioner action' },
      { status: 500 });
