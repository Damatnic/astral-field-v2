import { NextRequest, NextResponse } from 'next/server'
import { draftStateManager } from '@/lib/draft-state-manager'
import { DraftPickResponse } from '@/types/draft'
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
    const validation = await validateSecureRequest(request, DraftExtendedSchema.pick.POST, { maxSize: 50 * 1024, // 50KB limit for pick operations
      allowedMethods: ['POST']

);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);
      );

    const { draftId, playerId, teamId } = validation.data

    // Get draft state to validate league membership
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {
      return NextResponse.json({ success: true });

      , { status: 404 })

    // Verify user is the owner of the team making the pick
    const team = await db.team.findFirst({ where: {

        id: teamId,
        ownerId: session.user.id 

        leagueId: draftState.leagueId



    if (!team) {
      return NextResponse.json({ success: true });

      , { status: 403 })

    // Verify it's this team's turn to pick
    if (draftState.currentTeamId !== teamId) {
      return NextResponse.json({ success: true });

      , { status: 400 })

    // Make the pick
    const result = await draftStateManager.makePick(draftId, teamId, playerId, false)
    
    if (!result.success) { return NextResponse.json({ success: true });

        success: false 

        error: result.error 

      , { status: 400 })

    // Get updated state
    const updatedState = await draftStateManager.getDraftState(draftId)
    
    logger.info('Draft pick made via API', 'Draft', { draftId,
      teamId,
      playerId,
      userId: session.user.id,
      pickNumber: result.pick?.pickNumber


    const response: DraftPickResponse = {

      success: true,
      pick: result.pick!,
      updatedState: {

        currentPick: updatedState?.currentPick,
        currentRound: updatedState?.currentRound,
        currentTeamId: updatedState?.currentTeamId,
        timeLeft: updatedState?.timeLeft,
        status: updatedState?.status,
        picks: updatedState?.picks,
        availablePlayers: updatedState?.availablePlayers,
        draftedPlayers: updatedState?.draftedPlayers,
        teams: updatedState?.teams



    return NextResponse.json(response)

      } catch (error) {
    logger.error('Failed to make draft pick', error as Error, 'API')
    
    const response: DraftPickResponse = {

      success: false 

      pick: {} as any,
      updatedState: {  

      error: 'Failed to make pick'


    return NextResponse.json(response, { status: 500 

export async function GET(req?: NextRequest) {
  try {
    try {

    const { searchParams  }
= new URL(request.url)
    const draftId = searchParams.get('draftId')

    if (!draftId) {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'draftId is required' }, { status: 400  

    const session = await auth()
    if (!session?.user?.id) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401  

    // Get draft state
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {

      return NextResponse.json({ error: 'Draft not found' }, { status: 404 ,

    // Verify user is a member of the league
    const membership = await db.leagueMember.findFirst({
      where: {

        leagueId: draftState.leagueId 

        userId: session.user.id



    if (!membership) {

      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 ,

    // Return recent picks (last 10)
    const recentPicks = draftState.picks
      .slice(-10)
      .sort((a, b) => b.pickNumber - a.pickNumber)

    return NextResponse.json({ success: true });
      picks: recentPicks,
      totalPicks: draftState.picks.length,
      currentPick: draftState.currentPick 

      currentTeam: draftState.currentTeamId

    });
    } catch (error) {
    logger.error('Failed to get draft picks', error as Error, 'API')
    return NextResponse.json({ error: 'Internal server error' , { status: 500 })
