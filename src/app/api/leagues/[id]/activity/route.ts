import { NextRequest, NextResponse } from 'next/server';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueIdentifier = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // trade, waiver, matchup, injury, milestone

    // Mock activity data for D'Amato Dynasty League
    const mockActivities = [
      {
        id: 'trade-1',
        type: 'trade',
        title: 'Trade Proposal',
        description: '3 players involved',
        timestamp: formatTimestamp(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
        user: {
          name: 'Nicholas D\'Amato',
          team: 'D\'Amato Dynasty',
          avatar: '👑'
        },
        relatedUser: {
          name: 'Nick Hartley',
          team: 'Hartley Hawks',
          avatar: '🦅'
        },
        metadata: {
          players: ['Christian McCaffrey', 'Travis Kelce', '2024 1st Round Pick'],
          status: 'pending'
        },
        reactions: {
          likes: 5,
          comments: 2,
          isLiked: false
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'waiver-1',
        type: 'waiver',
        title: 'Waiver Claim Successful',
        description: 'Acquired Josh Jacobs',
        timestamp: formatTimestamp(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
        user: {
          name: 'Jon Kornbeck',
          team: 'Kornbeck Crushers',
          avatar: '💪'
        },
        metadata: {
          players: ['Josh Jacobs'],
          priority: 3,
          successful: true
        },
        reactions: {
          likes: 8,
          comments: 1,
          isLiked: true
        },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        id: 'matchup-1',
        type: 'matchup',
        title: 'Blowout Victory',
        description: 'Week 2 matchup result',
        timestamp: formatTimestamp(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 1 day ago
        user: {
          name: 'Brittany Bergum',
          team: 'Bergum Bombers',
          avatar: '💥'
        },
        relatedUser: {
          name: 'Jack McCaigue',
          team: 'McCaigue Maulers',
          avatar: '🔨'
        },
        metadata: {
          score: '156.8 - 89.2',
          week: 2
        },
        reactions: {
          likes: 12,
          comments: 4,
          isLiked: false
        },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: 'milestone-1',
        type: 'milestone',
        title: 'Weekly High Score',
        description: 'Outstanding fantasy performance',
        timestamp: formatTimestamp(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 1 day ago
        user: {
          name: 'Larry McCaigue',
          team: 'McCaigue Sr. Squad',
          avatar: '🏆'
        },
        metadata: {
          achievement: 'Highest Week 2 score: 178.6 points'
        },
        reactions: {
          likes: 15,
          comments: 6,
          isLiked: true
        },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: 'injury-1',
        type: 'injury',
        title: 'Player Status Update',
        description: 'Saquon Barkley injury report',
        timestamp: formatTimestamp(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
        user: {
          name: 'Cason Minor',
          team: 'Minor Threat',
          avatar: '⚡'
        },
        metadata: {
          players: ['Saquon Barkley'],
          injury: {
            player: 'Saquon Barkley',
            status: 'Questionable - Ankle',
            impact: 'medium' as const
          }
        },
        reactions: {
          likes: 3,
          comments: 2,
          isLiked: false
        },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: 'waiver-2',
        type: 'waiver',
        title: 'Waiver Claim Failed',
        description: 'Missed out on Tyler Boyd',
        timestamp: formatTimestamp(new Date(Date.now() - 12 * 60 * 60 * 1000)), // 12 hours ago
        user: {
          name: 'Renee McCaigue',
          team: 'McCaigue Matriarchs',
          avatar: '👸'
        },
        metadata: {
          players: ['Tyler Boyd'],
          priority: 8,
          successful: false
        },
        reactions: {
          likes: 2,
          comments: 1,
          isLiked: false
        },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: 'trade-2',
        type: 'trade',
        title: 'Trade Completed',
        description: '2 players involved',
        timestamp: formatTimestamp(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3 days ago
        user: {
          name: 'David Jarvey',
          team: 'Jarvey Juggernauts',
          avatar: '🚀'
        },
        relatedUser: {
          name: 'Kaity Lorbecki',
          team: 'Lorbecki Lightning',
          avatar: '⚡'
        },
        metadata: {
          players: ['Tyreek Hill', 'George Kittle'],
          status: 'accepted'
        },
        reactions: {
          likes: 9,
          comments: 3,
          isLiked: true
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    // Filter activities by type if specified
    let activities = mockActivities;
    if (type && type !== 'all') {
      activities = mockActivities.filter(activity => activity.type === type);
    }

    // Sort activities by timestamp
    const sortedActivities = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      activities: sortedActivities,
      pagination: {
        total: activities.length,
        limit,
        offset,
        hasMore: activities.length > offset + limit
      }
    });

  } catch (error) {
    console.error('Error fetching league activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch league activity' },
      { status: 500 }
    );
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}