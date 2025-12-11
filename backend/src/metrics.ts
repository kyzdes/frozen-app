import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

// Default Node/Process metrics
collectDefaultMetrics({ register });

// Custom counters
export const analyticsEventsCounter = new Counter({
  name: 'freezer_analytics_events_total',
  help: 'Count of analytics events by name',
  labelNames: ['event'],
  registers: [register],
});

export function getRegistry() {
  return register;
}
