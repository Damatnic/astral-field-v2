import { NextRequest, NextResponse } from 'next/server';

interface Achievement {
  id: string;
  name: string;
  description: string;
  reward: {
    type: 'TOKEN' | 'NFT' | 'BOTH';
    amount?: number;
    nftId?: string;
  };
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Mock achievements - In production, fetch from database based on user progress
    const mockAchievements: Achievement[] = [
      {
        id: 'ach_001',
        name: 'First Victory',
        description: 'Win your first weekly matchup',
        reward: {
          type: 'TOKEN',
          amount: 100
        },
        unlocked: true,
        unlockedAt: new Date('2024-01-08'),
        progress: 1,
        maxProgress: 1
      },
      {
        id: 'ach_002',
        name: 'Perfect Lineup',
        description: 'Score over 200 points in a single week',
        reward: {
          type: 'BOTH',
          amount: 500,
          nftId: 'nft_perfect_week'
        },
        unlocked: true,
        unlockedAt: new Date('2024-03-10'),
        progress: 1,
        maxProgress: 1
      },
      {
        id: 'ach_003',
        name: 'Trade Master',
        description: 'Complete 10 successful trades',
        reward: {
          type: 'NFT',
          nftId: 'nft_trade_master'
        },
        unlocked: true,
        unlockedAt: new Date('2024-02-22'),
        progress: 10,
        maxProgress: 10
      },
      {
        id: 'ach_004',
        name: 'Win Streak',
        description: 'Win 5 consecutive weekly matchups',
        reward: {
          type: 'TOKEN',
          amount: 750
        },
        unlocked: false,
        progress: 3,
        maxProgress: 5
      },
      {
        id: 'ach_005',
        name: 'Season Champion',
        description: 'Win the fantasy football championship',
        reward: {
          type: 'BOTH',
          amount: 2500,
          nftId: 'nft_champion_trophy'
        },
        unlocked: true,
        unlockedAt: new Date('2024-01-15'),
        progress: 1,
        maxProgress: 1
      },
      {
        id: 'ach_006',
        name: 'Waiver Wire Wizard',
        description: 'Successfully claim 25 waiver wire players',
        reward: {
          type: 'TOKEN',
          amount: 300
        },
        unlocked: false,
        progress: 18,
        maxProgress: 25
      },
      {
        id: 'ach_007',
        name: 'Analytics Expert',
        description: 'Use AI lineup optimizer 50 times',
        reward: {
          type: 'TOKEN',
          amount: 400
        },
        unlocked: false,
        progress: 32,
        maxProgress: 50
      },
      {
        id: 'ach_008',
        name: 'Social Butterfly',
        description: 'Send 100 messages in league chat',
        reward: {
          type: 'TOKEN',
          amount: 200
        },
        unlocked: false,
        progress: 67,
        maxProgress: 100
      },
      {
        id: 'ach_009',
        name: 'Injury Predictor',
        description: 'Successfully predict 10 player injuries',
        reward: {
          type: 'NFT',
          nftId: 'nft_crystal_ball'
        },
        unlocked: false,
        progress: 6,
        maxProgress: 10
      },
      {
        id: 'ach_010',
        name: 'Weather Warrior',
        description: 'Make optimal weather-based lineup decisions 20 times',
        reward: {
          type: 'TOKEN',
          amount: 350
        },
        unlocked: false,
        progress: 14,
        maxProgress: 20
      }
    ];

    // In production, you would:
    // 1. Query user's fantasy performance from database
    // 2. Calculate current progress for each achievement
    // 3. Check which achievements have been unlocked
    // 4. Award tokens/NFTs when achievements are completed
    // 5. Track achievement progress in real-time

    const unlockedCount = mockAchievements.filter(a => a.unlocked).length;
    const totalRewardsEarned = mockAchievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + (a.reward.amount || 0), 0);

    return NextResponse.json({
      success: true,
      achievements: mockAchievements,
      summary: {
        total: mockAchievements.length,
        unlocked: unlockedCount,
        completionRate: Math.round((unlockedCount / mockAchievements.length) * 100),
        totalTokensEarned: totalRewardsEarned,
        nftsEarned: mockAchievements.filter(a => a.unlocked && (a.reward.type === 'NFT' || a.reward.type === 'BOTH')).length
      }
    });

  } catch (error) {
    console.error('Achievement fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch achievements'
    }, { status: 500 });
  }
}