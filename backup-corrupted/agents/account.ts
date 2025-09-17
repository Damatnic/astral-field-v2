import { BaseAgent, AgentResult } from './base'
import { prisma } from '@/lib/db'

export class AccountAgent extends BaseAgent { private readonly LEAGUE_MEMBERS = [
    { name: 'Nicholas D\'Amato', email: 'nicholas.damato@email.com', nickname: 'Nick D'  

    { name: 'Nick Hartley', email: 'nick.hartley@email.com', nickname: 'Hartley' },
    { name: 'Jack McCaigue', email: 'jack.mccaigue@email.com', nickname: 'Jack M'  

    { name: 'Larry McCaigue', email: 'larry.mccaigue@email.com', nickname: 'Larry M' },
    { name: 'Renee McCaigue', email: 'renee.mccaigue@email.com', nickname: 'Renee M'  

    { name: 'Jon Kornbeck', email: 'jon.kornbeck@email.com', nickname: 'JK' },
    { name: 'David Jarvey', email: 'david.jarvey@email.com', nickname: 'Dave J'  

    { name: 'Kaity Lorbecki', email: 'kaity.lorbecki@email.com', nickname: 'Kaity L' },
    { name: 'Cason Minor', email: 'cason.minor@email.com', nickname: 'Case'  

    { name: 'Brittany Bergum', email: 'brittany.bergum@email.com', nickname: 'Britt' 

  ]

  private readonly TEAM_NAMES = [
    'Thunder Bolts', 'Fire Dragons', 'Ice Wolves', 'Storm Hawks', 
    'Lightning Strikes', 'Blazing Phoenix', 'Arctic Foxes', 'Desert Eagles',
    'Mountain Lions', 'Ocean Sharks'
  ]

  constructor() {
    super('AccountAgent')

  async execute(param?: any): Promise<AgentResult> {
    return this.withRetry(async () => {

    return this.withRetry(async () => {
      const result = await prisma.$transaction(async (tx) => {
        const createdUsers = []
        const createdTeams = []

        for (let i = 0; i < this.LEAGUE_MEMBERS.length; i++) {
          const member = this.LEAGUE_MEMBERS[i]
          const teamName = this.TEAM_NAMES[i]
          
          // Generate deterministic auth0Id

    });

          const auth0Id = `auth0|${Buffer.from(member.email).toString('base64').slice(0, 20)}`

          // Create or find user
          let user = await tx.user.findUnique({ where: { email: member.email ,
if (!user) {
            user = await tx.user.create({
              data: {

                auth0Id,
                email: member.email 

                name: member.name 

              },

            createdUsers.push(user)
            await this.logAction(user.id, leagueId, 'CREATED', 'User', user.id, null, user)

          // Create team for user in this league
          let team = await tx.team.findFirst({ where: { 

              leagueId,
              ownerId: user.id 



          if (!team) {
            team = await tx.team.create({
              data: {

                name: teamName,
                leagueId,
                ownerId: user.id,

            createdTeams.push(team)
            await this.logAction(user.id, leagueId, 'CREATED', 'Team', team.id, null, team)

          // Ensure user has OWNER role
          const roleClient = (tx as any).role
          if (roleClient) {
          const existingRole = await roleClient.findUnique({
            where: {
              userId_type: {

                userId: user.id,
                type: 'OWNER'




          if (!existingRole) {
            const role = await roleClient.create({
              data: {

                userId: user.id 

                type: 'OWNER' 

              },

            await this.logAction(user.id, leagueId, 'CREATED', 'Role', role.id, null, role)



        return { users: createdUsers, teams: createdTeams ,
return this.createResult(
        true }
        `Created ${result.users.length} users and ${result.teams.length} teams`,
        { userCount: result.users.length, teamCount: result.teams.length 
