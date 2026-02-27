import { FastifyPluginAsync } from 'fastify';
import { analyticsEventsCounter } from '../metrics.js';
import logger from '../utils/logger.js';

interface AnalyticsEventBody {
  event: string;
  device_id: string;
  user_id?: string;
  pair_id?: string;
  timestamp?: string;
  properties?: Record<string, string>;
  platform?: 'ios' | 'web';
  app_version?: string;
  client_ts?: string;
  session_id?: string;
}

const allowedEvents = new Set([
  'category_created',
  'category_edited',
  'category_deleted',
  'categories_reordered',
  'category_expanded',
  'category_collapsed',
  'all_categories_expanded',
  'all_categories_collapsed',
  'item_created',
  'item_edited',
  'item_deleted',
  'item_packages_updated',
  'item_items_updated',
  'notifications_enabled',
  'pair_created',
  'pair_joined',
  'app_opened',
  'search_performed',
  'shelf_filter_applied',
  'filter_cleared',
]);

const analyticsRoutes: FastifyPluginAsync = async (server) => {
  server.post<{ Body: AnalyticsEventBody }>('/analytics', async (request, reply) => {
    const {
      event,
      device_id,
      user_id,
      pair_id,
      timestamp,
      properties = {},
      platform,
      app_version,
      client_ts,
      session_id,
    } = request.body;

    if (!event || !device_id) {
      return reply.status(400).send({ error: 'INVALID_PAYLOAD', message: 'event and device_id are required' });
    }

    if (!allowedEvents.has(event)) {
      return reply.status(400).send({ error: 'INVALID_EVENT', message: `Unsupported event: ${event}` });
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    analyticsEventsCounter.labels({ event }).inc();

    logger.info({
      msg: 'analytics_event',
      event,
      deviceId: device_id,
      userId: user_id,
      pairId: pair_id,
      timestamp: eventTime.toISOString(),
      properties,
      platform: platform || 'unknown',
      appVersion: app_version || 'unknown',
      clientTs: client_ts || null,
      sessionId: session_id || null,
    });

    return { success: true };
  });
};

export default analyticsRoutes;
