import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// League settings validation schema
const leagueSettingsSchema = z.object({ rosterSlots: z.object({

    QB: z.number().min(1).max(5).optional(),
    RB: z.number().min(1).max(10).optional(),
    WR: z.number().min(1).max(10).optional(),
    TE: z.number().min(0).max(5).optional(),
    FLEX: z.number().min(0).max(5).optional(),
    K: z.number().min(0).max(2).optional(),
    DEF: z.number().min(0).max(2).optional(),
    BENCH: z.number().min(1).max(15).optional()

).optional(),
  scoringSystem: z.object({

    passingYards: z.number().optional(),
    passingTDs: z.number().optional(),
    rushingYards: z.number().optional(),
    rushingTDs: z.number().optional(),
    receivingYards: z.number().optional(),
    receivingTDs: z.number().optional(),
    interceptions: z.number().optional() 

    fumbles: z.number().optional()

  }).optional(),
  waiverMode: z.enum(['ROLLING', 'FAAB', 'REVERSE_STANDINGS']).optional(),
  tradeDeadline: z.string().datetime().optional(),
  playoffWeeks: z.array(z.number().min(1).max(18)).optional(),
  faabBudget: z.number().min(0).max(1000).optional(),
  maxKeepers: z.number().min(0).max(10).optional(),
  draftType: z.enum(['SNAKE', 'AUCTION', 'LINEAR']).optional()
});

// PUT /api/leagues/[id]/settings - Update league settings
export async function PUT(req?: NextRequest) {
  try {
    const security = await APISecurityMiddleware.secure(request, {
    requireAuth: true,
    validateSchema: leagueSettingsSchema,
    allowedMethods: ['PUT'],
    requireContentType: ['application/json']


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);

  if (!security.success) return security.response!;

  const { data: settings, user } = security;
  const leagueId = params.id;

  try { // Check if user is a league member with commissioner role
    const leagueMember = await prisma.leagueMember.findFirst({
      where: {

        leagueId,
        user: {
          auth0Id: user.sub

      include: {
        league: {
          include: {
            settings: true




    });

    if (!leagueMember) {

      return NextResponse.json({ error: 'League not found or access denied' , { status: 404 });

    // Check if user has commissioner role (OWNER or COMMISSIONER)
    const isCommissioner = leagueMember.role === 'OWNER' || leagueMember.role === 'COMMISSIONER';

    if (!isCommissioner) {

      return NextResponse.json({ error: 'Not authorized as commissioner' , { status: 403 });

    // Validate settings structure
    const validatedSettings = { rosterSlots: settings.rosterSlots || { 

      scoringSystem: settings.scoringSystem || {},
      waiverMode: settings.waiverMode || 'ROLLING',
      tradeDeadline: settings.tradeDeadline ? new Date(settings.tradeDeadline) : null,
      playoffWeeks: settings.playoffWeeks || [],
      faabBudget: settings.faabBudget || 100,
      maxKeepers: settings.maxKeepers || 0,
      draftType: settings.draftType || 'SNAKE'

    // Update league settings in database
    const updatedSettings = await prisma.settings.upsert({
      where: { leagueId },
      create: { leagueId,
        rosterSlots: validatedSettings.rosterSlots,
        scoringSystem: validatedSettings.scoringSystem,
        waiverMode: validatedSettings.waiverMode,
        tradeDeadline: validatedSettings.tradeDeadline,
        playoffWeeks: validatedSettings.playoffWeeks

      update: {

        rosterSlots: validatedSettings.rosterSlots,
        scoringSystem: validatedSettings.scoringSystem,
        waiverMode: validatedSettings.waiverMode,
        tradeDeadline: validatedSettings.tradeDeadline 

        playoffWeeks: validatedSettings.playoffWeeks


    });

    logger.info('League settings updated successfully', 'API', { leagueId,
      updatedBy: user.sub,
      settings: validatedSettings

);

    return NextResponse.json({ success: true });

      settings: updatedSettings 


        })); catch (error) { const errorInstance = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to update league settings', errorInstance, 'API', {
      leagueId,
      userId: user.sub

);
    return NextResponse.json(
      { error: 'Failed to update league settings' },
      { status: 500 ,
);


// GET /api/leagues/[id]/settings - Get league settings
export async function GET(req?: NextRequest) {
  try {
    const security = await APISecurityMiddleware.secure(request, {
    requireAuth: true,
    allowedMethods: ['GET']


    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



);

  if (!security.success) return security.response!;

  const { user } = security;
  const leagueId = params.id;

  try { // Check if user has access to this league
    const leagueMember = await prisma.leagueMember.findFirst({
      where: {

        leagueId,
        user: {
          auth0Id: user.sub

);

    if (!leagueMember) {

      return NextResponse.json({ error: 'League not found or access denied' }, { status: 404  

);

    // Get league settings from database
    const settings = await prisma.settings.findUnique({
      where: { leagueId },
      include: { league: {
          select: {

            name: true,
            season: true




     });

    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = {
        rosterSlots: {

          QB: 1,
          RB: 2,
          WR: 2,
          TE: 1,
          FLEX: 1,
          K: 1 

          DEF: 1 

          BENCH: 6

        },
        scoringSystem: { passingYards: 0.04,
          passingTouchdowns: 4,
          interceptions: -2,
          rushingYards: 0.1,
          rushingTouchdowns: 6,
          receivingYards: 0.1,
          receivingTouchdowns: 6,
          receptions: 1,
          fumbles: -2

        waiverMode: 'FAAB',
        tradeDeadline: null 

        playoffWeeks: [15, 16, 17]
      };

      return NextResponse.json({ success: true });

);

    return NextResponse.json({ settings })); catch (error) { const errorInstance = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to get league settings', errorInstance, 'API', {
      leagueId,
      userId: user.sub

);
    return NextResponse.json(
      { error: 'Failed to get league settings' },
      { status: 500 });
