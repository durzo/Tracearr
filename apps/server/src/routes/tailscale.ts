/**
 * Tailscale VPN routes — owner-only endpoints for managing the Tailscale integration
 */

import type { FastifyPluginAsync } from 'fastify';
import { tailscaleEnableSchema, tailscaleExitNodeSchema } from '@tracearr/shared';
import { tailscaleService } from '../services/tailscale.js';

export const tailscaleRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /tailscale/status — Returns current Tailscale status
   */
  app.get('/status', { preHandler: [app.requireOwner] }, async () => {
    return tailscaleService.getLiveInfo();
  });

  /**
   * POST /tailscale/enable — Start daemon and begin auth flow
   */
  app.post('/enable', { preHandler: [app.requireOwner] }, async (request, reply) => {
    const body = tailscaleEnableSchema.safeParse(request.body);
    if (!body.success) {
      return reply.badRequest('Invalid request body');
    }

    return tailscaleService.enable(body.data.hostname);
  });

  /**
   * POST /tailscale/disable — Stop daemon and clear state
   */
  app.post('/disable', { preHandler: [app.requireOwner] }, async () => {
    return tailscaleService.disable();
  });

  /**
   * GET /tailscale/logs — Returns recent daemon stderr output
   */
  app.get('/logs', { preHandler: [app.requireOwner] }, async () => {
    return { logs: tailscaleService.getLogs() };
  });

  /**
   * POST /tailscale/exit-node — Set or clear the exit node
   */
  app.post('/exit-node', { preHandler: [app.requireOwner] }, async (request, reply) => {
    const body = tailscaleExitNodeSchema.safeParse(request.body);
    if (!body.success) {
      return reply.badRequest('Invalid request body');
    }

    return tailscaleService.setExitNode(body.data.id ?? null);
  });

  /**
   * POST /tailscale/reset — Wipe all state (machine identity, auth) for a fresh start
   */
  app.post('/reset', { preHandler: [app.requireOwner] }, async () => {
    return tailscaleService.reset();
  });
};
