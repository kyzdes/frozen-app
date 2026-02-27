import type { Item } from '../domain/models';

const NOTIFICATION_SENT_KEY = 'freezer-web-notification-sent';
const MAX_TIMER_MS = 2147483647; // ~24.8 days (setTimeout max)

interface SentMap {
  [id: string]: string;
}

function readSentMap(): SentMap {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_SENT_KEY) || '{}') as SentMap;
  } catch {
    return {};
  }
}

function writeSentMap(map: SentMap): void {
  localStorage.setItem(NOTIFICATION_SENT_KEY, JSON.stringify(map));
}

export class WebNotificationService {
  private timers: number[] = [];
  private periodicCheckTimer: number | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
    } catch {
      this.registration = null;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    return Notification.requestPermission();
  }

  clearSchedules(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];

    if (this.periodicCheckTimer) {
      window.clearInterval(this.periodicCheckTimer);
      this.periodicCheckTimer = null;
    }
  }

  schedule(items: Item[], enabled: boolean, days: number[]): void {
    this.clearSchedules();

    if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const activeItems = items.filter((item) => !item.deletedAt);

    for (const item of activeItems) {
      for (const day of days) {
        this.scheduleSingle(item, day);
      }
    }

    this.periodicCheckTimer = window.setInterval(() => {
      this.fireDueNotifications(activeItems, days);
    }, 60 * 60 * 1000);
  }

  private scheduleSingle(item: Item, day: number): void {
    const expirationTs = new Date(item.expirationDate).getTime();
    if (Number.isNaN(expirationTs)) {
      return;
    }

    const dueTs = expirationTs - day * 24 * 60 * 60 * 1000;
    const delay = dueTs - Date.now();

    if (delay <= 0 || delay > MAX_TIMER_MS) {
      return;
    }

    const timer = window.setTimeout(() => {
      void this.showNotification(item, day);
    }, delay);

    this.timers.push(timer);
  }

  private fireDueNotifications(items: Item[], days: number[]): void {
    const now = Date.now();

    for (const item of items) {
      const expirationTs = new Date(item.expirationDate).getTime();
      if (Number.isNaN(expirationTs)) {
        continue;
      }

      for (const day of days) {
        const dueTs = expirationTs - day * 24 * 60 * 60 * 1000;
        if (dueTs <= now) {
          void this.showNotification(item, day);
        }
      }
    }
  }

  private async showNotification(item: Item, day: number): Promise<void> {
    const dedupeKey = `${item.id}:${day}`;
    const sentMap = readSentMap();

    if (sentMap[dedupeKey]) {
      return;
    }

    const title = 'FreezerApp';
    const body = `${item.name}: срок годности через ${day} дн.`;

    try {
      if (this.registration) {
        await this.registration.showNotification(title, {
          body,
          tag: dedupeKey,
          data: {
            itemId: item.id,
            day,
          },
        });
      } else {
        new Notification(title, { body, tag: dedupeKey });
      }

      sentMap[dedupeKey] = new Date().toISOString();
      writeSentMap(sentMap);
    } catch {
      // Silent failure by design.
    }
  }
}

export const notificationService = new WebNotificationService();
