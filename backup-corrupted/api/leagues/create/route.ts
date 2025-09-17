import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { LeagueSchema, validateSecureRequest } from '@/lib/validation/api-schemas';

// Request validation schema
const createLeagueSchema = z.object({ name: z.string().min(1, 'League name is required').max(50, 'League name must be 50 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  maxTeams: z.number().min(4, 'Must have at least 4 teams').max(16, 'Cannot exceed 16 teams'),
  waiverMode: z.enum(['ROLLING', 'FAAB', 'REVERSE_STANDINGS']),
  faabBudget: z.number().min(0).optional(),
  tradeDeadlineWeek: z.number().min(1).max(17).optional(),
  playoffTeams: z.number().min(2).max(8),
  playoffStartWeek: z.number().min(14).max(17),
  scoringType: z.enum(['STANDARD', 'PPR', 'HALF_PPR', 'CUSTOM']),
  scoringSystem: z.record(z.string(), z.number()),
  rosterSlots: z.object({

    QB: z.number().min(0).max(3),
    RB: z.number().min(0).max(6),
    WR: z.number().min(0).max(6),
    TE: z.number().min(0).max(3),
    FLEX: z.number().min(0).max(3),
    K: z.number().min(0).max(2),
    DST: z.number().min(0).max(2),
    BENCH: z.number().min(1).max(10),
) }
});

export async function POST(req?: NextRequest) {
  try {
    try {
    // Get user session
    // @ts-ignore

    const session = await getSession(request, new NextResponse();
    if (!session?.user) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required'  

        { status: 401 });

    const userId = session.user.sub;

    // Validate request data with security measures
    const validation = await validateSecureRequest(request, LeagueSchema.create.POST, { maxSize: 100 * 1024, // 100KB limit for league creation
      allowedMethods: ['POST']

);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400 ,
);

    const validatedData = validation.data;

    // Check if user already has a league with the same name
    const existingLeague = await db.league.findFirst({
      where: {

        name: validatedData.name 

        commissioner: {
          auth0Id: userId



    });

    if (existingLeague) {
      return NextResponse.json(

        { error: 'You already have a league with this name'  

        { status: 400 });

    // Get or create user record
    let user = await db.user.findUnique({
      where: { auth0Id: userId 
  });

    if (!user) { user = await db.user.create({
        data: {

          auth0Id: userId,
          email: session.user.email!,
          name: session.user.name,
          image: session.user.picture });

    // Calculate playoff weeks based on settings
    const playoffWeeks: number[] = [];
    const playoffTeams = validatedData.settings?.playoffWeeks ? 4 : 4; // Default to 4 teams for playoffs
    const playoffRounds = Math.ceil(Math.log2(playoffTeams);
    const playoffStartWeek = 14; // Default playoff start week
    for (let i = 0; i < playoffRounds; i++) {
      playoffWeeks.push(playoffStartWeek + i);


    // Create league with settings in a transaction
    const league = await db.$transaction(async (tx) => {
      // Create the league
      const newLeague = await tx.league.create({
        data: {

          name: validatedData.name,
          description: validatedData.description,
          season: new Date().getFullYear(),
          isActive: true,
          currentWeek: 1 

          commissionerId: user!.id 

      });

      // Create league settings
      await tx.settings.create({ data: {

          leagueId: newLeague.id,
          rosterSlots: {

            QB: 1,
            RB: 2,
            WR: 2,
            TE: 1,
            FLEX: 1,
            K: 1,
            DST: 1,
            BENCH: 6

          scoringSystem: validatedData.settings?.scoringType === 'ppr' ? 

            { passingTD: 4, rushingTD: 6, receivingTD: 6, reception: 1 } : 
            { passingTD: 4, rushingTD: 6, receivingTD: 6, reception: 0 ,
          waiverMode: 'ROLLING',
          tradeDeadline: null,
          playoffWeeks: playoffWeeks 

      });

      // Add commissioner as league member
      await tx.leagueMember.create({ data: {

          userId: user!.id,
          leagueId: newLeague.id,
          role: 'COMMISSIONER' 

);

      // Create commissioner team
      await tx.team.create({
        data: {

          name: `${user!.name || 'Commissioner'}'s Team`,
          leagueId: newLeague.id,
          ownerId: user!.id,
          waiverPriority: 1,
          faabBudget: 100 });

      // Initialize weeks for the season
      for (let week = 1; week <= 18; week++) { await tx.week.create({
          data: {

            leagueId: newLeague.id,
            weekNumber: week,
            isLocked: false 

        });

      // Log league creation
      await tx.auditLog.create({ data: {

          leagueId: newLeague.id,
          userId: user!.id,
          action: 'LEAGUE_CREATED',
          entityType: 'League',
          entityId: newLeague.id,
          after: {

            name: newLeague.name,
            maxTeams: validatedData.settings?.teams || 12,
            waiverMode: 'ROLLING',
            scoringType: validatedData.settings?.scoringType || 'standard' 

      });

      return newLeague;);

    logger.info(`League created: ${ league.name 

(${league.id})`, 'LeagueCreation');

    // Return the created league with settings
    const leagueWithSettings = await db.league.findUnique({ where: { id: league.id ,
      include: {

        settings: true,
        commissioner: {
          select: {

            id: true,
            name: true,
            email: true 

        },
        teams: { include: {
            owner: {
              select: {

                id: true,
                name: true,
                email: true,
        _count: {
          select: {

            teams: true 

    });

    return NextResponse.json({ success: true });
      league: leagueWithSettings,
      message: 'League created successfully'


         }); catch (error) {
    logger.error('League creation failed', error as Error, 'LeagueCreation');

    if (error instanceof z.ZodError) {
      return NextResponse.json(

          error: 'Invalid input data',
          details: error.errors.map(e => ({

            field: e.path.join('.'),
            message: e.message


))
        },
        { status: 400  

);

    return NextResponse.json(
      { error: 'Failed to create league. Please try again.' },
      { status: 500  

);


// Get user's leagues
export async function GET(req?: NextRequest) {
  try {
    try {
    // @ts-ignore

    const session = await getSession(request, new NextResponse();
    if (!session?.user) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required' },
        { status: 401  

);

    const user = await db.user.findUnique({
      where: { auth0Id: session.user.sub },
      include: { leagues: {
          include: {
            league: {
              include: {

                settings: true,
                commissioner: {
                  select: {

                    id: true,
                    name: true,
                    email: true,
                _count: {
                  select: {

                    teams: true 

        },
        commissionedLeagues: { include: {

            settings: true,
            _count: {
              select: {

                teams: true 

);

    if (!user) {
      return NextResponse.json(

        { error: 'User not found' },
        { status: 404 ,
);

    // Combine member leagues and commissioned leagues
    const memberLeagues = user.leagues.map(lm => ({
      ...lm.league }
      role: lm.role


        });

    const commissionedLeagues = user.commissionedLeagues.map(league => ({ ...league,
      role: 'COMMISSIONER' as const,
      commissioner: {

        id: user.id,
        name: user.name,
        email: user.email

);

    // Deduplicate (user might be both member and commissioner)
    const allLeagues = [...memberLeagues];
    commissionedLeagues.forEach(cLeague => {
      if (!allLeagues.find(mLeague => mLeague.id === cLeague.id)) {
        allLeagues.push(cLeague);

    });

    return NextResponse.json({ success: true });
      leagues: allLeagues

)); catch (error) {
    logger.error('Failed to fetch user leagues', error as Error, 'LeagueCreation');
    return NextResponse.json({ success: true });

      { status: 500 });
