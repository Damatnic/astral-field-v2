import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';

// Use simplified auth when database is not available
const useSimpleAuth = process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL;

// Simple matchup data for the D'Amato Dynasty League
const DYNASTY_MATCHUPS = {
  15: [ // Week 15 - Playoffs Round 1
    {
      id: 'playoff-1-1',
      week: 15,
      homeTeam: {
        id: '2',
        name: 'McCaigue Mayhem',
        owner: 'Jack McCaigue',
        score: 127.4,
        projectedScore: 125.2
      },
      awayTeam: {
        id: '1',
        name: 'D\'Amato Dynasty',
        owner: 'Nicholas D\'Amato',
        score: 134.8,
        projectedScore: 128.6
      },
      status: 'completed' as const,
      isPlayoffs: true,
      isChampionship: false
    },
    {
      id: 'playoff-1-2',
      week: 15,
      homeTeam: {
        id: '4',
        name: 'Renee\'s Reign',
        owner: 'Renee McCaigue',
        score: 142.1,
        projectedScore: 138.4
      },
      awayTeam: {
        id: '3',
        name: 'Larry\'s Legends',
        owner: 'Larry McCaigue',
        score: 156.3,
        projectedScore: 149.7
      },
      status: 'completed' as const,
      isPlayoffs: true,
      isChampionship: false
    },
    {
      id: 'playoff-1-3',
      week: 15,
      homeTeam: {
        id: '9',
        name: 'Minor Miracles',
        owner: 'Cason Minor',
        score: 118.7,
        projectedScore: 121.5
      },
      awayTeam: {
        id: '8',
        name: 'Lorbecki Lions',
        owner: 'Kaity Lorbecki',
        score: 109.2,
        projectedScore: 115.8
      },
      status: 'completed' as const,
      isPlayoffs: true,
      isChampionship: false
    },
    {
      id: 'playoff-1-4',
      week: 15,
      homeTeam: {
        id: '10',
        name: 'Bergum Blitz',
        owner: 'Brittany Bergum',
        score: 98.4,
        projectedScore: 102.1
      },
      awayTeam: {
        id: '6',
        name: 'Kornbeck Crushers',
        owner: 'Jon Kornbeck',
        score: 143.6,
        projectedScore: 136.9
      },
      status: 'completed' as const,
      isPlayoffs: true,
      isChampionship: false
    }
  ],
  16: [ // Week 16 - Playoffs Semifinals
    {
      id: 'playoff-2-1',
      week: 16,
      homeTeam: {
        id: '3',
        name: 'Larry\'s Legends',
        owner: 'Larry McCaigue',
        score: 0,
        projectedScore: 145.2
      },
      awayTeam: {
        id: '1',
        name: 'D\'Amato Dynasty',
        owner: 'Nicholas D\'Amato',
        score: 0,
        projectedScore: 131.8
      },
      status: 'scheduled' as const,
      isPlayoffs: true,
      isChampionship: false
    },
    {
      id: 'playoff-2-2',
      week: 16,
      homeTeam: {
        id: '6',
        name: 'Kornbeck Crushers',
        owner: 'Jon Kornbeck',
        score: 0,
        projectedScore: 138.4
      },
      awayTeam: {
        id: '9',
        name: 'Minor Miracles',
        owner: 'Cason Minor',
        score: 0,
        projectedScore: 119.7
      },
      status: 'scheduled' as const,
      isPlayoffs: true,
      isChampionship: false
    }
  ],
  17: [ // Week 17 - Championship
    {
      id: 'championship',
      week: 17,
      homeTeam: {
        id: 'tbd1',
        name: 'TBD - Winner SF1',
        owner: 'TBD',
        score: 0,
        projectedScore: 140.0
      },
      awayTeam: {
        id: 'tbd2',
        name: 'TBD - Winner SF2',
        owner: 'TBD',
        score: 0,
        projectedScore: 135.0
      },
      status: 'scheduled' as const,
      isPlayoffs: true,
      isChampionship: true
    }
  ],
  14: [ // Week 14 - Regular Season Finale
    {
      id: 'reg-14-1',
      week: 14,
      homeTeam: {
        id: '1',
        name: 'D\'Amato Dynasty',
        owner: 'Nicholas D\'Amato',
        score: 123.7,
        projectedScore: 125.4
      },
      awayTeam: {
        id: '2',
        name: 'McCaigue Mayhem',
        owner: 'Jack McCaigue',
        score: 98.2,
        projectedScore: 108.6
      },
      status: 'completed' as const,
      isPlayoffs: false,
      isChampionship: false
    },
    {
      id: 'reg-14-2',
      week: 14,
      homeTeam: {
        id: '3',
        name: 'Larry\'s Legends',
        owner: 'Larry McCaigue',
        score: 167.3,
        projectedScore: 149.1
      },
      awayTeam: {
        id: '4',
        name: 'Renee\'s Reign',
        owner: 'Renee McCaigue',
        score: 134.8,
        projectedScore: 138.2
      },
      status: 'completed' as const,
      isPlayoffs: false,
      isChampionship: false
    },
    {
      id: 'reg-14-3',
      week: 14,
      homeTeam: {
        id: '5',
        name: 'Hartley Heroes',
        owner: 'Nick Hartley',
        score: 109.4,
        projectedScore: 115.7
      },
      awayTeam: {
        id: '6',
        name: 'Kornbeck Crushers',
        owner: 'Jon Kornbeck',
        score: 156.9,
        projectedScore: 142.3
      },
      status: 'completed' as const,
      isPlayoffs: false,
      isChampionship: false
    },
    {
      id: 'reg-14-4',
      week: 14,
      homeTeam: {
        id: '7',
        name: 'Jarvey\'s Juggernauts',
        owner: 'David Jarvey',
        score: 132.1,
        projectedScore: 128.9
      },
      awayTeam: {
        id: '8',
        name: 'Lorbecki Lions',
        owner: 'Kaity Lorbecki',
        score: 87.6,
        projectedScore: 95.4
      },
      status: 'completed' as const,
      isPlayoffs: false,
      isChampionship: false
    },
    {
      id: 'reg-14-5',
      week: 14,
      homeTeam: {
        id: '9',
        name: 'Minor Miracles',
        owner: 'Cason Minor',
        score: 145.2,
        projectedScore: 138.7
      },
      awayTeam: {
        id: '10',
        name: 'Bergum Blitz',
        owner: 'Brittany Bergum',
        score: 118.9,
        projectedScore: 122.4
      },
      status: 'completed' as const,
      isPlayoffs: false,
      isChampionship: false
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || '15');

    // Validate week
    if (week < 1 || week > 17) {
      return NextResponse.json(
        { success: false, message: 'Invalid week number' },
        { status: 400 }
      );
    }

    // Get matchups for the requested week
    const matchups = DYNASTY_MATCHUPS[week as keyof typeof DYNASTY_MATCHUPS] || [];

    return NextResponse.json({
      success: true,
      data: matchups,
      week,
      isPlayoffs: week >= 15,
      message: `Matchups for Week ${week}`
    });

  } catch (error) {
    handleComponentError(error as Error, 'matchups-api');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}