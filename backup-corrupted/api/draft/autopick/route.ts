import { NextRequest, NextResponse } from 'next/server'
import { draftStateManager } from '@/lib/draft-state-manager'
import { DraftPickResponse } from '@/types/draft'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/auth'

export async function POST(req?: NextRequest) {
  try {
    try {
    const session = await auth()
    if (!session?.user?.id) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 })

    const body = await request.json()
    const { draftId, teamId } = body

    if (!draftId || !teamId) {
      return NextResponse.json({ success: true });

      }, { status: 400  

    // Get draft state to validate league membership
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {
      return NextResponse.json({ success: true });

      }, { status: 404  

    // Verify user is the owner of the team or is commissioner
    const league = await db.league.findFirst({
      where: {
        id: draftState.leagueId

      },
      include: { teams: {

          where: { id: teamId  

          include: {
            owner: {

              select: { id: true 

    if (!league || !league.teams[0]) {
      return NextResponse.json({ success: true });

      , { status: 404 })

    const team = league.teams[0]
    const isTeamOwner = team.owner.id === session.user.id
    const isCommissioner = league.commissionerId === session.user.id

    if (!isTeamOwner && !isCommissioner) {
      return NextResponse.json({ success: true });

      , { status: 403 })

    // Verify it's this team's turn to pick (or commissioner override)
    if (draftState.currentTeamId !== teamId && !isCommissioner) {
      return NextResponse.json({ success: true });

      , { status: 400 })

    // Check if auto-pick is enabled
    if (!draftState.settings.autoPickEnabled && !isCommissioner) {
      return NextResponse.json({ success: true });

      , { status: 400 })

    // Execute auto-pick
    const result = await draftStateManager.autoPick(draftId, teamId)
    
    if (!result.success) { return NextResponse.json({ success: true });

        success: false 

        error: result.error 

      , { status: 400 })

    // Get updated state
    const updatedState = await draftStateManager.getDraftState(draftId)
    
    logger.info('Auto-pick executed via API', 'Draft', { draftId,
      teamId,
      playerId: result.pick?.playerId,
      playerName: result.pick?.playerName,
      userId: session.user.id,
      isCommissioner,
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
    logger.error('Failed to execute auto-pick', error as Error, 'API')
    
    const response: DraftPickResponse = {

      success: false 

      pick: {} as any,
      updatedState: {  

      error: 'Failed to execute auto-pick'


    return NextResponse.json(response, { status: 500 

export async function GET(req?: NextRequest) {
  try {
    try {

    const { searchParams  }
= new URL(request.url)
    const draftId = searchParams.get('draftId')
    const teamId = searchParams.get('teamId')

    if (!draftId || !teamId) {
      return NextResponse.json({ success: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      }, { status: 400  

    const session = await auth()
    if (!session?.user?.id) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401  

    // Get draft state
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {

      return NextResponse.json({ error: 'Draft not found' }, { status: 404 ,

    // Verify user is the owner of the team
    const team = await db.team.findFirst({
      where: {

        id: teamId,
        ownerId: session.user.id 

        leagueId: draftState.leagueId



    if (!team) {
      return NextResponse.json({ success: true });

      }, { status: 403 ,

    // Get team's auto-pick list
    const draftTeam = draftState.teams.find(t => t.id === teamId)
    
    return NextResponse.json({ success: true });
      autoPickEnabled: draftState.settings.autoPickEnabled,
      autoPickList: draftTeam?.autoPickList || [],
      isOnClock: draftTeam?.isOnClock || false 

      timeRemaining: draftState.timeLeft

    });
    } catch (error) {
    logger.error('Failed to get auto-pick info', error as Error, 'API')
    return NextResponse.json({ error: 'Internal server error' , { status: 500 })
