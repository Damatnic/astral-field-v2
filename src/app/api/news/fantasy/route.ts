import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Fantasy News API
 * GET /api/news/fantasy - Get fantasy football relevant news
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const position = searchParams.get('position');
    const team = searchParams.get('team');
    const category = searchParams.get('category'); // injury, trade, waiver, breaking, analysis
    const limit = parseInt(searchParams.get('limit') || '20');
    const since = searchParams.get('since'); // ISO date string
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true';

    // Build where clause for news
    const whereClause: any = {};

    if (playerId) {
      whereClause.playerId = playerId;
    }

    if (since) {
      whereClause.publishedAt = {
        gte: new Date(since)
      };
    }

    // Filter by category using headline keywords
    if (category) {
      const categoryKeywords = getCategoryKeywords(category);
      whereClause.headline = {
        contains: categoryKeywords.join('|'),
        mode: 'insensitive'
      };
    }

    // Get player news
    let newsQuery: any = {
      where: whereClause,
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true,
            status: true,
            injuryStatus: true,
            isFantasyRelevant: true,
            adp: true,
            rank: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: limit
    };

    // Apply position/team filters through player relation
    if (position || team) {
      newsQuery.where.player = {};
      if (position) newsQuery.where.player.position = position;
      if (team) newsQuery.where.player.nflTeam = team;
    }

    const playerNews = await prisma.playerNews.findMany(newsQuery);

    // Transform news data with fantasy analysis
    const fantasyNews = await Promise.all(
      playerNews.map(async (news) => {
        const analysis = includeAnalysis ? await generateFantasyAnalysis(news, news.player) : null;
        
        return {
          id: news.id,
          headline: news.headline,
          body: news.body,
          source: news.source,
          url: news.url,
          publishedAt: news.publishedAt,
          
          // Player context
          player: {
            id: news.player.id,
            name: news.player.name,
            position: news.player.position,
            team: news.player.nflTeam,
            status: news.player.status,
            injuryStatus: news.player.injuryStatus,
            fantasyRelevant: news.player.isFantasyRelevant,
            adp: news.player.adp,
            rank: news.player.rank
          },

          // Fantasy impact analysis
          fantasyImpact: {
            category: categorizeNews(news.headline, news.body),
            severity: getImpactSeverity(news.headline, news.body, news.player),
            actionable: isActionableNews(news.headline, news.body),
            timeframe: getTimeframe(news.headline, news.body),
            confidence: getConfidenceLevel(news.source)
          },

          // AI-generated analysis if requested
          ...(analysis && { analysis })
        };
      })
    );

    // Generate trending topics and insights
    const insights = await generateNewsInsights(fantasyNews);

    // Get breaking news (last 2 hours)
    const breakingNews = fantasyNews.filter(news => 
      new Date(news.publishedAt).getTime() > Date.now() - (2 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      success: true,
      data: {
        news: fantasyNews,
        insights: insights,
        breaking: breakingNews,
        summary: {
          total: fantasyNews.length,
          breaking: breakingNews.length,
          byCategory: getCategoryCounts(fantasyNews),
          byImpact: getImpactCounts(fantasyNews),
          lastUpdated: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Fantasy news API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch fantasy news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Add fantasy news
 * POST /api/news/fantasy - Add or update fantasy news
 */
export async function POST(request: Request) {
  try {
    const { 
      playerId, 
      headline, 
      body, 
      source, 
      url, 
      publishedAt,
      category,
      impact 
    } = await request.json();

    if (!playerId || !headline || !body) {
      return NextResponse.json(
        { success: false, error: 'Player ID, headline, and body are required' },
        { status: 400 }
      );
    }

    // Check if news already exists
    const existingNews = await prisma.playerNews.findFirst({
      where: {
        playerId: playerId,
        headline: headline,
        source: source
      }
    });

    if (existingNews) {
      return NextResponse.json(
        { success: false, error: 'News article already exists' },
        { status: 409 }
      );
    }

    // Create new news entry
    const newNews = await prisma.playerNews.create({
      data: {
        playerId: playerId,
        headline: headline,
        body: body,
        source: source || 'Manual Entry',
        url: url,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date()
      },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            position: true,
            nflTeam: true
          }
        }
      }
    });

    // Update player's last updated timestamp
    await prisma.player.update({
      where: { id: playerId },
      data: { lastUpdated: new Date() }
    });

    console.log(`New fantasy news added for ${newNews.player.name}: ${headline}`);

    return NextResponse.json({
      success: true,
      message: `News added for ${newNews.player.name}`,
      data: {
        id: newNews.id,
        headline: newNews.headline,
        player: newNews.player,
        publishedAt: newNews.publishedAt
      }
    });

  } catch (error) {
    console.error('Fantasy news creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add fantasy news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

function getCategoryKeywords(category: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    injury: ['injury', 'injured', 'hurt', 'pain', 'questionable', 'doubtful', 'out', 'ir'],
    trade: ['trade', 'traded', 'acquired', 'deal', 'transaction'],
    waiver: ['waiver', 'pickup', 'add', 'drop', 'claim'],
    breaking: ['breaking', 'urgent', 'alert', 'update'],
    analysis: ['outlook', 'analysis', 'preview', 'projection', 'forecast']
  };
  
  return keywordMap[category] || [];
}

function categorizeNews(headline: string, body: string): string {
  const text = `${headline} ${body}`.toLowerCase();
  
  if (text.includes('injur') || text.includes('hurt') || text.includes('questionable')) {
    return 'injury';
  }
  if (text.includes('trade') || text.includes('deal') || text.includes('acquired')) {
    return 'trade';
  }
  if (text.includes('waiver') || text.includes('pickup')) {
    return 'waiver';
  }
  if (text.includes('breaking') || text.includes('alert')) {
    return 'breaking';
  }
  if (text.includes('outlook') || text.includes('analysis') || text.includes('projection')) {
    return 'analysis';
  }
  
  return 'general';
}

function getImpactSeverity(headline: string, body: string, player: any): 'low' | 'medium' | 'high' {
  const text = `${headline} ${body}`.toLowerCase();
  
  // High impact indicators
  if (text.includes('out') || text.includes('ir') || text.includes('season') || 
      text.includes('surgery') || text.includes('traded')) {
    return 'high';
  }
  
  // Medium impact indicators
  if (text.includes('doubtful') || text.includes('questionable') || 
      text.includes('limited') || text.includes('concern')) {
    return 'medium';
  }
  
  // Consider player fantasy relevance
  if (player.isFantasyRelevant && (player.adp || 0) < 100) {
    return 'medium';
  }
  
  return 'low';
}

function isActionableNews(headline: string, body: string): boolean {
  const text = `${headline} ${body}`.toLowerCase();
  
  // Actionable keywords
  const actionableKeywords = [
    'pickup', 'add', 'drop', 'start', 'sit', 'trade', 'claim',
    'out', 'questionable', 'doubtful', 'opportunity'
  ];
  
  return actionableKeywords.some(keyword => text.includes(keyword));
}

function getTimeframe(headline: string, body: string): string {
  const text = `${headline} ${body}`.toLowerCase();
  
  if (text.includes('season') || text.includes('year')) {
    return 'season';
  }
  if (text.includes('week') || text.includes('multiple games')) {
    return 'weeks';
  }
  if (text.includes('game') || text.includes('sunday')) {
    return 'game';
  }
  if (text.includes('immediate') || text.includes('now')) {
    return 'immediate';
  }
  
  return 'unknown';
}

function getConfidenceLevel(source: string): number {
  const sourceReliability: { [key: string]: number } = {
    'ESPN': 0.9,
    'NFL.com': 0.9,
    'Yahoo Sports': 0.85,
    'The Athletic': 0.85,
    'ProFootballTalk': 0.8,
    'Rotoworld': 0.8,
    'FantasyPros': 0.75,
    'Twitter': 0.6,
    'Manual Entry': 0.7
  };
  
  return sourceReliability[source] || 0.7;
}

async function generateFantasyAnalysis(news: any, player: any) {
  // This would integrate with AI service for analysis
  // For now, return structured analysis based on keywords
  
  const category = categorizeNews(news.headline, news.body);
  const impact = getImpactSeverity(news.headline, news.body, player);
  
  return {
    summary: generateSummary(news.headline, news.body, player),
    recommendation: generateRecommendation(category, impact, player),
    keyPoints: extractKeyPoints(news.body),
    fantasyValue: calculateFantasyValue(category, impact, player)
  };
}

function generateSummary(headline: string, body: string, player: any): string {
  return `${player.name} (${player.position}, ${player.team}): ${headline}. This development may impact fantasy performance.`;
}

function generateRecommendation(category: string, impact: string, player: any): string {
  if (impact === 'high') {
    return category === 'injury' ? 'Consider benching or finding replacement' : 'Monitor situation closely';
  }
  if (impact === 'medium') {
    return 'Proceed with caution in lineup decisions';
  }
  return 'Continue monitoring but minimal immediate impact expected';
}

function extractKeyPoints(body: string): string[] {
  // Simple extraction - in production this would use NLP
  const sentences = body.split('.').filter(s => s.trim().length > 10);
  return sentences.slice(0, 3).map(s => s.trim());
}

function calculateFantasyValue(category: string, impact: string, player: any): number {
  let baseValue = player.adp ? Math.max(0, 200 - player.adp) : 50;
  
  if (impact === 'high') {
    baseValue *= category === 'injury' ? 0.3 : 1.2;
  } else if (impact === 'medium') {
    baseValue *= 0.8;
  }
  
  return Math.round(baseValue);
}

async function generateNewsInsights(fantasyNews: any[]) {
  const trending = {};
  const categories = getCategoryCounts(fantasyNews);
  
  return {
    trending: {
      players: getTrendingPlayers(fantasyNews),
      topics: getTrendingTopics(fantasyNews),
      teams: getTrendingTeams(fantasyNews)
    },
    categories: categories,
    actionable: fantasyNews.filter(news => news.fantasyImpact.actionable).length,
    highImpact: fantasyNews.filter(news => news.fantasyImpact.severity === 'high').length
  };
}

function getCategoryCounts(fantasyNews: any[]) {
  return fantasyNews.reduce((acc, news) => {
    const category = news.fantasyImpact.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
}

function getImpactCounts(fantasyNews: any[]) {
  return fantasyNews.reduce((acc, news) => {
    const impact = news.fantasyImpact.severity;
    acc[impact] = (acc[impact] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
}

function getTrendingPlayers(fantasyNews: any[]) {
  const playerCounts = fantasyNews.reduce((acc, news) => {
    const player = news.player.name;
    acc[player] = (acc[player] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  return Object.entries(playerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, mentions: count }));
}

function getTrendingTopics(fantasyNews: any[]) {
  // Extract common keywords from headlines
  const words = fantasyNews
    .flatMap(news => news.headline.toLowerCase().split(' '))
    .filter(word => word.length > 3 && !['the', 'and', 'for', 'with'].includes(word));
  
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  return Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, mentions: count }));
}

function getTrendingTeams(fantasyNews: any[]) {
  const teamCounts = fantasyNews.reduce((acc, news) => {
    const team = news.player.team;
    if (team) {
      acc[team] = (acc[team] || 0) + 1;
    }
    return acc;
  }, {} as { [key: string]: number });
  
  return Object.entries(teamCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([team, count]) => ({ team, mentions: count }));
}