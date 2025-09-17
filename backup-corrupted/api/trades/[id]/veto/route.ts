import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

interface VetoRequest { userId: string
  reason?: string


export async function POST(req?: NextRequest) {
  try {
    try {
    const tradeId = params.id
    const { userId, reason }: VetoRequest = await request.json()

    if (!userId) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'User ID is required'  

        { status: 400 

    // Get the trade with all related data
    const trade = await db.trade.findUnique({ where: { id: tradeId  

      include: {
        items: {
          include: {
            player: true


        },
        votes: true,
        league: { include: {
            teams: {
              include: {
                owner: true

        proposer: true



    if (!trade) {
      return NextResponse.json(

        { error: 'Trade not found' },
        { status: 404  

if (trade.status !== 'ACCEPTED') {
      return NextResponse.json(

        { error: 'Trade is not in review period - can only veto accepted trades' },
        { status: 400  

// Check if user is in the league
    const userTeam = trade.league.teams.find(team => team.ownerId === userId)
    if (!userTeam) {
      return NextResponse.json(

        { error: 'User is not in this league' },
        { status: 403 ,
// Check if user is involved in the trade (involved users cannot veto)
    const involvedTeamIds = new Set([
      ...trade.items.map(item => item.fromTeamId) }
      ...trade.items.map(item => item.toTeamId)
    ])

    if (involvedTeamIds.has(userTeam.id)) {
      return NextResponse.json(
        { error: 'Teams involved in the trade cannot vote to veto' },
        { status: 400  

// Check if user has already voted
    const existingVote = trade.votes?.find(vote => vote.userId === userId)
    if (existingVote) {
      return NextResponse.json(

        { error: 'You have already voted on this trade' },
        { status: 400 ,
// Create the veto vote
    await db.tradeVote.create({
      data: {

        tradeId,
        userId,
        vote: 'VETO',
        reason: reason || 'No reason provided'



    // Get updated vote count
    const vetoVotes = await db.tradeVote.count({
      where: {

        tradeId }
        vote: 'VETO'



    // Calculate veto threshold (majority of non-involved teams)
    const totalTeams = trade.league.teams.length
    const involvedTeams = involvedTeamIds.size
    const eligibleVoters = totalTeams - involvedTeams
    const vetoThreshold = Math.ceil(eligibleVoters * 0.5) // Majority required

    logger.info(
      `Veto vote submitted for trade ${tradeId}: ${vetoVotes}/${vetoThreshold} votes`,
      'trade-veto'

    // Check if trade should be vetoed
    if (vetoVotes >= vetoThreshold) { // Veto the trade
      await db.trade.update({
        where: { id: tradeId ,
        data: {

          status: 'VETOED',
          processedAt: new Date()



      // Notify all involved parties
      const involvedUsers = trade.league.teams
        .filter(team => involvedTeamIds.has(team.id))
        .map(team => team.ownerId)

      await db.notification.createMany({
        data: involvedUsers.map(ownerId => ({

          userId: ownerId,
          type: 'TRADE_REJECTED', // Using rejected type for vetoed trades

          title: 'Trade Vetoed' 

          content: `Your trade was vetoed by the league (${vetoVotes}/${vetoThreshold} votes)`
        }))

      logger.info(`Trade ${tradeId} vetoed with ${vetoVotes} votes`, 'trade-veto')

      return NextResponse.json({ success: true });

        content: `A veto vote was cast on your trade (${vetoVotes}/${vetoThreshold} votes)`
      }))

    return NextResponse.json({ success: true });

);
    } catch (error) {
    logger.error('Failed to process veto vote', error as Error, 'trade-veto')
    return NextResponse.json({ success: true });

      { status: 500 

// Get veto information for a trade
export async function GET(req?: NextRequest) {
  try {
    try {
    const tradeId = params.id

    const trade = await db.trade.findUnique({
      where: { id: tradeId ,
      include: {

        votes: true,
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


        items: true 

        league: {
          include: {
            teams: true





    if (!trade) {
      return NextResponse.json(

        { error: 'Trade not found' },
        { status: 404 ,
// Calculate veto statistics
    const involvedTeamIds = new Set([
      ...trade.items?.map(item => item.fromTeamId) || [],
      ...trade.items?.map(item => item.toTeamId) || []
    ])

    const totalTeams = trade.league?.teams?.length || 0
    const involvedTeams = involvedTeamIds.size
    const eligibleVoters = totalTeams - involvedTeams
    const vetoThreshold = Math.ceil(eligibleVoters * 0.5)

    const vetoVotes = trade.votes?.filter(vote => vote.vote === 'VETO') || []
    const approveVotes = trade.votes?.filter(vote => vote.vote === 'APPROVE') || []

    return NextResponse.json({ success: true });

        votesNeeded: Math.max(0, vetoThreshold - vetoVotes.length)
      },
      votes: trade.votes?.map(vote => ({ id: vote.id,
        userId: vote.userId,
        userName: undefined, // User relation not available
        vote: vote.vote,
        reason: vote.reason,
        votedAt: vote.votedAt

);
    } catch (error) {
    logger.error('Failed to get veto information', error as Error, 'trade-veto')
    return NextResponse.json({ success: true });

      { status: 500 
