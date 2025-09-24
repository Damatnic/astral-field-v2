import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { handleComponentError } from '@/lib/error-handling';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
// NotificationLogType removed - using string values directly

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { type, userId, leagueId, data } = await request.json();

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const prefs = user.preferences || {};
    const shouldSend = checkNotificationPreferences(type, prefs);

    if (!shouldSend) {
      return NextResponse.json({
        success: true,
        message: 'Notification skipped due to user preferences'
      });
    }

    let result = null;

    switch (type) {
      case 'lineup_reminder':
        result = await sendLineupReminder(user, leagueId, data);
        break;
      case 'trade_proposal':
        result = await sendTradeProposal(user, data);
        break;
      case 'trade_accepted':
        result = await sendTradeAccepted(user, data);
        break;
      case 'waiver_result':
        result = await sendWaiverResult(user, data);
        break;
      case 'injury_alert':
        result = await sendInjuryAlert(user, data);
        break;
      case 'draft_reminder':
        result = await sendDraftReminder(user, leagueId, data);
        break;
      case 'matchup_reminder':
        result = await sendMatchupReminder(user, leagueId, data);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // Log notification to notifications table
    const notification = await prisma.notification.create({
      data: {
        type,
        title: `${type} notification`,
        body: `${type} notification ${result.success ? 'sent' : 'failed'}`,
        data: data
      }
    });

    // Create notification target
    await prisma.notificationTarget.create({
      data: {
        notificationId: notification.id,
        userId
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    handleComponentError(error as Error, 'route');
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

function checkResendAvailable(): boolean {
  return resend !== null;
}

function checkNotificationPreferences(type: string, prefs: any): boolean {
  // Default to true if no preferences set
  if (!prefs || Object.keys(prefs).length === 0) return true;

  const typeMap: Record<string, string> = {
    lineup_reminder: 'lineupReminders',
    trade_proposal: 'tradeAlerts',
    trade_accepted: 'tradeAlerts',
    waiver_result: 'waiverAlerts',
    injury_alert: 'injuryAlerts',
    draft_reminder: 'draftReminders',
    matchup_reminder: 'matchupReminders'
  };

  const prefKey = typeMap[type];
  return prefKey ? prefs[prefKey] !== false : true;
}

async function sendLineupReminder(user: any, leagueId: string, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">🏈 Lineup Reminder - ${league?.name}</h2>
        <p>Hi ${user.name},</p>
        <p>Don't forget to set your lineup for Week ${data.week}! Games start ${data.gameTime}.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">⚠️ Action Required</h3>
          <p>You have <strong>${data.invalidPositions || 0}</strong> invalid lineup positions that need to be fixed.</p>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${leagueId}/lineup" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Set Your Lineup
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">Good luck this week!</p>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `🏈 Set Your Lineup - Week ${data.week} | ${league?.name}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendTradeProposal(user: any, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">🤝 New Trade Proposal</h2>
        <p>Hi ${user.name},</p>
        <p><strong>${data.proposerName}</strong> has sent you a trade proposal in <strong>${data.leagueName}</strong>.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">📊 Trade Details</h3>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1; margin-right: 20px;">
              <h4>You Receive:</h4>
              <ul>
                ${data.receivingPlayers?.map((p: any) => `<li>${p.name} (${p.position} - ${p.team})</li>`).join('') || ''}
              </ul>
            </div>
            <div style="flex: 1;">
              <h4>You Give:</h4>
              <ul>
                ${data.givingPlayers?.map((p: any) => `<li>${p.name} (${p.position} - ${p.team})</li>`).join('') || ''}
              </ul>
            </div>
          </div>
          ${data.fairnessScore ? `<p><strong>Fairness Score:</strong> ${data.fairnessScore}/100</p>` : ''}
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${data.leagueId}/trades/${data.tradeId}" 
           style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 10px 10px 0;">
          Review Trade
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">This trade expires in 48 hours.</p>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `🤝 Trade Proposal from ${data.proposerName} | ${data.leagueName}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendTradeAccepted(user: any, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Trade Completed!</h2>
        <p>Hi ${user.name},</p>
        <p>Your trade with <strong>${data.otherTeamName}</strong> has been completed in <strong>${data.leagueName}</strong>!</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #065f46;">📊 Trade Summary</h3>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1; margin-right: 20px;">
              <h4>You Received:</h4>
              <ul>
                ${data.receivedPlayers?.map((p: any) => `<li>${p.name} (${p.position} - ${p.team})</li>`).join('') || ''}
              </ul>
            </div>
            <div style="flex: 1;">
              <h4>You Traded:</h4>
              <ul>
                ${data.tradedPlayers?.map((p: any) => `<li>${p.name} (${p.position} - ${p.team})</li>`).join('') || ''}
              </ul>
            </div>
          </div>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${data.leagueId}/roster" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Your Roster
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">Good luck with your new players!</p>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `✅ Trade Completed with ${data.otherTeamName} | ${data.leagueName}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendWaiverResult(user: any, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const isSuccess = data.status === 'SUCCESSFUL';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isSuccess ? '#10b981' : '#ef4444'};">📋 Waiver Results - Week ${data.week}</h2>
        <p>Hi ${user.name},</p>
        <p>Your waiver claims have been processed for <strong>${data.leagueName}</strong>.</p>
        
        ${data.successfulClaims?.length > 0 ? `
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">✅ Successful Claims</h3>
            <ul>
              ${data.successfulClaims.map((claim: any) => 
                `<li><strong>${claim.playerName}</strong> (${claim.position}) - Bid: $${claim.bidAmount}</li>`
              ).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${data.failedClaims?.length > 0 ? `
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin-top: 0; color: #991b1b;">❌ Failed Claims</h3>
            <ul>
              ${data.failedClaims.map((claim: any) => 
                `<li><strong>${claim.playerName}</strong> (${claim.position}) - ${claim.reason}</li>`
              ).join('')}
            </ul>
          </div>
        ` : ''}
        
        <p><strong>Remaining FAAB Budget:</strong> $${data.remainingFaab || 0}</p>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${data.leagueId}/waivers" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Waiver Wire
        </a>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `📋 Waiver Results - Week ${data.week} | ${data.leagueName}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendInjuryAlert(user: any, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">🏥 Injury Alert</h2>
        <p>Hi ${user.name},</p>
        <p>One of your players has been updated with an injury status:</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin-top: 0; color: #991b1b;">🏥 Injury Update</h3>
          <p><strong>${data.playerName}</strong> (${data.position} - ${data.nflTeam})</p>
          <p><strong>Status:</strong> ${data.injuryStatus}</p>
          <p><strong>Impact:</strong> ${data.impact} (${data.description})</p>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${data.leagueId}/roster" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Your Roster
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">Consider checking the waiver wire for replacements.</p>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `🏥 Injury Alert: ${data.playerName} | ${data.leagueName}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendDraftReminder(user: any, leagueId: string, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">🎯 Draft Starting Soon!</h2>
        <p>Hi ${user.name},</p>
        <p>Your draft for <strong>${data.leagueName}</strong> is starting in ${data.timeUntilDraft}!</p>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin-top: 0; color: #1e40af;">📊 Draft Details</h3>
          <p><strong>Start Time:</strong> ${data.draftTime}</p>
          <p><strong>Your Pick:</strong> #${data.draftPosition}</p>
          <p><strong>Type:</strong> ${data.draftType}</p>
          <p><strong>Rounds:</strong> ${data.rounds}</p>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${leagueId}/draft" 
           style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Join Draft Room
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">Make sure to log in early to avoid any connection issues!</p>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `🎯 Draft Starting Soon: ${data.leagueName}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendMatchupReminder(user: any, leagueId: string, data: any) {
  if (!checkResendAvailable()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">⚡ Week ${data.week} Matchup</h2>
        <p>Hi ${user.name},</p>
        <p>Your Week ${data.week} matchup is ready in <strong>${data.leagueName}</strong>!</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">🏆 This Week's Matchup</h3>
          <div style="text-align: center; font-size: 18px;">
            <strong>${data.teamName}</strong> vs <strong>${data.opponentName}</strong>
          </div>
          <div style="margin: 15px 0; text-align: center;">
            <span style="background: #3b82f6; color: white; padding: 8px 16px; border-radius: 20px; margin: 0 10px;">
              ${data.projectedScore || 'TBD'}
            </span>
            <span style="color: #6b7280;">vs</span>
            <span style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; margin: 0 10px;">
              ${data.opponentProjectedScore || 'TBD'}
            </span>
          </div>
          <p style="text-align: center; color: #6b7280;">Projected scores</p>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${leagueId}/matchup/${data.matchupId}" 
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Matchup
        </a>
        
        <p style="color: #6b7280; font-size: 14px;">Games start ${data.gameTime}. Good luck!</p>
      </div>
    `;

    const result = await resend!.emails.send({
      from: 'AstralField <noreply@astralfield.com>',
      to: [user.email],
      subject: `⚡ Week ${data.week} Matchup: ${data.teamName} vs ${data.opponentName}`,
      html: emailHtml
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}