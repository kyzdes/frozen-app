import type { HistoryEventType } from './contracts';

export type Screen = 'home' | 'category' | 'item-form' | 'history' | 'settings';

export type AppearanceMode = 'system' | 'light' | 'dark';
export type LanguageCode = 'ru' | 'en';
export type SyncStateType = 'idle' | 'syncing' | 'success' | 'offline' | 'error';
export type PairMode = 'personal' | 'shared' | 'none';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  itemCount: number;
  sortOrder?: number;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Item {
  id: string;
  categoryId: string;
  name: string;
  packagesCount: number;
  itemsCount: number;
  shelfNumber: number;
  freezeDate: string;
  expirationDate: string;
  notes?: string;
  photoUrl?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  itemId?: string;
  categoryId?: string;
  itemName: string;
  packagesDelta?: number;
  itemsDelta?: number;
  timestamp: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PairSession {
  pairId: string;
  userId: string;
  mode: PairMode;
  inviteCode?: string;
  inviteExpiresAt?: string;
  serverVersion: number;
}

export interface SyncStatus {
  state: SyncStateType;
  message?: string;
  pendingChangesCount: number;
  lastSyncAt?: string;
}

export type PendingChangeType =
  | 'categoryAdded'
  | 'categoryUpdated'
  | 'categoryDeleted'
  | 'itemAdded'
  | 'itemUpdated'
  | 'itemDeleted'
  | 'historyAdded';

export interface PendingChange {
  id: string;
  type: PendingChangeType;
  entityId: string;
  timestamp: string;
  category?: Category;
  item?: Item;
  historyEvent?: HistoryEvent;
}

export interface AppSettings {
  appLanguage: LanguageCode;
  appearanceMode: AppearanceMode;
  notificationsEnabled: boolean;
  notificationDays: number[];
  flags: {
    web_sync_engine: boolean;
    web_settings_v2: boolean;
    web_notifications: boolean;
  };
}

export interface AppState {
  schemaVersion: number;
  deviceId: string;
  auth: {
    isAuthenticated: boolean;
    userId?: string;
    userName?: string;
    userEmail?: string;
  };
  categories: Category[];
  items: Item[];
  history: HistoryEvent[];
  selectedCategoryId?: string;
  selectedItemId?: string;
  screen: Screen;
  settings: AppSettings;
  sync: {
    pair: PairSession | null;
    lastKnownVersion: number;
    pendingChanges: PendingChange[];
    status: SyncStatus;
  };
}
