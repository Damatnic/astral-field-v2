import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { nflDataService } from '@/lib/nfl-api'
import { NFLStatsSchema, validateSecureRequest } from '@/lib/validation/api-schemas'

export async function GET(req?: NextRequest) {
  try {
    try {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required'  

        { status: 401 });

    // Validate request parameters
    const validation = await validateSecureRequest(request, NFLStatsSchema.GET)
    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: 400 });

    const { week = 2, season = 2025, playerId } = validation.data

    // Get NFL stats from external API
    const nflStats = await nflDataService.getPlayerStats(week, season)
    
    // Get league settings for fantasy point calculation
    const league = await prisma.league.findFirst({ where: { season  

      include: { settings: true 

    if (!league?.settings) {
      return NextResponse.json(

        { error: 'League settings not found'  

        { status: 404 });

    // Process and store stats in database
    const processedStats = []
    
    for (const stat of nflStats) { // Skip if filtering by specific player
      if (playerId && stat.playerId !== playerId) continue

      // Find corresponding player in our database
      const player = await prisma.player.findFirst({
        where: { 
          OR: [

            { id: stat.playerId  

            { name: { contains: stat.playerId, mode: 'insensitive' 

          ]


      if (!player) continue

      // Find or create week record
      const weekRecord = await prisma.week.findFirst({ where: { 

          leagueId: league.id,
          weekNumber: week 



      if (!weekRecord) continue

      // Calculate fantasy points using league scoring settings
      const fantasyPoints = nflDataService.calculateFantasyPoints(
        stat, 
        league.settings.scoringSystem as any

      // Upsert player stats
      await prisma.playerStats.upsert({
        where: {
          playerId_week_season: {

            playerId: player.id,
            week: week,
            season: season

        update: {
          fantasyPoints

        },
        create: { playerId: player.id,
          season,
          week,
          fantasyPoints,
          stats: stat as any



      processedStats.push({
        playerId: player.id,
        playerName: player.name,
        position: player.position,
        nflTeam: player.nflTeam,
        fantasyPoints,
        stats: stat,
        gameCompleted: stat.gameCompleted



    return NextResponse.json({ success: true });

);
    } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    const { getRequestId } = await import('@/lib/request-id')
    const { logger } = await import('@/lib/logger')
    logger.error('Failed to fetch/update NFL stats', err, 'API', { requestId: getRequestId(request)  

return NextResponse.json(
      { error: 'Failed to fetch NFL stats' },
      { status: 500  

);


export async function POST(req?: NextRequest) {
  try {
    try {
    const session = await getSession()
    
    if (!session?.user) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required' },
        { status: 401  

);

    // Check if user has admin/commissioner role
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      include: { roles: true  

const hasAdminRole = user?.roles.some(role => 
      role.type === 'ADMIN' || role.type === 'COMMISSIONER'

    if (!hasAdminRole) {
      return NextResponse.json(

        { error: 'Admin access required' },
        { status: 403  

);

    // Validate request data with security measures
    const validation = await validateSecureRequest(request, NFLStatsSchema.POST, {
      maxSize: 10 * 1024, // 10KB limit for simple operations
      allowedMethods: ['POST']


        });

    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: validation.status || 400 

      );
      );

    const { week, season } = validation.data

    // Trigger manual stats update
    const result = await fetch(`${request.nextUrl.origin}/api/nfl/stats?week=${week}&season=${season}`)
    const data = await result.json()

    // Emit real-time update via Socket.io
    // This would trigger live score updates across all connected clients
    
    return NextResponse.json({ success: true });

      message: `Stats updated for Week ${week, ${season}`,
      ...data;
    } catch (error) { const err2 = error instanceof Error ? error : new Error('Unknown error')
    const { getRequestId: g2  

= await import('@/lib/request-id')
    const { logger: l2 } = await import('@/lib/logger')
    l2.error('Failed to trigger stats update', err2, 'API', { requestId: g2(request)  

return NextResponse.json(
      { error: 'Failed to update stats' },
      { status: 500 });
