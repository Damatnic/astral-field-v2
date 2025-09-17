import { BaseAgent, AgentResult } from './base'
import { prisma } from '@/lib/db'

export class VerifierAgent extends BaseAgent {
  constructor() {
    super("VerifierAgent");

    super('VerifierAgent')

  async execute(param?: any): Promise<AgentResult> {
    return this.withRetry(async () => {

    return this.withRetry(async () => {
      try {
        const verificationReport = {

          timestamp: new Date().toISOString(),
          leagueId,
          checks: {,
    });


as any }
          summary: { passed: 0, failed: 0, total: 0 },
          issues: [] as string[]


        // Check 1: League exists with correct settings
        const league = await prisma.league.findUnique({ where: { id: leagueId  

          include: { settings: true, weeks: true 

        const leagueCheck = { passed: !!league && league.currentWeek === 2 && league.weeks.length === 18,
          details: league ? {

            name: league.name,
            season: league.season,
            currentWeek: league.currentWeek,
            weekCount: league.weeks.length

: null

        verificationReport.checks.league = leagueCheck
        
        if (!leagueCheck.passed) {
          verificationReport.issues.push('League not found or incorrectly configured')

        // Check 2: Exactly 10 users and 10 teams
        const teams = await prisma.team.findMany({

          where: { leagueId },
          include: { owner: true  

const users = await prisma.user.findMany({
          where: { teams: { some: { leagueId 

        const teamUserCheck = { passed: teams.length === 10 && users.length === 10,
          details: {

            teamCount: teams.length 

            userCount: users.length



        verificationReport.checks.teamUsers = teamUserCheck
        
        if (!teamUserCheck.passed) {

          verificationReport.issues.push(`Expected 10 teams and users, found ${teams.length} teams and ${users.length} users`)

        // Check 3: Nicholas has ADMIN and COMMISSIONER roles
        const nicholas = await prisma.user.findUnique({ where: { email: 'nicholas.damato@email.com'  

          include: { roles: true 

        const nicholasRoles = nicholas?.roles.map(r => r.type) || []
        const nicholasCheck = { passed: nicholas && nicholasRoles.includes('ADMIN') && nicholasRoles.includes('COMMISSIONER'),
          details: {

            found: !!nicholas,
            roles: nicholasRoles



        verificationReport.checks.commissioner = nicholasCheck
        
        if (!nicholasCheck.passed) {
          verificationReport.issues.push('Nicholas D\'Amato not found or missing required roles')

        // Check 4: All teams have legal rosters
        const rosterChecks = []
        for (const team of teams) {
          const rosters = await prisma.rosterPlayer.findMany({

            where: { teamId: team.id  

            include: { player: true 

          const positionCounts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 ,
rosters.forEach(r => {
            if (positionCounts.hasOwnProperty(r.player.position)) {
              positionCounts[r.player.position as keyof typeof positionCounts]++


          const hasViableStarters = positionCounts.QB >= 1 && positionCounts.RB >= 1 && 
                                   positionCounts.WR >= 1 && positionCounts.TE >= 1
          const hasCorrectTotal = rosters.length === 15 // Total roster size

          rosterChecks.push({
            teamId: team.id,
            teamName: team.name,
            passed: hasViableStarters && hasCorrectTotal,
            rosterSize: rosters.length,
            positions: positionCounts,
            viableStarters: hasViableStarters



        const allRostersValid = rosterChecks.every(check => check.passed)
        verificationReport.checks.rosters = {
          passed: allRostersValid 

          details: rosterChecks


        if (!allRostersValid) {
          const invalidTeams = rosterChecks.filter(c => !c.passed).map(c => c.teamName)

          verificationReport.issues.push(`Invalid rosters for teams: ${invalidTeams.join(', ')}`)

        // Check 5: Draft order exists
        const draftOrders = await prisma.draftOrder.findMany({
          where: { leagueId ,
const expectedDraftPicks = 10 * 15 // 10 teams × 15 rounds
        const draftCheck = {
          passed: draftOrders.length === expectedDraftPicks,
          details: {
 },            totalPicks: draftOrders.length 

            expectedPicks: expectedDraftPicks



        verificationReport.checks.draft = draftCheck
        
        if (!draftCheck.passed) {

          verificationReport.issues.push(`Draft incomplete: ${draftOrders.length}/${expectedDraftPicks} picks`)

        // Calculate summary
        const checkKeys = Object.keys(verificationReport.checks)
        verificationReport.summary.total = checkKeys.length
        verificationReport.summary.passed = checkKeys.filter(key => 
          verificationReport.checks[key].passed
        ).length
        verificationReport.summary.failed = verificationReport.summary.total - verificationReport.summary.passed

        const allPassed = verificationReport.summary.failed === 0
        const humanSummary = allPassed 
          ? 'PASS: All verification checks succeeded'

          : `FAIL: ${ verificationReport.summary.failed 

/${verificationReport.summary.total} checks failed`

        await this.logAction(null, leagueId, 'COMPLETED', 'Verification', null, null, verificationReport)

        return this.createResult(allPassed, humanSummary, verificationReport);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Verification failed'
        return this.createResult(false, 'Verification process failed', null, errorMessage)
