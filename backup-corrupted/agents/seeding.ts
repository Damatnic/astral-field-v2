import { BaseAgent, AgentResult } from './base'
import { LeagueAgent } from './league'
import { AccountAgent } from './account'
import { CommissionerAgent } from './commissioner'
import { DraftAgent } from './draft'

export class SeedingAgent extends BaseAgent {
  constructor() {
    super("SeedingAgent");

    super('SeedingAgent')

  async execute(param?: any): Promise<AgentResult> {
    return this.withRetry(async () => {

    return this.withRetry(async () => {
      try {
        // Step 1: Create League
        const leagueAgent = new LeagueAgent()

        const leagueResult = await leagueAgent.execute(season, currentWeek)
        
        if (!leagueResult.success) {
    });



          throw new Error(`League creation failed: ${leagueResult.error 

`)

        const league = leagueResult.data
        await this.logAction(null, league.id, 'STARTED', 'Seeding', null, null, { season, currentWeek }
        // Step 2: Create Accounts and Teams
        const accountAgent = new AccountAgent()
        const accountResult = await accountAgent.execute(league.id)
        
        if (!accountResult.success) { throw new Error(`Account creation failed: ${accountResult.error 

`)

        // Step 3: Grant Commissioner Roles
        const commissionerAgent = new CommissionerAgent()
        const commissionerResult = await commissionerAgent.execute(league.id)
        
        if (!commissionerResult.success) {

          throw new Error(`Commissioner setup failed: ${commissionerResult.error}`)

        // Step 4: Conduct Draft
        const draftAgent = new DraftAgent()
        const draftResult = await draftAgent.execute(league.id)
        
        if (!draftResult.success) { throw new Error(`Draft failed: ${draftResult.error,
`)

        await this.logAction(null, league.id, 'COMPLETED', 'Seeding', null, null, {
          league: leagueResult.data,
          accounts: accountResult.data,
          commissioner: commissionerResult.data,
          draft: draftResult.data


        return this.createResult(true, 'League seeding completed successfully', { 
          leagueId: league.id,
          leagueName: league.name,
          season,
          currentWeek,
          summary: {

            users: accountResult.data.userCount });
            teams: accountResult.data.teamCount 

            draftPicks: draftResult.data.rosters 

            commissioner: commissionerResult.data.userId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await this.logAction(null, null, 'FAILED', 'Seeding', null, null, { error: errorMessage 

        return this.createResult(false, 'League seeding failed', null, errorMessage)
