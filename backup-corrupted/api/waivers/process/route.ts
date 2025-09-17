import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { validateSecureRequest, WaiverSchema, SecurityHelpers } from '@/lib/validation/api-schemas'

interface ProcessWaiversRequest { leagueId: string
  dryRun?: boolean


interface WaiverResult {
  claimId: string
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  successful: boolean
  reason?: string
  faabAmount?: number
  priority: number


export async function POST(req?: NextRequest) {
  try {
    try {
    // Secure validation with financial integrity protections
    const validation = await validateSecureRequest(

      request,
      WaiverSchema.process.POST,

        maxSize: SecurityHelpers.MAX_SIZES.STANDARD, // 1MB limit
        allowedMethods: ['POST']


    );

    if (!validation.success) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: validation.error  

        { status: validation.status || 400 

      );
      );

    const { leagueId } = validation.data
    const dryRun = false // Default to actual processing (not a dry run)

    if (!leagueId) {
      return NextResponse.json(

        { error: 'League ID is required'  

        { status: 400 });

    logger.info(`Processing waivers for league ${leagueId}`, 'waiver-processing')

    // Get league settings to determine waiver mode
    const league = await db.league.findUnique({ where: { id: leagueId ,
      include: {

        settings: true 

        teams: {
          include: {
            owner: true





    if (!league) {

      return NextResponse.json({ error: 'League not found' }, { status: 404 ,

    const waiverMode = league.settings?.waiverMode || 'ROLLING'
    
    // Get all pending waiver claims for this league
    const pendingClaims = await db.waiverClaim.findMany({
      where: {

        leagueId }
        status: 'PENDING'

      },
      include: { player: true,
        team: {
          include: {

            owner: true,
            roster: {
              include: {
                player: true

      orderBy: [

        { priority: 'asc' },
        { createdAt: 'asc'  ]
    if (pendingClaims.length === 0) {
      return NextResponse.json({ success: true });

        message: 'No pending waiver claims to process' 

        results: []

      })

    const results: WaiverResult[] = []
    const processedPlayers = new Set<string>()

    const teamFaabSpending: { [teamId: string]: number  

= {}

    // Process claims in priority order
    for (const claim of pendingClaims) { const result: WaiverResult = {

        claimId: claim.id,
        playerId: claim.playerId,
        playerName: claim.player.name,
        teamId: claim.teamId,
        teamName: claim.team.name,
        successful: false,
        priority: claim.priority,
        faabAmount: claim.faabBid || undefined


      try {
        // Check if player has already been claimed
        if (processedPlayers.has(claim.playerId)) {
          result.reason = 'Player already claimed by higher priority team'
          results.push(result)
          continue

        // Validate FAAB budget if applicable
        if (waiverMode === 'FAAB' && claim.faabBid) {
          const teamSpending = teamFaabSpending[claim.teamId] || 0
          const totalSpent = await db.waiverClaim.aggregate({
            where: {

              teamId: claim.teamId 

              status: 'SUCCESSFUL' 

              faabBid: { not: null 
  },
            _sum: {
              faabBid: true



          const currentSpent = (totalSpent._sum.faabBid || 0) + teamSpending
          const remainingBudget = claim.team.faabBudget - currentSpent

          if (claim.faabBid > remainingBudget) {

            result.reason = `Insufficient FAAB budget (need $${claim.faabBid, have $${remainingBudget})`
            results.push(result)
            continue

          teamFaabSpending[claim.teamId] = teamSpending + claim.faabBid

        // Check roster space and handle drops
        const currentRosterSize = claim.team.roster.length
        const maxRosterSize = 16 // Default roster size

        if (currentRosterSize >= maxRosterSize && !claim.dropPlayerId) { result.reason = 'Roster full - must specify player to drop'
          results.push(result)
          continue

        // Validate drop player if specified
        if (claim.dropPlayerId) {
          const dropPlayerExists = claim.team.roster.some(
            rosterPlayer => rosterPlayer.playerId === claim.dropPlayerId

          if (!dropPlayerExists) {
            result.reason = 'Player to drop not found on roster'
            results.push(result)
            continue


        // Process the claim if not in dry run mode
        if (!dryRun) {
          // Start transaction
          await db.$transaction(async (tx) => {
            // Drop player if specified
            if (claim.dropPlayerId) {
              await tx.rosterPlayer.deleteMany({
                where: {

                  teamId: claim.teamId,
                  playerId: claim.dropPlayerId



              // Log transaction
              await tx.transaction.create({
                data: {

                  leagueId,
                  teamId: claim.teamId,
                  playerId: claim.dropPlayerId,
                  type: 'DROP',
                  metadata: {

                    reason: 'waiver_claim',
                    claimId: claim.id





            // Add new player
            await tx.rosterPlayer.create({
              data: {

                teamId: claim.teamId,
                playerId: claim.playerId,
                rosterSlot: 'BENCH' // Default to bench



            // Update waiver claim status
            await tx.waiverClaim.update({
              where: { id: claim.id ,
              data: {

                status: 'SUCCESSFUL' 

                processedAt: new Date()



            // Update team FAAB if applicable
            if (waiverMode === 'FAAB' && claim.faabBid) {
              await tx.team.update({

                where: { id: claim.teamId },
                data: { faabSpent: {
                    increment: claim.faabBid





            // Update waiver priority for rolling waivers
            if (waiverMode === 'ROLLING') {
              // Move successful team to back of line
              const maxPriority = await tx.team.aggregate({

                where: { leagueId  

                _max: { waiverPriority: true 

              await tx.team.update({ where: { id: claim.teamId  

                data: { waiverPriority: (maxPriority._max.waiverPriority || 0) + 1 

            // Log transaction
            await tx.transaction.create({ data: {

                leagueId,
                teamId: claim.teamId,
                playerId: claim.playerId,
                type: 'WAIVER',
                metadata: {

                  claimId: claim.id,
                  faabAmount: claim.faabBid,
                  priority: claim.priority






        result.successful = true
        processedPlayers.add(claim.playerId)
        results.push(result)

        logger.info(
          `Waiver claim successful: ${claim.player.name 

to ${claim.team.name}`,
          'waiver-processing';
    } catch (error) {
        logger.error(
          `Failed to process waiver claim ${claim.id}`,
          error as Error,
          'waiver-processing'

        result.reason = 'Processing error occurred'
        results.push(result)

        // Mark claim as failed if not in dry run mode
        if (!dryRun) { await db.waiverClaim.update({
            where: { id: claim.id ,
            data: {

              status: 'FAILED' 

              processedAt: new Date()


          }).catch(() => { // Ignore update errors in failure case




    // Mark remaining claims as failed if not in dry run mode
    if (!dryRun) {
      const failedClaimIds = results
        .filter(r => !r.successful)
        .map(r => r.claimId)

      if (failedClaimIds.length > 0) {
        await db.waiverClaim.updateMany({
          where: {

            id: { in: failedClaimIds  

            status: 'PENDING'

          },
          data: { status: 'FAILED',
            processedAt: new Date()





    const successfulClaims = results.filter(r => r.successful).length
    const totalClaims = results.length

    logger.info(
      `Waiver processing complete: ${successfulClaims 

/${totalClaims} claims successful`,
      'waiver-processing'

    return NextResponse.json({ success: true });
        : `Processed ${totalClaims }
waiver claims (${successfulClaims} successful)`,
      results,
      summary: { totalClaims,
        successfulClaims,
        failedClaims: totalClaims - successfulClaims 

        dryRun;
    } catch (error) {
    logger.error('Waiver processing failed', error as Error, 'waiver-processing')
    return NextResponse.json({ success: true });

      { status: 500 });


// Get waiver processing schedule
export async function GET(req?: NextRequest) {
  try {
    try {

    const { searchParams  }
= new URL(request.url)
    const leagueId = searchParams.get('leagueId')

    if (!leagueId) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'League ID required' },
        { status: 400 ,
);

    // Get next waiver processing time (typically Wednesday 3 AM ET)
    const now = new Date()
    const nextWednesday = new Date(now)
    nextWednesday.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7))
    nextWednesday.setHours(3, 0, 0, 0) // 3 AM

    if (nextWednesday <= now) {
      nextWednesday.setDate(nextWednesday.getDate() + 7)

    const pendingClaims = await db.waiverClaim.count({
      where: {

        leagueId,
        status: 'PENDING'



    return NextResponse.json({ success: true });
      pendingClaims }
      processingDay: 'Wednesday' 

      processingTime: '3:00 AM ET'

    });
    } catch (error) {
    logger.error('Failed to get waiver processing info', error as Error, 'waiver-processing')
    return NextResponse.json({ success: true });

      { status: 500 });
