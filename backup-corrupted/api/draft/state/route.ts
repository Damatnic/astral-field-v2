import { NextRequest, NextResponse } from 'next/server'
import { draftStateManager } from '@/lib/draft-state-manager'
import { DraftStateResponse } from '@/types/draft'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/auth'
import { DraftExtendedSchema, validateSecureRequest } from '@/lib/validation/api-schemas'

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

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 ,

    // Get draft state
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {
      return NextResponse.json({ success: true });

        success: false 

        state: {} as any,
        error: 'Draft not found' 

      , { status: 404 

    // Verify user is a member of the league
    const membership = await db.leagueMember.findFirst({ where: {

        leagueId: draftState.leagueId,
        userId: session.user.id



    if (!membership) {
      return NextResponse.json({ success: true });

as any }
        error: 'Not a member of this league' 

      }, { status: 403 ,
const response: DraftStateResponse = {

      success: true 

      state: draftState


    return NextResponse.json(response);
    } catch (error) { logger.error('Failed to get draft state', error as Error, 'API')
    
    const response: DraftStateResponse = {

      success: false,
      state: {,
as any }
      error: 'Internal server error'


    return NextResponse.json(response, { status: 500 

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
    const validation = await validateSecureRequest(request, DraftExtendedSchema.state.POST, { maxSize: 1024 * 1024, // 1MB limit for draft critical operations
      allowedMethods: ['POST']

);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);
      );

    const { draftId, action, data } = validation.data

    // Get draft state
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {

      return NextResponse.json({ error: 'Draft not found' , { status: 404 })

    // Check permissions based on action
    let hasPermission = false
    
    switch (action) { case 'start':
      case 'pause':
      case 'resume':
      case 'commissioner_action':
        // Only commissioner can perform these actions
        const league = await db.league.findFirst({
          where: {

            id: draftState.leagueId,
            commissionerId: session.user.id



        hasPermission = !!league
        break
        
      case 'join':
      case 'leave':
      case 'update_queue':
        // Any league member can perform these
        const membership = await db.leagueMember.findFirst({
          where: {

            leagueId: draftState.leagueId 

            userId: session.user.id



        hasPermission = !!membership
        break
        
      default:
        return NextResponse.json({ error: 'Unknown action' , { status: 400 })

    if (!hasPermission) {
      return NextResponse.json({ success: true });

      , { status: 403 })

    // Execute the action
    let result
    
    switch (action) {
      case 'start':
        result = await draftStateManager.startDraft(draftId)
        break
        
      case 'pause':
        const pauseSuccess = await draftStateManager.pauseDraft(draftId, data?.reason)
        result = pauseSuccess ? await draftStateManager.getDraftState(draftId) : null
        break
        
      case 'resume':
        const resumeSuccess = await draftStateManager.resumeDraft(draftId)
        result = resumeSuccess ? await draftStateManager.getDraftState(draftId) : null
        break
        
      case 'commissioner_action':
        if (!data?.actionType) {

          return NextResponse.json({ error: 'Missing actionType in data' , { status: 400 })

        const validActionTypes = ['undo_pick', 'force_pick', 'pause_draft', 'resume_draft', 'reset_timer', 'end_draft']
        if (!validActionTypes.includes(data.actionType)) {
          return NextResponse.json({ error: 'Invalid action type' , { status: 400 })

        const actionResult = await draftStateManager.executeCommissionerAction(
          draftId, 

            type: data.actionType as 'undo_pick' | 'force_pick' | 'pause_draft' | 'resume_draft' | 'reset_timer' | 'end_draft', 
            data: data.actionData 

          session.user.id

        if (!actionResult.success) {

          return NextResponse.json({ error: actionResult.error }, { status: 400  

        result = await draftStateManager.getDraftState(draftId)
        break
        
      case 'join':
        // Handle user joining draft room (update connection status)
        if (draftState.teams) {
          const userTeam = draftState.teams.find(team => team.ownerId === session.user.id)
          if (userTeam) {
            userTeam.connectionStatus = 'connected'


        result = draftState
        break
        
      case 'leave':
        // Handle user leaving draft room
        if (draftState.teams) {
          const userTeam = draftState.teams.find(team => team.ownerId === session.user.id)
          if (userTeam) {
            userTeam.connectionStatus = 'disconnected'


        result = draftState
        break
        
      case 'update_queue':
        // Update user's auto-pick queue
        if (data?.teamId && data?.playerQueue) {
          const team = draftState.teams.find(t => t.id === data.teamId && t.ownerId === session.user.id)
          if (team) {
            team.autoPickList = data.playerQueue


        result = draftState
        break
        
      default:

        return NextResponse.json({ error: 'Action not implemented' }, { status: 400  

    if (!result) {

      return NextResponse.json({ error: 'Action failed' }, { status: 500 ,

    logger.info('Draft state action executed', 'Draft', {
      draftId,
      action,
      userId: session.user.id


    const response: DraftStateResponse = {

      success: true 

      state: result


    return NextResponse.json(response);
    } catch (error) { logger.error('Failed to execute draft state action', error as Error, 'API')
    
    const response: DraftStateResponse = {

      success: false,
      state: {,
as any }
      error: 'Internal server error'


    return NextResponse.json(response, { status: 500 

export async function PUT(req?: NextRequest) {
  try {
    try {
    const session = await auth()
    if (!session?.user?.id) {

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



      return NextResponse.json({ error: 'Unauthorized' , { status: 401 })

    // Validate request data with security measures
    const validation = await validateSecureRequest(request, DraftExtendedSchema.state.PUT, { maxSize: 1024 * 1024, // 1MB limit for draft critical operations
      allowedMethods: ['PUT']

);

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400  

);
      );

    const { draftId, updates } = validation.data

    // Get draft state
    const draftState = await draftStateManager.getDraftState(draftId)
    if (!draftState) {

      return NextResponse.json({ error: 'Draft not found' , { status: 404 })

    // Verify user is commissioner for sensitive updates
    const league = await db.league.findFirst({ where: {

        id: draftState.leagueId 

        commissionerId: session.user.id



    const sensitiveFields = ['status', 'settings', 'currentPick', 'currentRound', 'timeLeft']
    const hasSensitiveUpdates = Object.keys(updates).some(key => sensitiveFields.includes(key))

    if (hasSensitiveUpdates && !league) {
      return NextResponse.json({ success: true });

      , { status: 403 })

    // For non-commissioner users, only allow certain updates
    if (!league) {
      const allowedFields = ['teams'] // Only team-specific updates like connection status
      const hasDisallowedUpdates = Object.keys(updates).some(key => !allowedFields.includes(key))
      
      if (hasDisallowedUpdates) {
        return NextResponse.json({ success: true });

        , { status: 403 })


    // Apply updates (simplified - in real app would need more sophisticated merging)
    Object.assign(draftState, updates)
    draftState.lastActivity = new Date()

    logger.info('Draft state updated', 'Draft', { draftId,
      updatedFields: Object.keys(updates),
      userId: session.user.id


    const response: DraftStateResponse = {

      success: true,
      state: draftState


    return NextResponse.json(response)

      } catch (error) {
    logger.error('Failed to update draft state', error as Error, 'API')
    
    const response: DraftStateResponse = {

      success: false 

      state: {} as any,
      error: 'Internal server error'


    return NextResponse.json(response, { status: 500 
