import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(['technical', 'account', 'billing', 'feature_request', 'bug_report', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  attachments: z.array(z.string()).optional().default([])
});

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  internalNotes: z.string().optional()
});

const addMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string()).optional().default([])
});

interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  customerSatisfaction?: number;
  tags: string[];
  attachments: string[];
}

interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'customer' | 'agent' | 'system';
  message: string;
  isInternal: boolean;
  createdAt: Date;
  attachments: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ticketId = req.query.ticketId as string;

  if (req.method === 'GET') {
    try {
      if (ticketId) {
        // Get specific ticket
        const ticket = await prisma.supportTicket.findUnique({
          where: { id: ticketId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            assignedAgent: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            messages: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            },
            _count: {
              select: {
                messages: true
              }
            }
          }
        });

        if (!ticket) {
          return res.status(404).json({ error: 'Ticket not found' });
        }

        // Check if user owns ticket or is support agent
        if (ticket.userId !== session.user.id && !isUserSupportAgent(session.user)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        return res.status(200).json(ticket);
      } else {
        // Get user's tickets
        const tickets = await prisma.supportTicket.findMany({
          where: { 
            userId: session.user.id 
          },
          include: {
            assignedAgent: {
              select: {
                name: true
              }
            },
            _count: {
              select: {
                messages: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        return res.status(200).json(tickets);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }

  if (req.method === 'POST') {
    try {
      if (ticketId && req.body.action === 'add_message') {
        // Add message to existing ticket
        const { message, isInternal = false, attachments = [] } = addMessageSchema.parse(req.body);

        const ticket = await prisma.supportTicket.findUnique({
          where: { id: ticketId }
        });

        if (!ticket) {
          return res.status(404).json({ error: 'Ticket not found' });
        }

        if (ticket.userId !== session.user.id && !isUserSupportAgent(session.user)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const ticketMessage = await prisma.ticketMessage.create({
          data: {
            ticketId,
            authorId: session.user.id,
            authorType: isUserSupportAgent(session.user) ? 'agent' : 'customer',
            message,
            isInternal,
            attachments
          },
          include: {
            author: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        // Update ticket status if customer responds
        if (!isUserSupportAgent(session.user) && ticket.status === 'waiting_for_customer') {
          await prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
              status: 'open',
              updatedAt: new Date()
            }
          });
        }

        // Send notification to assigned agent or customer
        await notifyTicketParticipants(ticketId, ticketMessage, session.user.id);

        return res.status(201).json({
          success: true,
          message: ticketMessage
        });
      } else {
        // Create new ticket
        const { subject, description, category, priority, attachments } = createTicketSchema.parse(req.body);

        const ticketNumber = await generateTicketNumber();

        const ticket = await prisma.supportTicket.create({
          data: {
            ticketNumber,
            userId: session.user.id,
            subject,
            description,
            category,
            priority,
            status: 'open',
            attachments,
            tags: await generateAutomaticTags(subject, description, category)
          },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });

        // Auto-assign based on category and workload
        const assignedAgent = await autoAssignTicket(ticket.id, category);
        
        if (assignedAgent) {
          await prisma.supportTicket.update({
            where: { id: ticket.id },
            data: { assignedTo: assignedAgent.id }
          });
        }

        // Send notification to support team
        await notifyNewTicket(ticket);

        // Create initial system message
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            authorId: 'system',
            authorType: 'system',
            message: `Support ticket created. Reference number: ${ticketNumber}`,
            isInternal: false
          }
        });

        return res.status(201).json({
          success: true,
          ticket,
          message: 'Support ticket created successfully'
        });
      }
    } catch (error) {
      console.error('Error creating support ticket:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      }

      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      if (!ticketId) {
        return res.status(400).json({ error: 'Ticket ID required' });
      }

      // Only support agents can update ticket properties
      if (!isUserSupportAgent(session.user)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updates = updateTicketSchema.parse(req.body);

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      };

      // Set resolved timestamp if status changed to resolved
      if (updates.status === 'resolved' && ticket.status !== 'resolved') {
        updateData.resolvedAt = new Date();
      }

      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          assignedAgent: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Log status change
      if (updates.status && updates.status !== ticket.status) {
        await prisma.ticketMessage.create({
          data: {
            ticketId,
            authorId: session.user.id,
            authorType: 'agent',
            message: `Status changed from ${ticket.status} to ${updates.status}`,
            isInternal: true
          }
        });
      }

      // Notify customer of status change
      if (updates.status && updates.status !== ticket.status) {
        await notifyCustomerStatusChange(ticket.userId, updatedTicket);
      }

      return res.status(200).json({
        success: true,
        ticket: updatedTicket
      });
    } catch (error) {
      console.error('Error updating support ticket:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      }

      return res.status(500).json({ error: 'Failed to update ticket' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (!ticketId) {
        return res.status(400).json({ error: 'Ticket ID required' });
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Only ticket owner or support agent can delete
      if (ticket.userId !== session.user.id && !isUserSupportAgent(session.user)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Soft delete - mark as closed instead of actual deletion
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'closed',
          updatedAt: new Date(),
          resolvedAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Ticket closed successfully'
      });
    } catch (error) {
      console.error('Error deleting support ticket:', error);
      return res.status(500).json({ error: 'Failed to close ticket' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper Functions

function isUserSupportAgent(user: any): boolean {
  return user.role === 'SUPPORT' || user.role === 'ADMIN';
}

async function generateTicketNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const count = await prisma.supportTicket.count({
    where: {
      createdAt: {
        gte: new Date(today.setHours(0, 0, 0, 0)),
        lt: new Date(today.setHours(23, 59, 59, 999))
      }
    }
  });

  return `AF-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

async function generateAutomaticTags(subject: string, description: string, category: string): Promise<string[]> {
  const tags: string[] = [category];
  const content = `${subject} ${description}`.toLowerCase();

  // Technical tags
  if (content.includes('login') || content.includes('sign in')) tags.push('authentication');
  if (content.includes('password') || content.includes('reset')) tags.push('password');
  if (content.includes('mobile') || content.includes('app')) tags.push('mobile');
  if (content.includes('slow') || content.includes('performance')) tags.push('performance');
  if (content.includes('error') || content.includes('bug')) tags.push('bug');
  
  // Feature tags
  if (content.includes('draft')) tags.push('draft');
  if (content.includes('trade')) tags.push('trading');
  if (content.includes('lineup')) tags.push('lineup');
  if (content.includes('waiver')) tags.push('waivers');
  if (content.includes('league')) tags.push('league');
  
  // Priority tags
  if (content.includes('urgent') || content.includes('asap')) tags.push('urgent');
  if (content.includes('cannot') || content.includes('broken')) tags.push('blocking');

  return [...new Set(tags)];
}

async function autoAssignTicket(ticketId: string, category: string): Promise<any> {
  // Get available support agents for this category
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ['SUPPORT', 'ADMIN'] },
      isActive: true,
      specialties: {
        has: category
      }
    },
    include: {
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: { in: ['open', 'in_progress'] }
            }
          }
        }
      }
    }
  });

  if (agents.length === 0) {
    // Fallback to any available agent
    const fallbackAgents = await prisma.user.findMany({
      where: {
        role: { in: ['SUPPORT', 'ADMIN'] },
        isActive: true
      },
      include: {
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { in: ['open', 'in_progress'] }
              }
            }
          }
        }
      }
    });

    if (fallbackAgents.length === 0) return null;
    agents.push(...fallbackAgents);
  }

  // Assign to agent with least workload
  const assignedAgent = agents.reduce((prev, current) => 
    (prev._count.assignedTickets < current._count.assignedTickets) ? prev : current
  );

  return assignedAgent;
}

async function notifyNewTicket(ticket: SupportTicket): Promise<void> {
  try {
    // Send notification to support team via webhook or email service
    const supportNotification = {
      type: 'new_ticket',
      ticket: {
        id: ticket.id,
        number: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        user: ticket.userId
      }
    };

    // Integration with Slack, Teams, or email service would go here
    console.log('New support ticket notification:', supportNotification);
  } catch (error) {
    console.error('Failed to send new ticket notification:', error);
  }
}

async function notifyTicketParticipants(ticketId: string, message: TicketMessage, excludeUserId: string): Promise<void> {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: true,
        assignedAgent: true
      }
    });

    if (!ticket) return;

    // Notify customer if agent sent message
    if (message.authorType === 'agent' && ticket.userId !== excludeUserId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: 'SUPPORT_REPLY',
          title: `Support Reply: ${ticket.subject}`,
          message: `You have a new reply on your support ticket #${ticket.ticketNumber}`,
          actionUrl: `/support/ticket/${ticket.id}`,
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber
          }
        }
      });
    }

    // Notify agent if customer sent message
    if (message.authorType === 'customer' && ticket.assignedTo && ticket.assignedTo !== excludeUserId) {
      await prisma.notification.create({
        data: {
          userId: ticket.assignedTo,
          type: 'SUPPORT_MESSAGE',
          title: `Customer Reply: ${ticket.subject}`,
          message: `${ticket.user.name} replied to ticket #${ticket.ticketNumber}`,
          actionUrl: `/admin/support/ticket/${ticket.id}`,
          metadata: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to notify ticket participants:', error);
  }
}

async function notifyCustomerStatusChange(userId: string, ticket: any): Promise<void> {
  try {
    const statusMessages: { [key: string]: string } = {
      'in_progress': 'Your support ticket is now being worked on',
      'waiting_for_customer': 'We need additional information from you',
      'resolved': 'Your support ticket has been resolved',
      'closed': 'Your support ticket has been closed'
    };

    const message = statusMessages[ticket.status] || 'Your support ticket status has been updated';

    await prisma.notification.create({
      data: {
        userId,
        type: 'SUPPORT_UPDATE',
        title: `Ticket Update: ${ticket.subject}`,
        message,
        actionUrl: `/support/ticket/${ticket.id}`,
        metadata: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          status: ticket.status
        }
      }
    });
  } catch (error) {
    console.error('Failed to notify customer of status change:', error);
  }
}