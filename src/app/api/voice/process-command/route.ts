import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Player {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  projectedPoints: number;
  status: 'ACTIVE' | 'INJURED' | 'QUESTIONABLE' | 'OUT';
}

interface VoiceCommandRequest {
  command: string;
  confidence: number;
  roster: Player[];
  currentLineup: Player[];
  leagueId: string;
  userId: string;
}

interface CommandResult {
  success: boolean;
  action: string;
  response: string;
  newLineup?: Player[];
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: VoiceCommandRequest = await req.json();
    const { command, confidence, roster, currentLineup, leagueId, userId } = body;

    // Minimum confidence threshold
    if (confidence < 0.6) {
      return NextResponse.json({
        success: false,
        error: "I didn't catch that clearly. Please try again.",
        action: "Low confidence"
      });
    }

    const normalizedCommand = command.toLowerCase().trim();
    
    // Parse the voice command and determine action
    const result = await processVoiceCommand(normalizedCommand, roster, currentLineup);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Voice command processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process voice command',
      action: 'System error'
    }, { status: 500 });
  }
}

async function processVoiceCommand(
  command: string, 
  roster: Player[], 
  currentLineup: Player[]
): Promise<CommandResult> {
  
  // Start/Bench player commands
  if (command.includes('start') || command.includes('play')) {
    return handleStartPlayerCommand(command, roster, currentLineup);
  }
  
  if (command.includes('bench') || command.includes('sit')) {
    return handleBenchPlayerCommand(command, roster, currentLineup);
  }
  
  // Lineup optimization
  if (command.includes('optimize') || command.includes('best lineup')) {
    return handleOptimizeCommand(command, roster, currentLineup);
  }
  
  // Player recommendations
  if (command.includes('who should i start') || command.includes('recommend')) {
    return handleRecommendationCommand(command, roster, currentLineup);
  }
  
  // Trade analysis
  if (command.includes('trade')) {
    return handleTradeCommand(command, roster);
  }
  
  // Injury reports
  if (command.includes('injury') || command.includes('hurt')) {
    return handleInjuryCommand(command, roster);
  }
  
  // Weather impact
  if (command.includes('weather')) {
    return handleWeatherCommand(command, roster);
  }
  
  // Player stats/info
  if (command.includes('stats') || command.includes('points') || command.includes('projection')) {
    return handleStatsCommand(command, roster);
  }
  
  // Default response for unrecognized commands
  return {
    success: false,
    action: 'Command not recognized',
    response: "I didn't understand that command. Try saying something like 'start Josh Jacobs' or 'optimize my lineup'.",
    error: 'Unrecognized command pattern'
  };
}

function handleStartPlayerCommand(command: string, roster: Player[], currentLineup: Player[]): CommandResult {
  // Extract player name from command
  const playerName = extractPlayerName(command, roster);
  
  if (!playerName) {
    return {
      success: false,
      action: 'Player not found',
      response: "I couldn't find that player on your roster. Please check the name and try again."
    };
  }
  
  const player = roster.find(p => 
    p.playerName.toLowerCase().includes(playerName.toLowerCase())
  );
  
  if (!player) {
    return {
      success: false,
      action: 'Player not found',
      response: `I couldn't find ${playerName} on your roster.`
    };
  }
  
  // Check if player is already in lineup
  if (currentLineup.find(p => p.playerId === player.playerId)) {
    return {
      success: true,
      action: 'Player already started',
      response: `${player.playerName} is already in your starting lineup.`
    };
  }
  
  // Add player to lineup (basic implementation)
  const newLineup = [...currentLineup, player];
  
  return {
    success: true,
    action: `Started ${player.playerName}`,
    response: `Great choice! I've added ${player.playerName} to your starting lineup. He's projected for ${player.projectedPoints} points.`,
    newLineup
  };
}

function handleBenchPlayerCommand(command: string, roster: Player[], currentLineup: Player[]): CommandResult {
  const playerName = extractPlayerName(command, roster);
  
  if (!playerName) {
    return {
      success: false,
      action: 'Player not found',
      response: "I couldn't identify which player you want to bench."
    };
  }
  
  const player = currentLineup.find(p => 
    p.playerName.toLowerCase().includes(playerName.toLowerCase())
  );
  
  if (!player) {
    return {
      success: false,
      action: 'Player not in lineup',
      response: `${playerName} is not currently in your starting lineup.`
    };
  }
  
  // Remove player from lineup
  const newLineup = currentLineup.filter(p => p.playerId !== player.playerId);
  
  return {
    success: true,
    action: `Benched ${player.playerName}`,
    response: `I've moved ${player.playerName} to your bench. You might want to find a replacement.`,
    newLineup
  };
}

