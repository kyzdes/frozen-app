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
}

const allowedEvents = new Set([
  'category_created',
  'item_created',
  'notifications_enabled',
  'pair_created',
  'pair_joined',
  'app_opened',
]);

const analyticsRoutes: FastifyPluginAsync = async (server) => {
  server.post<{ Body: AnalyticsEventBody }>('/analytics', async (request, reply) => {
    const { event, device_id, user_id, pair_id, timestamp, properties = {} } = request.body;

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
    });

    return { success: true };
  });
};

export default analyticsRoutes;
