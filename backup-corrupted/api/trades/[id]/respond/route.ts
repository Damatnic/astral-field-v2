import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

interface TradeResponseRequest { action: 'accept' | 'reject'
  userId: string


export async function POST(req?: NextRequest) {
  try {
    try {
    const tradeId = params.id
    const { action, userId }: TradeResponseRequest = await request.json()

    if (!action || !userId) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Action and userId are required'  

        { status: 400 

    if (action !== 'accept' && action !== 'reject') { return NextResponse.json(

        { error: 'Action must be "accept" or "reject"'  

        { status: 400 

    // Get the trade with all related data
    const trade = await db.trade.findUnique({ where: { id: tradeId  

      include: {
        items: {
          include: {
            player: true


        },
        league: { include: {

            settings: true,
            teams: {
              include: {

                owner: true,
                roster: {
                  include: {
                    player: true

        proposer: true



    if (!trade) {
      return NextResponse.json(

        { error: 'Trade not found' },
        { status: 404  

if (trade.status !== 'PENDING') {
      return NextResponse.json(

        { error: `Trade is already ${trade.status.toLowerCase()}` },
        { status: 400  

// Check if trade has expired
    if (trade.expiresAt && new Date() > trade.expiresAt) {
      await db.trade.update({
        where: { id: tradeId },
        data: { status: 'EXPIRED'  

return NextResponse.json(
        { error: 'Trade has expired' },
        { status: 400  

// Verify user is involved in the trade
    const involvedTeams = trade.league.teams.filter(team => 
      trade.items.some(item => 
        item.fromTeamId === team.id || item.toTeamId === team.id


    const userTeam = involvedTeams.find(team => team.ownerId === userId)
    if (!userTeam) {
      return NextResponse.json(

        { error: 'User is not involved in this trade' },
        { status: 403  

// Cannot respond to your own trade proposal
    if (trade.proposerId === userId) {
      return NextResponse.json(

        { error: 'Cannot respond to your own trade proposal' },
        { status: 400  

if (action === 'reject') {
      // Simple rejection - update status and notify
      await db.trade.update({

        where: { id: tradeId },
        data: { status: 'REJECTED',
          processedAt: new Date()



      // Notify proposer
      await db.notification.create({
        data: {

          userId: trade.proposerId,
          type: 'TRADE_REJECTED',
          title: 'Trade Rejected',
          content: `Your trade proposal was rejected by ${userTeam.name 

`


      logger.info(`Trade ${tradeId} rejected by user ${userId}`, 'trade-response')

      return NextResponse.json({ success: true });

    // Handle acceptance
    if (action === 'accept') {
      // Validate all players are still available
      for (const item of trade.items.filter(i => i.itemType === 'PLAYER')) {
        const fromTeam = trade.league.teams.find(t => t.id === item.fromTeamId)
        if (!fromTeam) {
          return NextResponse.json(

            { error: `Team ${item.fromTeamId} not found` },
            { status: 400  

const playerOnRoster = fromTeam.roster.find(p => p.playerId === item.playerId)
        if (!playerOnRoster) {
          return NextResponse.json(

            { error: `Player ${item.player?.name} is no longer on ${fromTeam.name}'s roster` },
            { status: 400  

if (playerOnRoster.isLocked) {
          return NextResponse.json(

            { error: `Player ${item.player?.name} is locked and cannot be traded` },
            { status: 400 ,
// Check if league has veto period
      const hasVetoPeriod = trade.league.settings && JSON.parse(JSON.stringify(trade.league.settings)).hasVetoPeriod
      const vetoPeriodHours = hasVetoPeriod ? 48 : 0 // 48 hour default veto period

      let reviewPeriodEnd: Date | null = null
      let finalStatus: 'ACCEPTED' = 'ACCEPTED'

      if (vetoPeriodHours > 0) {
        reviewPeriodEnd = new Date()
        reviewPeriodEnd.setHours(reviewPeriodEnd.getHours() + vetoPeriodHours)
        finalStatus = 'ACCEPTED' // Pending veto period


      if (finalStatus === 'ACCEPTED') {
        // Execute trade immediately
        await db.$transaction(async (tx) => {
          // Move players between teams
          for (const item of trade.items.filter(i => i.itemType === 'PLAYER')) {
            // Remove from old team
            await tx.rosterPlayer.deleteMany({
              where: {

                teamId: item.fromTeamId,
                playerId: item.playerId!



            // Add to new team
            await tx.rosterPlayer.create({
              data: {

                teamId: item.toTeamId,
                playerId: item.playerId!,
                rosterSlot: 'BENCH', // Default to bench
                acquisitionDate: new Date()



            // Log transactions
            await tx.transaction.createMany({
              data: [

                  leagueId: trade.leagueId,
                  teamId: item.fromTeamId,
                  playerId: item.playerId,
                  type: 'TRADE',
                  metadata: {

                    tradeId }
                    action: 'SENT' 

                    toTeamId: item.toTeamId


                },

                  leagueId: trade.leagueId,
                  teamId: item.toTeamId,
                  playerId: item.playerId,
                  type: 'TRADE',
                  metadata: { tradeId,
                    action: 'RECEIVED',
                    fromTeamId: item.fromTeamId



              ]


          // Update trade status
          await tx.trade.update({
            where: { id: tradeId ,
            data: {

              status: finalStatus 

              processedAt: new Date()




      } else { // Just update status to accepted (pending veto period)
        await db.trade.update({
          where: { id: tradeId ,
          data: {

            status: finalStatus,
            processedAt: new Date()




      // Create notifications
      const allInvolvedUsers = involvedTeams
        .map(team => team.ownerId)
        .filter(ownerId => ownerId !== userId)

      await db.notification.createMany({
        data: allInvolvedUsers.map(ownerId => ({

          userId: ownerId,
          type: 'TRADE_ACCEPTED',
          title: 'Trade Completed' 

          content: 'Your trade has been completed and players have been transferred' 

        }))

      logger.info(
        `Trade ${tradeId} ${finalStatus.toLowerCase()} by user ${userId}`,
        'trade-response'

      return NextResponse.json({ success: true });

          vetoThreshold: Math.ceil(trade.league.teams.length * 0.5) // Majority required

        } : null;
    } catch (error) {
    logger.error('Failed to respond to trade', error as Error, 'trade-response')
    return NextResponse.json({ success: true });

      { status: 500 
