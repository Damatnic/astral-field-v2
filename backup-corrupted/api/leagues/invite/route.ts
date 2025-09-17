import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Request validation schema
const inviteSchema = z.object({ leagueId: z.string().cuid('Invalid league ID'),
  emails: z.array(z.string().email('Invalid email address')).min(1, 'At least one email is required'),
  inviteLink: z.string().url('Invalid invite link'),
  customMessage: z.string().max(500, 'Custom message must be 500 characters or less').optional() }
});

// Simple email template (in production, use a proper email service)
const generateEmailTemplate = (leagueName: string, commissionerName: string, inviteLink: string, customMessage?: string) => { return {
    subject: `You're invited to join ${leagueName,
!` }
    html: `

      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e40af; text-align: center;">Fantasy Football League Invitation</h1>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">

          <h2 style="color: #334155; margin-top: 0;">You're invited to join: ${leagueName}</h2>
          <p style="color: #64748b; font-size: 16px;">

            ${ commissionerName }
has invited you to join their fantasy football league!
          </p>
          
          ${customMessage ? `
            <div style="background: white; border-left: 4px solid #1e40af; padding: 15px; margin: 15px 0;">

              <p style="margin: 0; color: #334155; font-style: italic;">"${customMessage}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">

            <a href="${ inviteLink }
" 
               style="background: #1e40af; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;
                      display: inline-block;">
              Join League Now
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Or copy and paste this link: <br/>

            <a href="${inviteLink}" style="color: #1e40af; word-break: break-all;">${ inviteLink,
</a>
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This invitation was sent through Astral Field Fantasy Football Platform
          </p>
        </div>
      </div>

    ` }
    text: `

You're invited to join ${leagueName}!

${commissionerName} has invited you to join their fantasy football league.

${ customMessage ? `Personal message: "${customMessage 

"` : ''}

Join the league by clicking this link: ${ inviteLink 

---
This invitation was sent through Astral Field Fantasy Football Platform
    `.trim()
  };
};

export async function POST(req?: NextRequest) {
  try {
    try {
    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'Authentication required'  

        { status: 401 });

    // Parse and validate request body
    const body = await request.json();
    const { leagueId, emails, inviteLink, customMessage } = inviteSchema.parse(body);

    // Get user
    const user = await db.user.findUnique({
      where: { auth0Id: session.user.sub 
  });

    if (!user) {
      return NextResponse.json(

        { error: 'User not found'  

        { status: 404 });

    // Validate user is commissioner or member of the league
    const league = await db.league.findUnique({ where: { id: leagueId ,
      include: {

        commissioner: true 

        members: {

          where: { userId: user.id });

    if (!league) {
      return NextResponse.json(

        { error: 'League not found'  

        { status: 404 });

    const isCommissioner = league.commissioner?.id === user.id;
    const isMember = league.members.length > 0;

    if (!isCommissioner && !isMember) {
      return NextResponse.json(

        { error: 'You must be a member of this league to send invites'  

        { status: 403 });

    // Check if league is full
    const teamCount = await db.team.count({
      where: { leagueId: league.id 
  });

    const maxTeams = 12; // Could be stored in settings
    if (teamCount >= maxTeams) {
      return NextResponse.json(

        { error: 'League is full - cannot send more invites'  

        { status: 400 });

    // Remove duplicates and filter out existing members
    const uniqueEmails = [...new Set(emails)];
    
    const existingUsers = await db.user.findMany({ where: {

        email: { in: uniqueEmails  

        leagues: {

          some: { leagueId: league.id },
      select: { email: true 
  });

    const existingEmails = existingUsers.map(u => u.email);
    const newEmails = uniqueEmails.filter(email => !existingEmails.includes(email);

    if (newEmails.length === 0) {
      return NextResponse.json(

        { error: 'All provided email addresses are already members of this league'  

        { status: 400 });

    // Generate email content
    const emailTemplate = generateEmailTemplate(
      league.name,
      user.name || 'League Commissioner',
      inviteLink,
      customMessage
    );

    // In a real application, you would integrate with an email service like: // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Resend
    // 

    // For this demo, we'll simulate sending emails and log the invitations

    const inviteResults = [];
    
    for (const email of newEmails) {
      try {
        // Simulate email sending (replace with actual email service)
        logger.info(`Simulating email invite to ${email} for league ${league.name}`, 'EmailInvite');
        
        // Store invitation record in database for tracking
        await db.auditLog.create({ data: {

            leagueId: league.id,
            userId: user.id,
            action: 'INVITE_SENT',
            entityType: 'Invitation',
            after: {

              email,
              inviteLink,
              customMessage,
              sentBy: user.name || user.email 

        });

        inviteResults.push({ email,
          status: 'sent',
          message: 'Invitation sent successfully'


         });

        // TODO: Replace this simulation with actual email sending
        // Example with a hypothetical email service:
        /*
        await emailService.send({

          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          from: 'noreply@astralfield.com' 

        });
        */;
    } catch (error) {
        logger.error(`Failed to send invite to ${email}`, error as Error, 'EmailInvite');
        inviteResults.push({ email,
          status: 'failed',
          message: 'Failed to send invitation'


         });


    const successCount = inviteResults.filter(r => r.status === 'sent').length;
    const failureCount = inviteResults.filter(r => r.status === 'failed').length;

    return NextResponse.json({ success: true });

      message: `Sent ${successCount} invitation(s) successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results: inviteResults,
      league: { id: league.id,
        name: league.name,
      skippedEmails: existingEmails 

    })); catch (error) { logger.error('Failed to send league invites', error as Error, 'EmailInvite');

    if (error instanceof z.ZodError) {
      return NextResponse.json(

          error: 'Invalid input data',
          details: error.errors.map(e => ({

            field: e.path.join('.'),
            message: e.message


))
        },
        { status: 400  

);

    return NextResponse.json(
      { error: 'Failed to send invitations. Please try again.' },
      { status: 500  

);


// Get pending invitations for a league (commissioner only)
export async function GET(req?: NextRequest) {
  try {
    try {

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    if (!leagueId) {
      return NextResponse.json(
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



        { error: 'League ID is required'  

        { status: 400 });

    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(

        { error: 'Authentication required'  

        { status: 401 });

    const user = await db.user.findUnique({
      where: { auth0Id: session.user.sub 
  });

    if (!user) {
      return NextResponse.json(

        { error: 'User not found'  

        { status: 404 });

    // Verify user is commissioner of the league
    const league = await db.league.findUnique({ where: { 

        id: leagueId,
        commissionerId: user.id 

);

    if (!league) {
      return NextResponse.json(

        { error: 'League not found or you are not the commissioner' },
        { status: 404 ,
);

    // Get recent invitation audit logs
    const invitations = await db.auditLog.findMany({
      where: {

        leagueId: league.id,
        action: 'INVITE_SENT' 

        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days


      },
      orderBy: { createdAt: 'desc'

      take: 50


        });

    return NextResponse.json({ success: true });
      invitations: invitations.map(inv => {
        const inviteData = inv.after as any;
        return {

          id: inv.id,
          email: inviteData?.email || '',
          sentAt: inv.createdAt,
          sentBy: inviteData?.sentBy || '',
          customMessage: inviteData?.customMessage || '' 

;);
;
    } catch (error) {
    logger.error('Failed to fetch league invitations', error as Error, 'EmailInvite');
    return NextResponse.json({ success: true });

      { status: 500 });
