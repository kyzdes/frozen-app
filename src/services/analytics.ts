import { apiClient } from './api-client';
import type { PairSession } from '../domain/models';

const SESSION_KEY = 'freezer-web-session-id';
const APP_VERSION = '0.7.6-web';

function getSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, generated);
  return generated;
}

export async function trackEvent(
  event: string,
  deviceId: string,
  pair: PairSession | null,
  properties?: Record<string, string>
): Promise<void> {
  await apiClient.sendAnalyticsEvent(
    {
      event,
      device_id: deviceId,
      user_id: pair?.userId,
      pair_id: pair?.pairId,
      timestamp: new Date().toISOString(),
      properties,
      platform: 'web',
      app_version: APP_VERSION,
      client_ts: new Date().toISOString(),
      session_id: getSessionId(),
    }
  );
}
