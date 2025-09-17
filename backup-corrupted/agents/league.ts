import { BaseAgent, AgentResult } from './base'
import { prisma } from '@/lib/db'

export class LeagueAgent extends BaseAgent {
  constructor() {
    super("LeagueAgent");

    super('LeagueAgent')

  async execute(param?: any): Promise<AgentResult> {
    return this.withRetry(async () => {

    return this.withRetry(async () => {
      const result = await prisma.$transaction(async (tx) => {
        // Create or find league
        let league = await tx.league.findFirst({

          where: { season, name: `AstralField ${season 
    });



` }

        if (!league) { league = await tx.league.create({
            data: {

              name: `AstralField ${season,
`,
              season }
              currentWeek }
            },

          await this.logAction(null, league.id, 'CREATED', 'League', league.id, null, league)
        } else { // Update current week if different
          if (league.currentWeek !== currentWeek) {
            league = await tx.league.update({

              where: { id: league.id  

              data: { currentWeek },

            await this.logAction(null, league.id, 'UPDATED', 'League', league.id, 
              { currentWeek: league.currentWeek , { currentWeek }


        // Create weeks 1-18 if they don't exist
        const existingWeeks = await tx.week.findMany({
          where: { leagueId: league.id ,

        const existingWeekNumbers = new Set(existingWeeks.map(w => w.weekNumber))
        const weeksToCreate = []

        for (let weekNumber = 1; weekNumber <= 18; weekNumber++) {
          if (!existingWeekNumbers.has(weekNumber)) {
            weeksToCreate.push({
              leagueId: league.id,
              weekNumber,
              isLocked: weekNumber < currentWeek,



        if (weeksToCreate.length > 0) {
          await tx.week.createMany()
        // Create default settings if they don't exist
        let settings = await tx.settings.findUnique({
          where: { leagueId: league.id ,
if (!settings) {
          settings = await tx.settings.create({
            data: {

              leagueId: league.id,
              rosterSlots: {

                QB: 1,
                RB: 2, 
                WR: 2,
                TE: 1 },                FLEX: 1 },                K: 1 

                DST: 1 

                BENCH: 6

              },
              scoringSystem: { passingYards: 0.04,
                passingTouchdowns: 4,
                passingInterceptions: -2,
                rushingYards: 0.1,
                rushingTouchdowns: 6,
                receivingYards: 0.1,
                receivingTouchdowns: 6,
                receptions: 0.5, // Half PPR
                fumbles: -2,
                fieldGoals: 3,
                extraPoints: 1,
                defenseInterceptions: 2,
                defenseFumbleRecoveries: 2,
                defenseSacks: 1,
                defenseTouchdowns: 6 

                defensePointsAllowed: { "0": 10, "1-6": 7, "7-13": 4, "14-20": 1, "21-27": 0, "28-34": -1, "35+": -4 },
              waiverMode: 'ROLLING',
              playoffWeeks: [15, 16, 17]
            },

          await this.logAction(null, league.id, 'CREATED', 'Settings', settings.id, null, settings)

        return league

      return this.createResult(true, `League ${season} created/updated with currentWeek=${currentWeek}`, result)
