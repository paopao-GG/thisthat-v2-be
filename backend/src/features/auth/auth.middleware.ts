import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * JWT authentication middleware
 * Verifies the access token and attaches user info to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({
        success: false,
        error: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = request.server.jwt.verify(token) as { userId: string; email: string };

    // Attach user info to request
    (request as any).user = decoded;

    // Continue to next handler
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      reply.status(401).send({
        success: false,
        error: 'Token expired',
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      reply.status(401).send({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    request.log.error(error);
    reply.status(500).send({
      success: false,
      error: 'Authentication error',
    });
    return;
  }
}
