import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { achievementSystem } from '@/lib/achievements/achievement-system';
import { redis } from '@/lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.query.userId as string || session.user.id;

  if (req.method === 'GET') {
    try {
      const cacheKey = `api:achievements:${userId}`;
      const cached = await redis.get(cacheKey);
      
      if (cached && !req.query.refresh) {
        return res.status(200).json(JSON.parse(cached));
      }

      const achievements = await achievementSystem.getUserAchievements(userId);
      const badges = await achievementSystem.getUserBadges(userId);
      const progress = await achievementSystem.getAchievementProgress(userId);
      const score = await achievementSystem.getUserAchievementScore(userId);
      const featuredBadges = await achievementSystem.getFeaturedBadges(userId);

      const availableAchievements = Array.from(achievementSystem['achievements'].values());
      const availableBadges = Array.from(achievementSystem['badges'].values());

      const achievementsWithProgress = availableAchievements.map(achievement => {
        const userAchievement = achievements.find(ua => ua.achievementId === achievement.id);
        const currentProgress = progress.get(achievement.id) || 0;

        return {
          ...achievement,
          unlocked: !!userAchievement,
          unlockedAt: userAchievement?.unlockedAt,
          progress: currentProgress,
          progressPercentage: achievement.maxProgress 
            ? Math.min((currentProgress / achievement.maxProgress) * 100, 100)
            : userAchievement ? 100 : 0
        };
      });

      const badgesWithStatus = availableBadges.map(badge => {
        const userBadge = badges.find(ub => ub.badgeId === badge.id);
        return {
          ...badge,
          earned: !!userBadge,
          earnedAt: userBadge?.earnedAt,
          featured: featuredBadges.some(fb => fb.id === badge.id)
        };
      });

      const categoryStats = {
        gameplay: achievementsWithProgress.filter(a => a.category === 'gameplay' && a.unlocked).length,
        social: achievementsWithProgress.filter(a => a.category === 'social' && a.unlocked).length,
        trading: achievementsWithProgress.filter(a => a.category === 'trading' && a.unlocked).length,
        drafting: achievementsWithProgress.filter(a => a.category === 'drafting' && a.unlocked).length,
        special: achievementsWithProgress.filter(a => a.category === 'special' && a.unlocked).length,
        milestone: achievementsWithProgress.filter(a => a.category === 'milestone' && a.unlocked).length
      };

      const tierStats = {
        bronze: achievementsWithProgress.filter(a => a.tier === 'bronze' && a.unlocked).length,
        silver: achievementsWithProgress.filter(a => a.tier === 'silver' && a.unlocked).length,
        gold: achievementsWithProgress.filter(a => a.tier === 'gold' && a.unlocked).length,
        platinum: achievementsWithProgress.filter(a => a.tier === 'platinum' && a.unlocked).length,
        diamond: achievementsWithProgress.filter(a => a.tier === 'diamond' && a.unlocked).length
      };

      const rarityStats = {
        common: badgesWithStatus.filter(b => b.rarity === 'common' && b.earned).length,
        uncommon: badgesWithStatus.filter(b => b.rarity === 'uncommon' && b.earned).length,
        rare: badgesWithStatus.filter(b => b.rarity === 'rare' && b.earned).length,
        epic: badgesWithStatus.filter(b => b.rarity === 'epic' && b.earned).length,
        legendary: badgesWithStatus.filter(b => b.rarity === 'legendary' && b.earned).length
      };

      const response = {
        achievements: achievementsWithProgress.sort((a, b) => {
          if (a.unlocked !== b.unlocked) return b.unlocked ? 1 : -1;
          if (a.unlocked && b.unlocked) {
            return new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime();
          }
          return b.points - a.points;
        }),
        badges: badgesWithStatus.sort((a, b) => {
          if (a.earned !== b.earned) return b.earned ? 1 : -1;
          if (a.earned && b.earned) {
            return new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime();
          }
          const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        }),
        featuredBadges,
        score,
        stats: {
          totalAchievements: availableAchievements.length,
          unlockedAchievements: achievements.length,
          totalBadges: availableBadges.length,
          earnedBadges: badges.length,
          completionPercentage: (achievements.length / availableAchievements.length) * 100,
          categoryStats,
          tierStats,
          rarityStats,
          nextMilestone: getNextMilestone(achievements.length, availableAchievements.length)
        }
      };

      await redis.setex(cacheKey, 300, JSON.stringify(response));
      return res.status(200).json(response);

    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  }

  if (req.method === 'POST') {
    try {
      if (req.body.action === 'check') {
        const unlockedAchievements = await achievementSystem.checkAndUnlockAchievements(userId);
        const unlockedBadges = await achievementSystem.checkAndUnlockBadges(userId, req.body.context);

        return res.status(200).json({
          newAchievements: unlockedAchievements,
          newBadges: unlockedBadges,
          message: `Unlocked ${unlockedAchievements.length} achievements and ${unlockedBadges.length} badges`
        });
      }

      if (req.body.action === 'setFeaturedBadges') {
        const { badgeIds } = req.body;
        
        if (!Array.isArray(badgeIds) || badgeIds.length > 3) {
          return res.status(400).json({ error: 'Invalid badge IDs. Maximum 3 badges can be featured.' });
        }

        await achievementSystem.setFeaturedBadges(userId, badgeIds);
        
        await redis.del(`api:achievements:${userId}`);
        
        return res.status(200).json({ 
          success: true,
          message: 'Featured badges updated successfully' 
        });
      }

      return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
      console.error('Error processing achievement action:', error);
      return res.status(500).json({ error: 'Failed to process action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function getNextMilestone(unlocked: number, total: number): string {
  const percentage = (unlocked / total) * 100;
  
  if (percentage < 10) return '10% completion - Bronze Collector';
  if (percentage < 25) return '25% completion - Silver Explorer';
  if (percentage < 50) return '50% completion - Gold Achiever';
  if (percentage < 75) return '75% completion - Platinum Master';
  if (percentage < 90) return '90% completion - Diamond Elite';
  if (percentage < 100) return '100% completion - Completionist';
  
  return 'All achievements unlocked!';
}