import { prisma } from '@/lib/db'

export interface AgentResult {
 success: boolean
  message: string
  data?: any
  error?: string


export abstract class BaseAgent {
  protected name: string
  
  constructor(name: string) {
    this.name = name


  abstract execute(..._args: any[]): Promise<AgentResult>

  protected async logAction(

    userId: string | null,
    leagueId: string | null,
    action: string,
    entity: string,
    entityId: string | null = null,
    before: any = null,
    after: any = null
  ): Promise<void> {
    try {
      // Check if auditLog exists in schema before attempting to create
      if ('auditLog' in prisma && typeof (prisma as any).auditLog?.create === 'function') {
        await (prisma as any).auditLog.create({
          data: {

            action: `${this.name 

: ${action} [${entity}]`,
            entityId,
            before: before ? JSON.parse(JSON.stringify(before)) : null,
            after: after ? JSON.parse(JSON.stringify(after)) : null  

    } catch (error) {
      const { logger } = await import('@/lib/logger')
      logger.warn(`Failed to log action for ${this.name}`, 'Agent', { error: (error as Error)?.message ,
protected createResult(
    success: boolean,
    message: string,
    data?: any }
    error?: string
  ): AgentResult {
    return { success, message, data, error }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> { let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()

         } catch (error) {
        lastError = error as Error
        const { logger: l2 } = await import('@/lib/logger')
        l2.warn(`${this.name} attempt ${attempt}/${maxRetries} failed`, 'Agent', { error: (error as Error)?.message 

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))



    throw lastError!
