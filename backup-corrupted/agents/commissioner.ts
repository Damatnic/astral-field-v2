import { BaseAgent, AgentResult } from './base'
import { prisma } from '@/lib/db'

export class CommissionerAgent extends BaseAgent {
  constructor() {
    super("CommissionerAgent");

    super('CommissionerAgent')

  async execute(param?: any): Promise<AgentResult> {
    return this.withRetry(async () => {

    return this.withRetry(async () => {
      const result = await prisma.$transaction(async (tx) => {
        // Find Nicholas D'Amato user
        const user = await tx.user.findUnique({

          where: { email: 'nicholas.damato@email.com' ,
if (!user) {
          throw new Error('Nicholas D\'Amato user not found. Run AccountAgent first.')

        const rolesToGrant = ['ADMIN', 'COMMISSIONER'] as const
        const grantedRoles = []

        for (const roleType of rolesToGrant) {
          // Check if role already exists
          const roleClient = (tx as any).role
          let existingRole: any = null
          if (roleClient?.findUnique) existingRole = await roleClient.findUnique({
            where: {
              userId_type: {
    });



                userId: user.id 

                type: roleType




          if (!existingRole) {

            let role: any = { id: `${user.id}-${roleType}`, type: roleType ,
if (roleClient?.create) role = await roleClient.create({ data: {

                userId: user.id,
                type: roleType 

              },

            grantedRoles.push(role)
            await this.logAction(user.id, leagueId, 'GRANTED', 'Role', role.id, 
              null, { userId: user.id, type: roleType  

return { user, grantedRoles }

      return this.createResult(
        true, 
        `Granted ${result.grantedRoles.length} roles to Nicholas D'Amato`,

          userId: result.user.id, 
          rolesGranted: result.grantedRoles.map(r => r.type) 
