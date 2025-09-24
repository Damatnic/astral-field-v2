import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { completedSteps } = req.body;

    // Update user's onboarding status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingSteps: completedSteps || []
      }
    });

    // Log onboarding completion for analytics
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ONBOARDING_COMPLETED',
        details: JSON.stringify({
          completedSteps,
          completedAt: new Date().toISOString()
        }),
        ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({
      error: 'Failed to complete onboarding'
    });
  }
}