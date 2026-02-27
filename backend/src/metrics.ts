import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

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

export const authLoginSuccessCounter = new Counter({
  name: 'freezer_auth_login_success_total',
  help: 'Count of successful login events',
  registers: [register],
});

export const authLoginFailCounter = new Counter({
  name: 'freezer_auth_login_fail_total',
  help: 'Count of failed login events',
  registers: [register],
});

export const authRefreshSuccessCounter = new Counter({
  name: 'freezer_auth_refresh_success_total',
  help: 'Count of successful refresh token exchanges',
  registers: [register],
});

export const authRefreshFailCounter = new Counter({
  name: 'freezer_auth_refresh_fail_total',
  help: 'Count of failed refresh token exchanges',
  registers: [register],
});

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'freezer_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// HTTP error counter
export const httpErrorCounter = new Counter({
  name: 'freezer_http_errors_total',
  help: 'Count of HTTP error responses',
  labelNames: ['method', 'status_code'],
  registers: [register],
});

export function getRegistry() {
  return register;
}
