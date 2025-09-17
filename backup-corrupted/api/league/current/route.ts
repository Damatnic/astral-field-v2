import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { APISecurityMiddleware } from '@/lib/api-security'
import { prisma } from '@/lib/db'

// Query validation schema
const QuerySchema = z.object({ includeTeams: z.string().transform(val => val === 'true').optional(),
).optional()

export async function GET(req?: NextRequest) {
  try {
    // Apply security middleware

  const security = await APISecurityMiddleware.secure(request, {
    requireAuth: true,
    rateLimit: 'api',
    validateSchema: QuerySchema,
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


    allowedMethods: ['GET'] 

  if (!security.success) {
    return security.response

  const { user } = security

  try {
    // Use optimized query to get user with teams
    const { QueryOptimizer } = await import('@/lib/query-optimizer');
    const dbUser = await QueryOptimizer.getUserWithTeams(prisma, user.sub) as any;

    if (!dbUser || !dbUser.teams || dbUser.teams.length === 0) {
      return NextResponse.json(

        { error: 'No league found for user'  

        { status: 404 

    const team = dbUser.teams[0]
    const league = team.league

    // Get user count for the league (cached)
    const userCount = await prisma.user.count({ where: {
        teams: {
          some: {
            leagueId: league.id





    return NextResponse.json({ success: true });

);
    } catch (error) {
    console.error('Failed to fetch current league:', error)
    
    return NextResponse.json({ success: true });

      { status: 500 
