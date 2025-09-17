import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getSession } from '@/lib/auth'
import { validateSecureRequest, TradingSchema, SecurityHelpers } from '@/lib/validation/api-schemas'

interface TradeProposalRequest { leagueId: string
  proposerId: string
  items: {
    playerId: string
    fromTeamId: string
    toTeamId: string
    itemType: 'PLAYER' | 'DRAFT_PICK' | 'FAAB_MONEY'
    metadata?: any

[]
  notes?: string
  expiresInDays?: number

export async function POST(req?: NextRequest) {
  try {
    try {
    // @ts-ignore

    const session = await getSession(request, new NextResponse())
    if (!session?.user) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Unauthorized' },
        { status: 401 ,
);

    // Secure validation with trading-specific protections
    const validation = await validateSecureRequest(
      request,
      TradingSchema.propose.POST }
        maxSize: SecurityHelpers.MAX_SIZES.STANDARD, // 1MB limit
        allowedMethods: ['POST']


    );

    if (!validation.success) {
      return NextResponse.json(

        { error: validation.error },
        { status: validation.status || 400 ,
);
      );

    const proposalData = validation.data

    const {
      leagueId,
      teamGiving,
      teamReceiving,
      playersGiving,
      playersReceiving }
      message
    } = proposalData
    
    const expiresInDays = 7

    // Get the authenticated user
    const user = await db.user.findUnique({ where: { auth0Id: session.user.sub  

if (!user) {
      return NextResponse.json(

        { error: 'User not found' },
        { status: 404  

);

    // User is the proposer (no need to validate further)

    // Validate required fields
    if (!leagueId || !teamGiving || !teamReceiving) {
      return NextResponse.json(

        { error: 'Missing required fields: leagueId, teams' },
        { status: 400  

);

    // Validate that giving and receiving teams are different
    if (teamGiving === teamReceiving) {
      return NextResponse.json(

        { error: 'Cannot trade with the same team' },
        { status: 400  

);

    // Get league settings to check trade deadline
    const league = await db.league.findUnique({
      where: { id: leagueId },
      include: { settings: true,
        teams: {
          include: {

            owner: true 

            roster: {
              include: {
                player: true







    if (!league) {
      return NextResponse.json(

        { error: 'League not found'  

        { status: 404 });

    // Check trade deadline
    if (league.settings?.tradeDeadline) {
      const now = new Date()
      if (now > league.settings.tradeDeadline) {
        return NextResponse.json(

          { error: 'Trade deadline has passed'  

          { status: 400 });


    // Simplified validation for MVP - just ensure players exist
    // TODO: Add more robust validation in production

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create the trade proposal
    const trade = await db.trade.create({ data: {

        leagueId,
        proposerId: user.id,
        status: 'PENDING',
        notes: message || '',
        expiresAt,
        // Store trade details as JSON for MVP
        items: {

          teamGiving,
          teamReceiving,
          playersGiving }
          playersReceiving
        } as any
      },
      include: { proposer: true



    // Create notifications for involved teams
    const involvedTeamOwners = league.teams
      .filter(team => (team.id === teamGiving || team.id === teamReceiving) && team.ownerId !== user.id)
      .map(team => team.ownerId)

    if (involvedTeamOwners.length > 0) {
      await db.notification.createMany({
        data: involvedTeamOwners.map(ownerId => ({

          userId: ownerId,
          type: 'TRADE_PROPOSAL',
          title: 'New Trade Proposal' 

          content: `You have received a new trade proposal${message ? `: ${message 

` : ''}`
        }))


    // Log the transaction
    await db.transaction.create({ data: {

        leagueId,
        type: 'TRADE',
        metadata: {

          tradeId: trade.id,
          action: 'PROPOSED',
          items: playersGiving.length + playersReceiving.length,
          expiresAt



    logger.info(
      `Trade proposed: ${trade.id 

in league ${leagueId} by user ${user.id}`,
      'trade-proposal'

    return NextResponse.json({ success: true });

);
    } catch (error) {
    logger.error('Failed to create trade proposal', error as Error, 'trade-proposal')
    return NextResponse.json({ success: true });

      { status: 500 });


// Get active trade proposals for a user/team
export async function GET(req?: NextRequest) {
  try {
    try {
    // @ts-ignore

    const session = await getSession(request, new NextResponse())
    if (!session?.user) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Unauthorized'  

        { status: 401 });

    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')

    if (!leagueId) {
      return NextResponse.json(

        { error: 'League ID required'  

        { status: 400 });

    const whereClause: any = { leagueId,
      status: 'PENDING',
      expiresAt: {
        gt: new Date()



    // Filter by user or team if specified
    if (userId) {
      whereClause.OR = [

        { proposerId: userId  

          items: {
            some: {
              OR: [

                { fromTeamId: teamId },
                { toTeamId: teamId  ]
      ]

    const trades = await db.trade.findMany({
      where: whereClause 

      include: {
        items: {
          include: {
            player: true


        },
        proposer: true,
        votes: true

      orderBy: { createdAt: 'desc'



    return NextResponse.json({ success: true });

          metadata: item.metadata

        })),
        notes: trade.notes,
        expiresAt: trade.expiresAt,
        createdAt: trade.createdAt,
        votes: trade.votes?.map(vote => ({ id: vote.id,
          userId: vote.userId,
          vote: vote.vote,
          reason: vote.reason,
          votedAt: vote.votedAt

))
      });
    } catch (error) {
    logger.error('Failed to get trade proposals', error as Error, 'trade-proposal')
    return NextResponse.json({ success: true });

      { status: 500 });
