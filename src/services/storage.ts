import type { AppState, Category } from '../domain/models';
import { nowISO, withCategoryCounts } from '../domain/mappers';

const STORAGE_KEY = 'freezer-web-state-v2';
const SCHEMA_VERSION = 3;

function getDeviceId(): string {
  const existing = localStorage.getItem('freezer-device-id');
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  localStorage.setItem('freezer-device-id', generated);
  return generated;
}

export function createInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    deviceId: getDeviceId(),
    auth: {
      isAuthenticated: false,
    },
    categories: [],
    items: [],
    history: [],
    screen: 'home',
    settings: {
      appLanguage: 'ru',
      appearanceMode: 'system',
      notificationsEnabled: false,
      notificationDays: [3, 7, 14],
      flags: {
        web_sync_engine: true,
        web_settings_v2: true,
        web_notifications: true,
      },
    },
    sync: {
      pair: null,
      lastKnownVersion: 0,
      pendingChanges: [],
      status: {
        state: 'idle',
        pendingChangesCount: 0,
      },
    },
  };
}

function migrateLegacyState(): AppState | null {
  try {
    const legacyCategoriesRaw = localStorage.getItem('freezer-categories');
    const legacyItemsRaw = localStorage.getItem('freezer-items');

    if (!legacyCategoriesRaw && !legacyItemsRaw) {
      return null;
    }

    const now = nowISO();
    const legacyCategories = legacyCategoriesRaw
      ? (JSON.parse(legacyCategoriesRaw) as Array<{
          id: string;
          name: string;
          icon?: string;
          color?: string;
          sortOrder?: number;
        }>)
      : [];
    const legacyItems = legacyItemsRaw
      ? (JSON.parse(legacyItemsRaw) as Array<{
          id: string;
          categoryId: string;
          name: string;
          packages?: number;
          items?: number;
          shelf?: number;
          freezeDate?: string;
          expirationDate?: string;
          notes?: string;
          photo?: string;
        }>)
      : [];

    const next = createInitialState();
    next.categories = legacyCategories.map((category, index) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      itemCount: 0,
      sortOrder: category.sortOrder ?? index,
      updatedAt: now,
      deletedAt: null,
    }));
    next.items = legacyItems.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      packagesCount: item.packages ?? 1,
      itemsCount: item.items ?? 1,
      shelfNumber: item.shelf ?? 1,
      freezeDate: item.freezeDate?.length === 10 ? `${item.freezeDate}T00:00:00.000Z` : (item.freezeDate || now),
      expirationDate: item.expirationDate?.length === 10 ? `${item.expirationDate}T00:00:00.000Z` : (item.expirationDate || now),
      notes: item.notes,
      photoUrl: item.photo,
      updatedAt: now,
      deletedAt: null,
    }));
    next.categories = withCategoryCounts(next.categories, next.items);
    return next;
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      return createInitialState();
    }

    const normalized = {
      ...parsed,
      auth: {
        isAuthenticated: parsed.auth?.isAuthenticated ?? false,
        userId: parsed.auth?.userId,
        userName: parsed.auth?.userName,
        userEmail: parsed.auth?.userEmail,
      },
      categories: withCategoryCounts(parsed.categories ?? [], parsed.items ?? []),
      items: (parsed.items ?? []).filter((item) => !item.deletedAt),
      history: (parsed.history ?? []).filter((event) => !event.deletedAt),
      sync: {
        ...parsed.sync,
        pair: parsed.sync?.pair
          ? {
              ...parsed.sync.pair,
              mode: parsed.sync.pair.mode ?? 'personal',
            }
          : null,
        pendingChanges: parsed.sync?.pendingChanges ?? [],
        status: {
          ...(parsed.sync?.status ?? { state: 'idle', pendingChangesCount: 0 }),
          pendingChangesCount: parsed.sync?.pendingChanges?.length ?? 0,
        },
      },
      settings: {
        appLanguage: parsed.settings?.appLanguage ?? 'ru',
        appearanceMode: parsed.settings?.appearanceMode ?? 'system',
        notificationsEnabled: parsed.settings?.notificationsEnabled ?? false,
        notificationDays: parsed.settings?.notificationDays?.length
          ? parsed.settings.notificationDays
          : [3, 7, 14],
        flags: {
          web_sync_engine: parsed.settings?.flags?.web_sync_engine ?? true,
          web_settings_v2: parsed.settings?.flags?.web_settings_v2 ?? true,
          web_notifications: parsed.settings?.flags?.web_notifications ?? true,
        },
      },
    } as AppState;

    return normalized;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