function handleOptimizeCommand(command: string, roster: Player[], currentLineup: Player[]): CommandResult {
  // Simple optimization - select highest projected players
  const optimizedLineup = roster
    .filter(p => p.status === 'ACTIVE')
    .sort((a, b) => b.projectedPoints - a.projectedPoints)
    .slice(0, 9); // Typical lineup size
  
  const totalPoints = optimizedLineup.reduce((sum, p) => sum + p.projectedPoints, 0);
  
  return {
    success: true,
    action: 'Lineup optimized',
    response: `I've optimized your lineup for maximum points! Your new lineup is projected for ${totalPoints.toFixed(1)} points total.`,
    newLineup: optimizedLineup
  };
}

function handleRecommendationCommand(command: string, roster: Player[], currentLineup: Player[]): CommandResult {
  // Extract position if mentioned
  let position = '';
  if (command.includes('quarterback') || command.includes('qb')) position = 'QB';
  else if (command.includes('running back') || command.includes('rb')) position = 'RB';
  else if (command.includes('wide receiver') || command.includes('wr')) position = 'WR';
  else if (command.includes('tight end') || command.includes('te')) position = 'TE';
  else if (command.includes('defense') || command.includes('dst')) position = 'DEF';
  else if (command.includes('kicker') || command.includes('k')) position = 'K';
  
  const availablePlayers = roster.filter(p => 
    p.status === 'ACTIVE' && 
    (position === '' || p.position === position) &&
    !currentLineup.find(lp => lp.playerId === p.playerId)
  );
  
  if (availablePlayers.length === 0) {
    return {
      success: true,
      action: 'No recommendations available',
      response: position 
        ? `You don't have any available ${position} players to start.`
        : "All your best players are already in your lineup!"
    };
  }
  
  // Recommend highest projected player
  const recommended = availablePlayers.sort((a, b) => b.projectedPoints - a.projectedPoints)[0];
  
  return {
    success: true,
    action: `Recommended ${recommended.playerName}`,
    response: `I recommend starting ${recommended.playerName} at ${recommended.position}. He's projected for ${recommended.projectedPoints} points this week.`
  };
}

function handleTradeCommand(command: string, roster: Player[]): CommandResult {
  return {
    success: true,
    action: 'Trade analysis available',
    response: "For detailed trade analysis, please use the Advanced Trade Analyzer. I can help you evaluate potential trades there."
  };
}

function handleInjuryCommand(command: string, roster: Player[]): CommandResult {
  const injuredPlayers = roster.filter(p => 
    p.status === 'INJURED' || p.status === 'QUESTIONABLE' || p.status === 'OUT'
  );
  
  if (injuredPlayers.length === 0) {
    return {
      success: true,
      action: 'No injuries reported',
      response: "Good news! None of your players have injury concerns this week."
    };
  }
  
  const injuryReport = injuredPlayers.map(p => 
    `${p.playerName} is ${p.status.toLowerCase()}`
  ).join(', ');
  
  return {
    success: true,
    action: 'Injury report generated',
    response: `Here's your injury report: ${injuryReport}. Consider checking the injury predictor for more details.`
  };
}

function handleWeatherCommand(command: string, roster: Player[]): CommandResult {
  return {
    success: true,
    action: 'Weather analysis available',
    response: "For detailed weather impact analysis, please check the Weather Impact Analyzer. It will show how conditions affect your players' projections."
  };
}

function handleStatsCommand(command: string, roster: Player[]): CommandResult {
  const playerName = extractPlayerName(command, roster);
  
  if (!playerName) {
    return {
      success: false,
      action: 'Player not specified',
      response: "Which player's stats would you like to know about?"
    };
  }
  
  const player = roster.find(p => 
    p.playerName.toLowerCase().includes(playerName.toLowerCase())
  );
  
  if (!player) {
    return {
      success: false,
      action: 'Player not found',
      response: `I couldn't find ${playerName} on your roster.`
    };
  }
  
  return {
    success: true,
    action: `Stats for ${player.playerName}`,
    response: `${player.playerName} plays ${player.position} for ${player.team} and is projected for ${player.projectedPoints} points this week. His status is ${player.status.toLowerCase()}.`
  };
}

function extractPlayerName(command: string, roster: Player[]): string | null {
  // Try to find player names mentioned in the command
  for (const player of roster) {
    const firstName = player.playerName.split(' ')[0].toLowerCase();
    const lastName = player.playerName.split(' ').slice(1).join(' ').toLowerCase();
    const fullName = player.playerName.toLowerCase();
    
    if (command.includes(fullName) || 
        command.includes(firstName) || 
        (lastName && command.includes(lastName))) {
      return player.playerName;
    }
  }
  
  return null;
}