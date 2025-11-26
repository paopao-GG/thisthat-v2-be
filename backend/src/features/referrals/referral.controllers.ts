import type { FastifyRequest, FastifyReply } from 'fastify';
import { getReferralStats } from './referral.services.js';

export async function getReferralStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any)?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }

    const stats = await getReferralStats(userId);

    return reply.send({
      success: true,
      ...stats,
    });
  } catch (error: any) {
    request.log.error({ error, stack: error.stack }, 'Referral stats error');
    if (error.message === 'User not found') {
      return reply.status(404).send({
        success: false,
        error: error.message,
      });
    }

    return reply.status(500).send({
      success: false,
      error: 'Failed to fetch referral stats',
    });
  }
}

