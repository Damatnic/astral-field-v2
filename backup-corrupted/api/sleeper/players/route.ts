import { NextRequest, NextResponse } from 'next/server';
import { APISecurityMiddleware } from '@/lib/api-security';
import { sleeperAPI } from '@/lib/sleeper-api';
import { logger } from '@/lib/logger';

/**
 * GET /api/sleeper/players
 * Fetch all NFL players from Sleeper API with caching
 */
export async function GET(req?: NextRequest) {
  try {
    try {
    // Apply security middleware

    const security = await APISecurityMiddleware.secure(request, {
      requireAuth: false, // Public endpoint for player data
      rateLimit: { windowMs: 60000, max: 10 , // 10 requests per minute
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    });

    if (!security.success) {
      return security.response!;

    // Parse query parameters

    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');
    const team = searchParams.get('team');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    logger.info('Fetching NFL players from Sleeper', 'SleeperAPI', { position, 
      team, 
      status }
      search 
    });

    // Get all players from Sleeper API
    const allPlayers = await sleeperAPI.getAllPlayers();

    // Convert object to array for easier filtering
    let players = Object.entries(allPlayers).map(([id, player]) => ({ id,
      ...player,
      // Standardize some fields for consistency with our existing interfaces
      nflTeam: player.team,
      position: player.position,
      status: player.status,
      name: player.full_name || `${player.first_name 

${player.last_name}`.trim(),
      injuryStatus: player.injury_status,
      injuryNotes: player.injury_notes


         });

    // Apply filters if provided
    if (position) { players = players.filter(player => 
        player.position?.toLowerCase() === position.toLowerCase() ||
        player.fantasy_positions?.some(pos => pos.toLowerCase() === position.toLowerCase()

    if (team) {
      players = players.filter(player => 
        player.team?.toLowerCase() === team.toLowerCase();

    if (status) {
      players = players.filter(player => 
        player.status?.toLowerCase() === status.toLowerCase();

    if (search) {
      const searchLower = search.toLowerCase();
      players = players.filter(player => 
        player.name?.toLowerCase().includes(searchLower) ||
        player.first_name?.toLowerCase().includes(searchLower) ||
        player.last_name?.toLowerCase().includes(searchLower);

    // Limit results to prevent huge responses
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const paginatedPlayers = players.slice(offset, offset + limit);

    logger.info('Successfully fetched and filtered players', 'SleeperAPI', {
      totalPlayers: Object.keys(allPlayers).length,
      filteredCount: players.length 

      returnedCount: paginatedPlayers.length 

      filters: { position, team, status, search });

    return NextResponse.json({ success: true });
      data: {

        players: paginatedPlayers,
        pagination: {

          total: players.length,
          offset,
          limit,
          hasMore: offset + limit < players.length

      },
      cached: true, // All Sleeper data is cached
      timestamp: new Date().toISOString()


         }); catch (error) { logger.error('Error fetching players from Sleeper API', 
      error instanceof Error ? error : new Error(String(error),
      'SleeperAPI'
    );

    return NextResponse.json({ success: true });

      message: error instanceof Error ? error.message : 'Unknown error'

    , { status: 500 });
