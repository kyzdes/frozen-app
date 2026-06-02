import { nowISO } from '../domain/mappers';
import type { AppState, HistoryEvent, Item, PendingChange, PendingChangeType } from '../domain/models';

export function getItemsWord(count: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') {
    return count === 1 ? 'item' : 'items';
  }

  if (count % 10 === 1 && count % 100 !== 11) return 'заготовка';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заготовки';
  return 'заготовок';
}

export function getDaysWord(count: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') {
    return Math.abs(count) === 1 ? 'day' : 'days';
  }

  const absCount = Math.abs(count);
  if (absCount % 10 === 1 && absCount % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(absCount % 10) && ![12, 13, 14].includes(absCount % 100)) return 'дня';
  return 'дней';
}

export function getExpirationState(item: Item): { type: 'fresh' | 'soon' | 'expired'; daysLeft: number } {
  // expirationDate is stored as UTC midnight ('YYYY-MM-DDT00:00:00.000Z'), so we
  // compare whole-day differences between LOCAL midnights to avoid timezone skew.
  const parsed = new Date(item.expirationDate);
  const expirationLocalMidnight = new Date(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  ).getTime();

  const now = new Date();
  const todayLocalMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const daysLeft = Math.round((expirationLocalMidnight - todayLocalMidnight) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { type: 'expired', daysLeft };
  if (daysLeft <= 30) return { type: 'soon', daysLeft };
  return { type: 'fresh', daysLeft };
}

export function historyText(event: HistoryEvent, lang: 'ru' | 'en'): string {
  if (lang === 'en') {
    switch (event.type) {
      case 'item_added':
        return `Added: ${event.itemName}`;
      case 'item_updated':
        return `Updated: ${event.itemName}`;
      case 'item_deleted':
        return `Deleted: ${event.itemName}`;
      case 'packages_changed':
        return `${event.itemName}: ${event.packagesDelta && event.packagesDelta > 0 ? '+' : ''}${event.packagesDelta ?? 0} packs`;
      case 'items_changed':
        return `${event.itemName}: ${event.itemsDelta && event.itemsDelta > 0 ? '+' : ''}${event.itemsDelta ?? 0} units`;
      default:
        return event.itemName;
    }
  }

  switch (event.type) {
    case 'item_added':
      return `Добавлено: ${event.itemName}`;
    case 'item_updated':
      return `Обновлено: ${event.itemName}`;
    case 'item_deleted':
      return `Удалено: ${event.itemName}`;
    case 'packages_changed':
      return `${event.itemName}: ${event.packagesDelta && event.packagesDelta > 0 ? '+' : ''}${event.packagesDelta ?? 0} уп.`;
    case 'items_changed':
      return `${event.itemName}: ${event.itemsDelta && event.itemsDelta > 0 ? '+' : ''}${event.itemsDelta ?? 0} шт.`;
    default:
      return event.itemName;
  }
}

export function createPendingChange(
  type: PendingChangeType,
  entityId: string,
  payload: Partial<Pick<PendingChange, 'category' | 'item' | 'historyEvent'>>
): PendingChange {
  return {
    id: crypto.randomUUID(),
    type,
    entityId,
    timestamp: nowISO(),
    ...payload,
  };
}

export function buildHistoryEvent(
  type: HistoryEvent['type'],
  item: Item,
  payload?: Partial<HistoryEvent>
): HistoryEvent {
  const now = nowISO();
  return {
    id: crypto.randomUUID(),
    type,
    itemId: item.id,
    categoryId: item.categoryId,
    itemName: item.name,
    timestamp: now,
    updatedAt: now,
    deletedAt: null,
    packagesDelta: payload?.packagesDelta,
    itemsDelta: payload?.itemsDelta,
  };
}

export function syncStatusLabel(state: AppState['sync']['status']['state'], lang: 'ru' | 'en'): string {
  const map = {
    ru: {
      idle: 'Ожидание',
      syncing: 'Синхронизация…',
      success: 'Синхронизировано',
      offline: 'Офлайн',
      error: 'Ошибка',
    },
    en: {
      idle: 'Idle',
      syncing: 'Syncing…',
      success: 'Synced',
      offline: 'Offline',
      error: 'Error',
    },
  };

  return map[lang][state];
}
