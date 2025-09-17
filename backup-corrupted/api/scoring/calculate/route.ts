import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ScoringExtendedSchema, validateSecureRequest } from '@/lib/validation/api-schemas';
// NFLDataService imported but not used in current implementation

interface ScoringSettings { passing: {
    passingYards: number; // Points per passing yard
    passingTDs: number;   // Points per passing TD
    interceptions: number; // Points per interception (negative)
    passCompletions?: number; // PPR for completions
    pass300YardBonus?: number; // Bonus for 300+ yards

;
  rushing: {
    rushingYards: number; // Points per rushing yard
    rushingTDs: number;   // Points per rushing TD
    rush100YardBonus?: number; // Bonus for 100+ yards

  };
  receiving: { receivingYards: number; // Points per receiving yard
    receptions: number;      // Points per reception (PPR)
    receivingTDs: number;    // Points per receiving TD
    rec100YardBonus?: number; // Bonus for 100+ yards

;
  kicking: {
    extraPoints: number;     // Points per XP
    fieldGoals: {
      under40: number;       // FG under 40 yards
      "40to49": number;        // FG 40-49 yards
      "50plus": number;        // FG 50+ yards
      missed: number;        // Missed FG (negative)

    };
  };
  defense: { sacks: number;
    interceptions: number;
    fumblesRecovered: number;
    safeties: number;
    touchdowns: number;
    blockedKicks: number;
    pointsAllowed: {
      "0": number;            // Shutout bonus
      "1to6": number;         // 1-6 points allowed
      "7to13": number;        // 7-13 points allowed
      "14to20": number;       // 14-20 points allowed
      "21to27": number;       // 21-27 points allowed
      "28to34": number;       // 28-34 points allowed
      "35plus": number;       // 35+ points allowed

;
    yardsAllowed: {
      under100: number;     // Under 100 yards allowed
      "100to199": number;     // 100-199 yards allowed
      "200to299": number;     // 200-299 yards allowed
      "300to399": number;     // 300-399 yards allowed
      "400to449": number;     // 400-449 yards allowed
      "450plus": number;      // 450+ yards allowed

    };
  };
  misc: { fumbles: number;         // Fumbles lost (negative)
    twoPointConversions: number; // 2-point conversions
    kickReturnTDs: number;   // Kick return TDs
    puntReturnTDs: number;   // Punt return TDs

;

interface PlayerStats {
  playerId: string;
  passing?: {
    attempts: number;
    completions: number;
    yards: number;
    touchdowns: number;
    interceptions: number;

  };
  rushing?: { attempts: number;
    yards: number;
    touchdowns: number;

;
  receiving?: {
    targets: number;
    receptions: number;
    yards: number;
    touchdowns: number;

  };
  kicking?: { extraPointAttempts: number;
    extraPointMade: number;
    fieldGoalAttempts: number;
    fieldGoalMade: number;
    fieldGoalYards: number[];

;
  defense?: {
    sacks: number;
    interceptions: number;
    fumblesRecovered: number;
    safeties: number;
    touchdowns: number;
    blockedKicks: number;
    pointsAllowed: number;
    yardsAllowed: number;

  };
  misc?: { fumblesLost: number;
    twoPointConversions: number;
    kickReturnTDs: number;
    puntReturnTDs: number;

;

interface CalculateScoreRequest {
  playerId: string;
  stats: PlayerStats;
  scoringSettings?: Partial<ScoringSettings>;
  week?: number;
  season?: number;


interface CalculateScoreResponse {
  playerId: string;
  totalPoints: number;
  breakdown: {
    passing: number;
    rushing: number;
    receiving: number;
    kicking: number;
    defense: number;
    misc: number;
    bonuses: number;

  };
  details: Array<{ category: string;
    statType: string;
    value: number;
    points: number;
    calculation: string;

>;

/**
 * POST /api/scoring/calculate
 * Calculate fantasy points for given player stats
 */
export async function POST(req?: NextRequest) {
  try {
    const startTime = Date.now();
  
  try {
    // Authentication check
    const session = await getSession();
    if (!session?.user) {

      logger.warn('Unauthorized score calculation request', 'ScoreCalculateAPI');
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required' },
        { status: 401  

);

    // Validate request data with security measures
    const validation = await validateSecureRequest(request, ScoringExtendedSchema.calculate.POST, {
      maxSize: 100 * 1024, // 100KB limit for scoring calculations
      allowedMethods: ['POST']


        });

    if (!validation.success) { return NextResponse.json(

        { error: validation.error  

        { status: validation.status || 400 

      );

    const { playerId, stats, week, season, scoringType } = validation.data;

    logger.info('Calculating fantasy score', 'ScoreCalculateAPI', { playerId,
      userId: session.user.sub,
      week }
      season
    });

    // Get default scoring settings based on scoring type
    const defaultSettings = getDefaultScoringSettings();
    const presets = getScoringPresets();
    const scoringKey = scoringType ? 
      (scoringType.charAt(0).toUpperCase() + scoringType.slice(1)) : 
      'Standard';
    const finalSettings = presets[scoringKey as keyof typeof presets] || defaultSettings;

    // Convert stats to PlayerStats format
    const playerStats: PlayerStats = { playerId: playerId 

      ...stats as Record<string, any>
    };
    
    // Calculate points
    const result = calculateFantasyPoints(playerStats, finalSettings);

    logger.info('Fantasy score calculated', 'ScoreCalculateAPI', { playerId,
      totalPoints: result.totalPoints,
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(result); catch (error) {
    logger.error('Error calculating fantasy score', error as Error, 'ScoreCalculateAPI', {
      processingTime: Date.now() - startTime


         });

    return NextResponse.json(

        error: 'Failed to calculate fantasy score' 

        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined

      },
      { status: 500  

);


/**
 * GET /api/scoring/calculate/settings
 * Get available scoring settings and defaults
 */
export async function GET(req?: NextRequest) {
  try {
    try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required' },
        { status: 401  

);

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    let scoringSettings = getDefaultScoringSettings();

    // If league ID provided, get league-specific settings
    if (leagueId) { const league = await prisma.league.findFirst({
        where: {

          id: leagueId,
          members: {
            some: {
              userId: session.user.sub


        include: {
          settings: true


      });

      if (league?.settings?.scoringSystem) { scoringSettings = mergeScoringSettings(
          scoringSettings, 
          league.settings.scoringSystem as Partial<ScoringSettings>
        );


    return NextResponse.json({ success: true });


)); catch (error) {
    logger.error('Error fetching scoring settings', error as Error, 'ScoreCalculateAPI');
    return NextResponse.json({ success: true });

      { status: 500 });


/**
 * Calculate fantasy points based on stats and scoring settings
 */
function calculateFantasyPoints(
  stats: PlayerStats, 
  settings: ScoringSettings
): CalculateScoreResponse { const breakdown = {

    passing: 0,
    rushing: 0,
    receiving: 0,
    kicking: 0,
    defense: 0,
    misc: 0,
    bonuses: 0

;

  const details: Array<{
    category: string;
    statType: string;
    value: number;
    points: number;
    calculation: string;

  }> = [];

  // Passing stats
  if (stats.passing) {

    const { yards, touchdowns, interceptions, completions } = stats.passing;
    
    // Passing yards
    if (yards > 0) { const points = yards * settings.passing.passingYards;
      breakdown.passing += points;
      details.push({
        category: 'Passing',
        statType: 'Yards',
        value: yards,
        points }
        calculation: `${yards 

× ${settings.passing.passingYards} = ${points.toFixed(2)}`
      });

    // Passing TDs
    if (touchdowns > 0) { const points = touchdowns * settings.passing.passingTDs;
      breakdown.passing += points;
      details.push({
        category: 'Passing',
        statType: 'Touchdowns',
        value: touchdowns,
        points }
        calculation: `${touchdowns 

× ${settings.passing.passingTDs} = ${points.toFixed(2)}`
      });

    // Interceptions
    if (interceptions > 0) { const points = interceptions * settings.passing.interceptions;
      breakdown.passing += points;
      details.push({
        category: 'Passing',
        statType: 'Interceptions',
        value: interceptions,
        points }
        calculation: `${interceptions 

× ${settings.passing.interceptions} = ${points.toFixed(2)}`
      });

    // Pass completions (if PPR for completions)
    if (completions > 0 && settings.passing.passCompletions) { const points = completions * settings.passing.passCompletions;
      breakdown.passing += points;
      details.push({
        category: 'Passing',
        statType: 'Completions',
        value: completions,
        points }
        calculation: `${completions 

× ${settings.passing.passCompletions} = ${points.toFixed(2)}`
      });

    // 300+ yard bonus
    if (yards >= 300 && settings.passing.pass300YardBonus) { breakdown.bonuses += settings.passing.pass300YardBonus;
      details.push({
        category: 'Bonuses',
        statType: '300+ Passing Yards',
        value: 1,
        points: settings.passing.pass300YardBonus 

        calculation: `300+ yards bonus = ${settings.passing.pass300YardBonus 

`
      });


  // Rushing stats
  if (stats.rushing) {

    const { yards, touchdowns } = stats.rushing;
    
    // Rushing yards
    if (yards > 0) { const points = yards * settings.rushing.rushingYards;
      breakdown.rushing += points;
      details.push({
        category: 'Rushing',
        statType: 'Yards',
        value: yards,
        points }
        calculation: `${yards 

× ${settings.rushing.rushingYards} = ${points.toFixed(2)}`
      });

    // Rushing TDs
    if (touchdowns > 0) { const points = touchdowns * settings.rushing.rushingTDs;
      breakdown.rushing += points;
      details.push({
        category: 'Rushing',
        statType: 'Touchdowns',
        value: touchdowns,
        points }
        calculation: `${touchdowns 

× ${settings.rushing.rushingTDs} = ${points.toFixed(2)}`
      });

    // 100+ yard bonus
    if (yards >= 100 && settings.rushing.rush100YardBonus) { breakdown.bonuses += settings.rushing.rush100YardBonus;
      details.push({
        category: 'Bonuses',
        statType: '100+ Rushing Yards',
        value: 1,
        points: settings.rushing.rush100YardBonus 

        calculation: `100+ yards bonus = ${settings.rushing.rush100YardBonus 

`
      });


  // Receiving stats
  if (stats.receiving) {

    const { receptions, yards, touchdowns } = stats.receiving;
    
    // Receptions (PPR)
    if (receptions > 0) { const points = receptions * settings.receiving.receptions;
      breakdown.receiving += points;
      details.push({
        category: 'Receiving',
        statType: 'Receptions',
        value: receptions,
        points }
        calculation: `${receptions 

× ${settings.receiving.receptions} = ${points.toFixed(2)}`
      });

    // Receiving yards
    if (yards > 0) { const points = yards * settings.receiving.receivingYards;
      breakdown.receiving += points;
      details.push({
        category: 'Receiving',
        statType: 'Yards',
        value: yards,
        points }
        calculation: `${yards 

× ${settings.receiving.receivingYards} = ${points.toFixed(2)}`
      });

    // Receiving TDs
    if (touchdowns > 0) { const points = touchdowns * settings.receiving.receivingTDs;
      breakdown.receiving += points;
      details.push({
        category: 'Receiving',
        statType: 'Touchdowns',
        value: touchdowns,
        points }
        calculation: `${touchdowns 

× ${settings.receiving.receivingTDs} = ${points.toFixed(2)}`
      });

    // 100+ yard bonus
    if (yards >= 100 && settings.receiving.rec100YardBonus) { breakdown.bonuses += settings.receiving.rec100YardBonus;
      details.push({
        category: 'Bonuses',
        statType: '100+ Receiving Yards',
        value: 1,
        points: settings.receiving.rec100YardBonus 

        calculation: `100+ yards bonus = ${settings.receiving.rec100YardBonus 

`
      });


  // Kicking stats
  if (stats.kicking) {

    const { extraPointMade, fieldGoalMade: _fieldGoalMade, fieldGoalYards } = stats.kicking;
    
    // Extra points
    if (extraPointMade > 0) { const points = extraPointMade * settings.kicking.extraPoints;
      breakdown.kicking += points;
      details.push({
        category: 'Kicking',
        statType: 'Extra Points',
        value: extraPointMade,
        points }
        calculation: `${extraPointMade 

× ${settings.kicking.extraPoints} = ${points.toFixed(2)}`
      });

    // Field goals by distance
    fieldGoalYards.forEach(distance => {
      let points = 0;
      let range = '';
      
      if (distance < 40) {
        points = settings.kicking.fieldGoals.under40;
        range = 'Under 40 yards';

      } else if (distance < 50) {
        points = settings.kicking.fieldGoals["40to49"];
        range = '40-49 yards';

      } else { points = settings.kicking.fieldGoals["50plus"];
        range = '50+ yards';

      breakdown.kicking += points;
      details.push({
        category: 'Kicking',
        statType: `Field Goal (${range,
)`,
        value: distance,
        points }
        calculation: `${distance} yard FG = ${points}`
      });
    });

  // Defense/ST stats
  if (stats.defense) { const { 
      sacks, 
      interceptions, 
      fumblesRecovered: _fumblesRecovered, 
      safeties: _safeties, 
      touchdowns: _touchdowns, 
      blockedKicks: _blockedKicks,
      pointsAllowed,
      yardsAllowed: _yardsAllowed

= stats.defense;

    // Individual defensive stats
    if (sacks > 0) {
      const points = sacks * settings.defense.sacks;
      breakdown.defense += points;
      details.push({
        category: 'Defense',
        statType: 'Sacks',
        value: sacks 

        points }
        calculation: `${sacks} × ${settings.defense.sacks} = ${points.toFixed(2)}`
      });

    if (interceptions > 0) { const points = interceptions * settings.defense.interceptions;
      breakdown.defense += points;
      details.push({
        category: 'Defense',
        statType: 'Interceptions',
        value: interceptions,
        points }
        calculation: `${interceptions 

× ${settings.defense.interceptions} = ${points.toFixed(2)}`
      });

    // Points allowed
    let paPoints = 0;
    if (pointsAllowed === 0) paPoints = settings.defense.pointsAllowed["0"];
    else if (pointsAllowed <= 6) paPoints = settings.defense.pointsAllowed["1to6"];
    else if (pointsAllowed <= 13) paPoints = settings.defense.pointsAllowed["7to13"];
    else if (pointsAllowed <= 20) paPoints = settings.defense.pointsAllowed["14to20"];
    else if (pointsAllowed <= 27) paPoints = settings.defense.pointsAllowed["21to27"];
    else if (pointsAllowed <= 34) paPoints = settings.defense.pointsAllowed["28to34"];
    else paPoints = settings.defense.pointsAllowed["35plus"];

    breakdown.defense += paPoints;
    details.push({ category: 'Defense',
      statType: 'Points Allowed',
      value: pointsAllowed,
      points: paPoints,
      calculation: `${pointsAllowed 

points allowed = ${paPoints}`
    });

  // Miscellaneous stats
  if (stats.misc) { const { fumblesLost, twoPointConversions, kickReturnTDs: _kickReturnTDs, puntReturnTDs: _puntReturnTDs ,
= stats.misc;
    
    if (fumblesLost > 0) {
      const points = fumblesLost * settings.misc.fumbles;
      breakdown.misc += points;
      details.push({
        category: 'Miscellaneous',
        statType: 'Fumbles Lost',
        value: fumblesLost 

        points }
        calculation: `${fumblesLost} × ${settings.misc.fumbles} = ${points.toFixed(2)}`
      });

    if (twoPointConversions > 0) { const points = twoPointConversions * settings.misc.twoPointConversions;
      breakdown.misc += points;
      details.push({
        category: 'Miscellaneous',
        statType: '2-Point Conversions',
        value: twoPointConversions,
        points }
        calculation: `${twoPointConversions 

× ${settings.misc.twoPointConversions} = ${points.toFixed(2)}`
      });


  const totalPoints = Object.values(breakdown).reduce((sum, points) => sum + points, 0);

  return { playerId: stats.playerId,
    totalPoints: Math.round(totalPoints * 100) / 100, // Round to 2 decimal places
    breakdown }
    details
  };

/**
 * Get default scoring settings (standard PPR)
 */
function getDefaultScoringSettings(): ScoringSettings { return {
    passing: {

      passingYards: 0.04,     // 1 point per 25 yards
      passingTDs: 4,          // 4 points per TD
      interceptions: -2,      // -2 points per INT
      passCompletions: 0,     // No PPR for completions
      pass300YardBonus: 2     // 2 point bonus for 300+ yards

    rushing: {

      rushingYards: 0.1,      // 1 point per 10 yards
      rushingTDs: 6,          // 6 points per TD
      rush100YardBonus: 2     // 2 point bonus for 100+ yards

    },
    receiving: { receivingYards: 0.1,    // 1 point per 10 yards
      receptions: 1,          // 1 point per reception (PPR)
      receivingTDs: 6,        // 6 points per TD
      rec100YardBonus: 2      // 2 point bonus for 100+ yards

    kicking: {

      extraPoints: 1,         // 1 point per XP
      fieldGoals: {

        under40: 3,           // 3 points for FG under 40
        "40to49": 4,            // 4 points for FG 40-49
        "50plus": 5,            // 5 points for FG 50+
        missed: -1            // -1 point for missed FG


    },
    defense: { sacks: 1,
      interceptions: 2,
      fumblesRecovered: 2,
      safeties: 2,
      touchdowns: 6,
      blockedKicks: 2 

      pointsAllowed: {

        "0": 10,      // Shutout
        "1to6": 7,       // 1-6 points
        "7to13": 4,       // 7-13 points
        "14to20": 1,      // 14-20 points
        "21to27": 0,      // 21-27 points
        "28to34": -1,     // 28-34 points
        "35plus": -4      // 35+ points
      },
      yardsAllowed: { under100: 5,
        "100to199": 3,
        "200to299": 2,
        "300to399": 0,
        "400to449": -1 }
        "450plus": -3

    },
    misc: { fumbles: -2,
      twoPointConversions: 2,
      kickReturnTDs: 6,
      puntReturnTDs: 6

/**
 * Merge scoring settings with defaults
 */
function mergeScoringSettings(
  defaults: ScoringSettings 

  overrides: Partial<ScoringSettings>
): ScoringSettings {
  return {

    passing: { ...defaults.passing, ...overrides.passing },
    rushing: { ...defaults.rushing, ...overrides.rushing },
    receiving: { ...defaults.receiving, ...overrides.receiving },
    kicking: { ...defaults.kicking, 
      ...overrides.kicking }
      fieldGoals: { ...defaults.kicking.fieldGoals, ...overrides.kicking?.fieldGoals },
    defense: { ...defaults.defense, 
      ...overrides.defense }
      pointsAllowed: { ...defaults.defense.pointsAllowed, ...overrides.defense?.pointsAllowed },
      yardsAllowed: { ...defaults.defense.yardsAllowed, ...overrides.defense?.yardsAllowed },
    misc: { ...defaults.misc, ...overrides.misc };

/**
 * Get common scoring presets
 */
function getScoringPresets() { return {
    'Standard': getDefaultScoringSettings(),
    'Half PPR': {
      ...getDefaultScoringSettings(),
      receiving: {

        ...getDefaultScoringSettings().receiving,
        receptions: 0.5

    'Non-PPR': {
      ...getDefaultScoringSettings(),
      receiving: {

        ...getDefaultScoringSettings().receiving }
        receptions: 0



  };
