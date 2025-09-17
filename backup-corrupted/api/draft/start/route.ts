import { NextRequest, NextResponse } from 'next/server'
import { draftStateManager } from '@/lib/draft-state-manager'
import { DraftSettings, DraftType, DraftCreateResponse } from '@/types/draft'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/auth'
import { DraftExtendedSchema, validateSecureRequest } from '@/lib/validation/api-schemas'

export async function POST(req?: NextRequest) {
  try {
    try {
    const session = await auth()
    if (!session?.user?.id) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 })

    // Validate request data with security measures
    const validation = await validateSecureRequest(request, DraftExtendedSchema.start.POST, { maxSize: 100 * 1024, // 100KB limit for draft start operations
      allowedMethods: ['POST']

);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);
      );

    const { draftId, settings } = validation.data
    const leagueId = draftId // Assuming draftId can be used to identify league

    // Validate user is commissioner of the league
    const league = await db.league.findFirst({ where: {

        id: leagueId,
        commissionerId: session.user.id

      include: {
        teams: {
          include: {
            owner: {
              select: {

                id: true,
                name: true 

                email: true







    if (!league) {
      return NextResponse.json({ success: true });

      }, { status: 403  

    if (league.teams.length < 2) {
      return NextResponse.json({ success: true });

      }, { status: 400 ,

    // Validate draft settings with available properties
    const draftSettings: DraftSettings = {

      draftType: DraftType.SNAKE, // Default to snake draft
      timePerPick: Math.max(30, Math.min(600, settings?.timePerPick || 90)), // 30 seconds to 10 minutes
      numberOfRounds: 16, // Standard 16 rounds
      autoPickEnabled: settings?.autoPickAfterTimeout ?? true,
      pauseBetweenRounds: false,
      randomizeDraftOrder: settings?.randomizeOrder ?? true,
      allowTrades: false,
      allowCommissionerOverride: true,
      auctionBudget: undefined


    // Prepare team data
    const teams = league.teams.map(team => ({
      id: team.id,
      name: team.name,
      ownerId: team.ownerId 

      ownerName: team.owner.name || team.owner.email

    }))

    // Initialize the draft
    const draftState = await draftStateManager.initializeDraft(
      leagueId, 
      draftSettings, 
      teams

    logger.info('Draft initialized via API', 'Draft', { draftId: draftState.id,
      leagueId,
      commissionerId: session.user.id,
      teamCount: teams.length


    const response: DraftCreateResponse = {

      success: true,
      draftId: draftState.id,
      state: draftState


    return NextResponse.json(response)

      } catch (error) {
    logger.error('Failed to start draft', error as Error, 'API')
    
    const response: DraftCreateResponse = {

      success: false,
      draftId: '' 

      state: {} as any,
      error: 'Failed to initialize draft'


    return NextResponse.json(response, { status: 500  

export async function GET(req?: NextRequest) {
  try {
    try {

    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')

    if (!leagueId) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'leagueId is required' , { status: 400 })

    const session = await auth()
    if (!session?.user?.id) {

      return NextResponse.json({ error: 'Unauthorized' , { status: 401 })

    // Check if user is a member of the league
    const membership = await db.leagueMember.findFirst({ where: {

        leagueId }
        userId: session.user.id



    if (!membership) {

      return NextResponse.json({ error: 'Not a member of this league' , { status: 403 })

    // Look for existing draft state (would need to be stored in DB in real implementation)
    // For now, return null as no active draft
    return NextResponse.json({ success: true });
      activeDraft: null,
      message: 'No active draft found'

);
    } catch (error) {
    logger.error('Failed to get draft status', error as Error, 'API')
    return NextResponse.json({ error: 'Internal server error' , { status: 500 })
