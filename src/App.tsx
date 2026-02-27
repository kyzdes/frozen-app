import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  Download,
  Edit2,
  Filter,
  Link2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AuthResponseDTO, JoinImportMode, SyncDataDTO } from './domain/contracts';
import {
  dateInputToISO,
  isoToDateInput,
  nowISO,
  syncDataFromDTO,
  withCategoryCounts,
} from './domain/mappers';
import type {
  AppState,
  Category,
  HistoryEvent,
  Item,
  PendingChange,
  PendingChangeType,
} from './domain/models';
import { trackEvent } from './services/analytics';
import { apiClient, UnauthorizedError } from './services/api-client';
import { buildBackupPayload, parseBackupPayload } from './services/backup';
import { notificationService } from './services/notifications';
import { loadState, saveState } from './services/storage';
import { applyServerChanges, compactPendingChanges } from './services/sync-engine';

type CategoryDraft = {
  id?: string;
  name: string;
  icon: string;
  color: string;
};

type ItemDraft = {
  id?: string;
  name: string;
  packagesCount: number;
  itemsCount: number;
  shelfNumber: number;
  freezeDate: string;
  expirationDate: string;
  notes: string;
  photoUrl: string;
};

type PairAction = 'create' | 'join';
type AuthMode = 'login' | 'register';

type CopyDictionary = {
  appName: string;
  categories: string;
  history: string;
  settings: string;
  addCategory: string;
  editCategory: string;
  categoryName: string;
  icon: string;
  color: string;
  preview: string;
  save: string;
  cancel: string;
  delete: string;
  addItem: string;
  editItem: string;
  itemName: string;
  notifications: string;
  syncWithPartner: string;
  createShared: string;
  joinShared: string;
  leaveShared: string;
  manualSync: string;
  exportData: string;
  importData: string;
  language: string;
  appearance: string;
  system: string;
  light: string;
  dark: string;
  search: string;
  noCategories: string;
  noItems: string;
  pairCode: string;
  pairName: string;
  done: string;
  status: string;
};

const COPY: Record<'ru' | 'en', CopyDictionary> = {
  ru: {
    appName: 'FreezerApp',
    categories: 'Группы',
    history: 'История',
    settings: 'Настройки',
    addCategory: 'Новая группа',
    editCategory: 'Редактировать группу',
    categoryName: 'Название группы',
    icon: 'Иконка',
    color: 'Цвет',
    preview: 'Предпросмотр',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    addItem: 'Новая заготовка',
    editItem: 'Редактировать заготовку',
    itemName: 'Название',
    notifications: 'Уведомления',
    syncWithPartner: 'Синхронизация с партнером',
    createShared: 'Создать общий холодильник',
    joinShared: 'Подключиться по коду',
    leaveShared: 'Покинуть холодильник',
    manualSync: 'Синхронизировать вручную',
    exportData: 'Экспортировать данные',
    importData: 'Импортировать данные',
    language: 'Язык',
    appearance: 'Оформление',
    system: 'Системная',
    light: 'Светлая',
    dark: 'Темная',
    search: 'Поиск',
    noCategories: 'Группы пока не созданы',
    noItems: 'В группе пока нет заготовок',
    pairCode: 'Код приглашения',
    pairName: 'Название холодильника',
    done: 'Готово',
    status: 'Статус',
  },
  en: {
    appName: 'FreezerApp',
    categories: 'Groups',
    history: 'History',
    settings: 'Settings',
    addCategory: 'New group',
    editCategory: 'Edit group',
    categoryName: 'Group name',
    icon: 'Icon',
    color: 'Color',
    preview: 'Preview',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    addItem: 'New item',
    editItem: 'Edit item',
    itemName: 'Name',
    notifications: 'Notifications',
    syncWithPartner: 'Partner sync',
    createShared: 'Create shared freezer',
    joinShared: 'Join with invite code',
    leaveShared: 'Leave freezer',
    manualSync: 'Sync now',
    exportData: 'Export data',
    importData: 'Import data',
    language: 'Language',
    appearance: 'Appearance',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    search: 'Search',
    noCategories: 'No groups yet',
    noItems: 'No items in this group yet',
    pairCode: 'Invite code',
    pairName: 'Freezer name',
    done: 'Done',
    status: 'Status',
  },
};

const PRESET_ICONS = [
  '🥬', '🥕', '🥦', '🧅', '🍅', '🥒',
  '🍖', '🥩', '🍗', '🥓', '🍤', '🐟',
  '🫐', '🍓', '🍒', '🍇', '🫙', '🍋',
  '🥟', '🥠', '🍝', '🥧', '🧁', '🍰',
  '🥣', '🍜', '🥘', '🥫', '🧈', '🧊',
];

const PRESET_COLORS = [
  '#34C759',
  '#FF3B30',
  '#AF52DE',
  '#5B9FD3',
  '#FF9500',
  '#FFCC00',
  '#FF2D55',
  '#5AC8FA',
];

function getItemsWord(count: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') {
    return count === 1 ? 'item' : 'items';
  }

  if (count % 10 === 1 && count % 100 !== 11) return 'заготовка';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заготовки';
  return 'заготовок';
}

function getDaysWord(count: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') {
    return Math.abs(count) === 1 ? 'day' : 'days';
  }

  const absCount = Math.abs(count);
  if (absCount % 10 === 1 && absCount % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(absCount % 10) && ![12, 13, 14].includes(absCount % 100)) return 'дня';
  return 'дней';
}

function getExpirationState(item: Item): { type: 'fresh' | 'soon' | 'expired'; daysLeft: number } {
  const ms = new Date(item.expirationDate).getTime() - Date.now();
  const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { type: 'expired', daysLeft };
  }

  if (daysLeft <= 30) {
    return { type: 'soon', daysLeft };
  }

  return { type: 'fresh', daysLeft };
}

function historyText(event: HistoryEvent, lang: 'ru' | 'en'): string {
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

function createPendingChange(
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

function buildHistoryEvent(
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

function syncStatusLabel(state: AppState['sync']['status']['state'], lang: 'ru' | 'en'): string {
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

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [homeShelfFilter, setHomeShelfFilter] = useState<number | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryShelfFilter, setCategoryShelfFilter] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [categoryModalDraft, setCategoryModalDraft] = useState<CategoryDraft | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [pairAction, setPairAction] = useState<PairAction | null>(null);
  const [pairInput, setPairInput] = useState('');
  const [pairNameInput, setPairNameInput] = useState('');
  const [joinImportMode, setJoinImportMode] = useState<JoinImportMode>('replace');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stateRef = useRef(state);
  const syncInFlightRef = useRef(false);

  const t = COPY[state.settings.appLanguage];

  const applyAuthPayload = useCallback((payload: Pick<AuthResponseDTO, 'user' | 'pair_context'>) => {
    setState((prev) => ({
      ...prev,
      categories: [],
      items: [],
      history: [],
      selectedCategoryId: undefined,
      selectedItemId: undefined,
      screen: 'home',
      auth: {
        isAuthenticated: true,
        userId: payload.user.id,
        userName: payload.user.name,
        userEmail: payload.user.email,
      },
      sync: {
        ...prev.sync,
        pair: payload.pair_context.active_pair_id
          ? {
              pairId: payload.pair_context.active_pair_id,
              userId: payload.user.id,
              mode: payload.pair_context.mode,
              serverVersion: 0,
            }
          : null,
        lastKnownVersion: 0,
        pendingChanges: [],
        status: {
          state: 'idle',
          pendingChangesCount: 0,
        },
      },
    }));
  }, []);

  const clearSessionState = useCallback(async () => {
    apiClient.clearTokens();
    setState((prev) => ({
      ...prev,
      auth: {
        isAuthenticated: false,
      },
      categories: [],
      items: [],
      history: [],
      selectedCategoryId: undefined,
      selectedItemId: undefined,
      screen: 'home',
      sync: {
        ...prev.sync,
        pair: null,
        lastKnownVersion: 0,
        pendingChanges: [],
        status: {
          state: 'idle',
          pendingChangesCount: 0,
        },
      },
    }));
  }, []);

  useEffect(() => {
    stateRef.current = state;
    saveState(state);
  }, [state]);

  useEffect(() => {
    void notificationService.init();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!apiClient.hasSession()) {
        if (!cancelled) {
          await clearSessionState();
          setAuthBootstrapping(false);
        }
        return;
      }

      try {
        const me = await apiClient.me();
        if (cancelled) {
          return;
        }

        applyAuthPayload({
          user: me.user,
          pair_context: me.pair_context,
        });
      } catch {
        if (cancelled) {
          return;
        }
        await clearSessionState();
      } finally {
        if (!cancelled) {
          setAuthBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applyAuthPayload, clearSessionState]);

  useEffect(() => {
    void trackEvent('app_opened', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, []);

  useEffect(() => {
    if (state.settings.notificationsEnabled && state.settings.flags.web_notifications) {
      notificationService.schedule(state.items, true, state.settings.notificationDays);
    } else {
      notificationService.clearSchedules();
    }
  }, [state.items, state.settings.notificationsEnabled, state.settings.notificationDays, state.settings.flags.web_notifications]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (state.settings.appearanceMode === 'light') {
      root.classList.add('light');
    }
    if (state.settings.appearanceMode === 'dark') {
      root.classList.add('dark');
    }
  }, [state.settings.appearanceMode]);

  const activeCategories = useMemo(() => withCategoryCounts(state.categories, state.items), [state.categories, state.items]);
  const activeItems = useMemo(() => state.items.filter((item) => !item.deletedAt), [state.items]);
  const selectedCategory = useMemo(
    () => activeCategories.find((category) => category.id === state.selectedCategoryId) || null,
    [activeCategories, state.selectedCategoryId]
  );
  const activePairId = state.sync.pair?.pairId ?? null;

  const allShelves = useMemo(() => {
    return Array.from(new Set(activeItems.map((item) => item.shelfNumber))).sort((a, b) => a - b);
  }, [activeItems]);

  const homeFilteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchesSearch =
        !homeSearchQuery ||
        item.name.toLowerCase().includes(homeSearchQuery.toLowerCase()) ||
        (item.notes || '').toLowerCase().includes(homeSearchQuery.toLowerCase());
      const matchesShelf = homeShelfFilter === null || item.shelfNumber === homeShelfFilter;
      return matchesSearch && matchesShelf;
    });
  }, [activeItems, homeSearchQuery, homeShelfFilter]);

  const homeFilteredCategories = useMemo(() => {
    if (!homeSearchQuery && homeShelfFilter === null) {
      return activeCategories;
    }

    const visibleIds = new Set(homeFilteredItems.map((item) => item.categoryId));
    return activeCategories.filter(
      (category) =>
        visibleIds.has(category.id) || category.name.toLowerCase().includes(homeSearchQuery.toLowerCase())
    );
  }, [activeCategories, homeFilteredItems, homeSearchQuery, homeShelfFilter]);

  const categoryItems = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return activeItems
      .filter((item) => item.categoryId === selectedCategory.id)
      .filter((item) => {
        const matchesSearch =
          !categorySearchQuery ||
          item.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
          (item.notes || '').toLowerCase().includes(categorySearchQuery.toLowerCase());
        const matchesShelf = categoryShelfFilter === null || item.shelfNumber === categoryShelfFilter;
        return matchesSearch && matchesShelf;
      });
  }, [selectedCategory, activeItems, categorySearchQuery, categoryShelfFilter]);

  const syncNow = useCallback(async () => {
    const current = stateRef.current;
    const pair = current.sync.pair;

    if (!pair || !current.settings.flags.web_sync_engine) {
      return;
    }

    if (syncInFlightRef.current) {
      return;
    }

    if (!navigator.onLine) {
      setState((prev) => ({
        ...prev,
        sync: {
          ...prev.sync,
          status: {
            ...prev.sync.status,
            state: 'offline',
            pendingChangesCount: prev.sync.pendingChanges.length,
          },
        },
      }));
      return;
    }

    syncInFlightRef.current = true;
    setSyncingNow(true);

    setState((prev) => ({
      ...prev,
      sync: {
        ...prev.sync,
        status: {
          ...prev.sync.status,
          state: 'syncing',
          message: undefined,
          pendingChangesCount: prev.sync.pendingChanges.length,
        },
      },
    }));

    const payload: SyncDataDTO = compactPendingChanges(current.sync.pendingChanges);

    try {
      const response = await apiClient.sync(
        current.sync.lastKnownVersion,
        payload
      );

      setState((prev) => {
        const applied = applyServerChanges(prev, response.server_changes);
        const nextServerVersion = Number.parseInt(response.server_version, 10) || prev.sync.lastKnownVersion;

        return {
          ...applied,
          sync: {
            ...applied.sync,
            lastKnownVersion: nextServerVersion,
            pair: applied.sync.pair
              ? {
                  ...applied.sync.pair,
                  serverVersion: nextServerVersion,
                }
              : null,
            pendingChanges: [],
            status: {
              state: 'success',
              pendingChangesCount: 0,
              lastSyncAt: nowISO(),
            },
          },
        };
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        await clearSessionState();
      } else {
        setState((prev) => ({
          ...prev,
          sync: {
            ...prev.sync,
            status: {
              ...prev.sync.status,
              state: navigator.onLine ? 'error' : 'offline',
              message: error instanceof Error ? error.message : 'Sync error',
              pendingChangesCount: prev.sync.pendingChanges.length,
            },
          },
        }));
      }
    } finally {
      syncInFlightRef.current = false;
      setSyncingNow(false);
    }
  }, [clearSessionState]);

  useEffect(() => {
    if (!activePairId || !state.settings.flags.web_sync_engine) {
      return;
    }

    void syncNow();

    const timer = window.setInterval(() => {
      void syncNow();
    }, 5000);

    const onOnline = () => {
      void syncNow();
    };

    window.addEventListener('online', onOnline);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [activePairId, state.settings.flags.web_sync_engine, syncNow]);

  const openCategoryModal = useCallback((category?: Category) => {
    setCategoryModalDraft({
      id: category?.id,
      name: category?.name || '',
      icon: category?.icon || '🥬',
      color: category?.color || '#34C759',
    });
    setShowCategoryModal(true);
  }, []);

  const saveCategory = useCallback(() => {
    if (!categoryModalDraft || !categoryModalDraft.name.trim()) {
      return;
    }

    const now = nowISO();

    if (categoryModalDraft.id) {
      setState((prev) => {
        const categories = prev.categories.map((category) =>
          category.id === categoryModalDraft.id
            ? {
                ...category,
                name: categoryModalDraft.name.trim(),
                icon: categoryModalDraft.icon,
                color: categoryModalDraft.color,
                updatedAt: now,
              }
            : category
        );

        const updatedCategory = categories.find((category) => category.id === categoryModalDraft.id);
        if (!updatedCategory) {
          return prev;
        }

        const pending = [
          ...prev.sync.pendingChanges,
          createPendingChange('categoryUpdated', updatedCategory.id, { category: updatedCategory }),
        ];

        return {
          ...prev,
          categories: withCategoryCounts(categories, prev.items),
          sync: {
            ...prev.sync,
            pendingChanges: pending,
            status: {
              ...prev.sync.status,
              pendingChangesCount: pending.length,
            },
          },
        };
      });

      void trackEvent('category_edited', stateRef.current.deviceId, stateRef.current.sync.pair);
    } else {
      setState((prev) => {
        const category: Category = {
          id: crypto.randomUUID(),
          name: categoryModalDraft.name.trim(),
          icon: categoryModalDraft.icon,
          color: categoryModalDraft.color,
          itemCount: 0,
          sortOrder: prev.categories.length,
          updatedAt: now,
          deletedAt: null,
        };

        const categories = [...prev.categories, category];
        const pending = [
          ...prev.sync.pendingChanges,
          createPendingChange('categoryAdded', category.id, { category }),
        ];

        return {
          ...prev,
          categories: withCategoryCounts(categories, prev.items),
          sync: {
            ...prev.sync,
            pendingChanges: pending,
            status: {
              ...prev.sync.status,
              pendingChangesCount: pending.length,
            },
          },
        };
      });

      void trackEvent('category_created', stateRef.current.deviceId, stateRef.current.sync.pair);
    }

    setShowCategoryModal(false);
    setCategoryModalDraft(null);
  }, [categoryModalDraft]);

  const deleteCategory = useCallback((categoryId: string) => {
    const now = nowISO();

    setState((prev) => {
      const category = prev.categories.find((entry) => entry.id === categoryId);
      if (!category) {
        return prev;
      }

      const categoryDelete: Category = {
        ...category,
        updatedAt: now,
        deletedAt: now,
      };

      const deletedItems = prev.items
        .filter((item) => item.categoryId === categoryId)
        .map((item) => ({
          ...item,
          updatedAt: now,
          deletedAt: now,
        }));

      const categories = prev.categories.filter((entry) => entry.id !== categoryId);
      const items = prev.items.filter((item) => item.categoryId !== categoryId);

      const pendingChanges = [
        ...prev.sync.pendingChanges,
        createPendingChange('categoryDeleted', categoryId, { category: categoryDelete }),
        ...deletedItems.map((item) => createPendingChange('itemDeleted', item.id, { item })),
      ];

      return {
        ...prev,
        categories: withCategoryCounts(categories, items),
        items,
        sync: {
          ...prev.sync,
          pendingChanges,
          status: {
            ...prev.sync.status,
            pendingChangesCount: pendingChanges.length,
          },
        },
      };
    });

    void trackEvent('category_deleted', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, []);

  const reorderCategories = useCallback((targetId: string) => {
    if (!draggedCategoryId || draggedCategoryId === targetId) {
      return;
    }

    setState((prev) => {
      const categories = [...prev.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const sourceIndex = categories.findIndex((category) => category.id === draggedCategoryId);
      const targetIndex = categories.findIndex((category) => category.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return prev;
      }

      const [moved] = categories.splice(sourceIndex, 1);
      categories.splice(targetIndex, 0, moved);

      const now = nowISO();
      const reordered = categories.map((category, index) => ({
        ...category,
        sortOrder: index,
        updatedAt: now,
      }));

      const pendingChanges = [
        ...prev.sync.pendingChanges,
        ...reordered.map((category) => createPendingChange('categoryUpdated', category.id, { category })),
      ];

      return {
        ...prev,
        categories: withCategoryCounts(reordered, prev.items),
        sync: {
          ...prev.sync,
          pendingChanges: pendingChanges,
          status: {
            ...prev.sync.status,
            pendingChangesCount: pendingChanges.length,
          },
        },
      };
    });

    setDraggedCategoryId(null);
    void trackEvent('categories_reordered', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, [draggedCategoryId]);

  const openCategory = useCallback((categoryId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCategoryId: categoryId,
      selectedItemId: undefined,
      screen: 'category',
    }));
  }, []);

  const openItemForm = useCallback((item?: Item) => {
    if (!stateRef.current.selectedCategoryId) {
      return;
    }

    if (item) {
      setItemDraft({
        id: item.id,
        name: item.name,
        packagesCount: item.packagesCount,
        itemsCount: item.itemsCount,
        shelfNumber: item.shelfNumber,
        freezeDate: isoToDateInput(item.freezeDate),
        expirationDate: isoToDateInput(item.expirationDate),
        notes: item.notes || '',
        photoUrl: item.photoUrl || '',
      });
    } else {
      setItemDraft({
        name: '',
        packagesCount: 1,
        itemsCount: 1,
        shelfNumber: 1,
        freezeDate: isoToDateInput(nowISO()),
        expirationDate: '',
        notes: '',
        photoUrl: '',
      });
    }

    setState((prev) => ({
      ...prev,
      selectedItemId: item?.id,
      screen: 'item-form',
    }));
  }, []);

  const saveItem = useCallback(() => {
    const current = stateRef.current;
    const categoryId = current.selectedCategoryId;

    if (!categoryId || !itemDraft || !itemDraft.name.trim() || !itemDraft.expirationDate) {
      return;
    }

    const now = nowISO();

    if (itemDraft.id) {
      setState((prev) => {
        const items = prev.items.map((item) =>
          item.id === itemDraft.id
            ? {
                ...item,
                name: itemDraft.name.trim(),
                packagesCount: Math.max(0, itemDraft.packagesCount),
                itemsCount: Math.max(0, itemDraft.itemsCount),
                shelfNumber: Math.max(1, itemDraft.shelfNumber),
                freezeDate: dateInputToISO(itemDraft.freezeDate),
                expirationDate: dateInputToISO(itemDraft.expirationDate),
                notes: itemDraft.notes.trim() || undefined,
                photoUrl: itemDraft.photoUrl || undefined,
                updatedAt: now,
              }
            : item
        );

        const updated = items.find((item) => item.id === itemDraft.id);
        if (!updated) {
          return prev;
        }

        const historyEvent = buildHistoryEvent('item_updated', updated);
        const history = [historyEvent, ...prev.history].slice(0, 500);

        const pendingChanges = [
          ...prev.sync.pendingChanges,
          createPendingChange('itemUpdated', updated.id, { item: updated }),
          createPendingChange('historyAdded', historyEvent.id, { historyEvent }),
        ];

        return {
          ...prev,
          items,
          categories: withCategoryCounts(prev.categories, items),
          history,
          sync: {
            ...prev.sync,
            pendingChanges,
            status: {
              ...prev.sync.status,
              pendingChangesCount: pendingChanges.length,
            },
          },
        };
      });

      void trackEvent('item_edited', current.deviceId, current.sync.pair);
    } else {
      setState((prev) => {
        const item: Item = {
          id: crypto.randomUUID(),
          categoryId,
          name: itemDraft.name.trim(),
          packagesCount: Math.max(0, itemDraft.packagesCount),
          itemsCount: Math.max(0, itemDraft.itemsCount),
          shelfNumber: Math.max(1, itemDraft.shelfNumber),
          freezeDate: dateInputToISO(itemDraft.freezeDate),
          expirationDate: dateInputToISO(itemDraft.expirationDate),
          notes: itemDraft.notes.trim() || undefined,
          photoUrl: itemDraft.photoUrl || undefined,
          updatedAt: now,
          deletedAt: null,
        };

        const historyEvent = buildHistoryEvent('item_added', item);
        const items = [...prev.items, item];
        const history = [historyEvent, ...prev.history].slice(0, 500);

        const pendingChanges = [
          ...prev.sync.pendingChanges,
          createPendingChange('itemAdded', item.id, { item }),
          createPendingChange('historyAdded', historyEvent.id, { historyEvent }),
        ];

        return {
          ...prev,
          items,
          history,
          categories: withCategoryCounts(prev.categories, items),
          sync: {
            ...prev.sync,
            pendingChanges,
            status: {
              ...prev.sync.status,
              pendingChangesCount: pendingChanges.length,
            },
          },
        };
      });

      void trackEvent('item_created', current.deviceId, current.sync.pair);
    }

    setState((prev) => ({
      ...prev,
      screen: 'category',
      selectedItemId: undefined,
    }));
  }, [itemDraft]);

  const deleteItem = useCallback((itemId: string) => {
    const now = nowISO();

    setState((prev) => {
      const found = prev.items.find((item) => item.id === itemId);
      if (!found) {
        return prev;
      }

      const deleted = {
        ...found,
        updatedAt: now,
        deletedAt: now,
      };

      const historyEvent = buildHistoryEvent('item_deleted', found);
      const items = prev.items.filter((item) => item.id !== itemId);
      const history = [historyEvent, ...prev.history].slice(0, 500);
      const pendingChanges = [
        ...prev.sync.pendingChanges,
        createPendingChange('itemDeleted', deleted.id, { item: deleted }),
        createPendingChange('historyAdded', historyEvent.id, { historyEvent }),
      ];

      return {
        ...prev,
        items,
        history,
        categories: withCategoryCounts(prev.categories, items),
        sync: {
          ...prev.sync,
          pendingChanges,
          status: {
            ...prev.sync.status,
            pendingChangesCount: pendingChanges.length,
          },
        },
      };
    });

    void trackEvent('item_deleted', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, []);

  const updateItemCount = useCallback((itemId: string, field: 'packagesCount' | 'itemsCount', delta: number) => {
    const now = nowISO();

    setState((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const nextValue = Math.max(0, item[field] + delta);
        return {
          ...item,
          [field]: nextValue,
          updatedAt: now,
        };
      });

      const updated = items.find((item) => item.id === itemId);
      if (!updated) {
        return prev;
      }

      const historyEvent = buildHistoryEvent(
        field === 'packagesCount' ? 'packages_changed' : 'items_changed',
        updated,
        field === 'packagesCount' ? { packagesDelta: delta } : { itemsDelta: delta }
      );
      const history = [historyEvent, ...prev.history].slice(0, 500);

      const pendingChanges = [
        ...prev.sync.pendingChanges,
        createPendingChange('itemUpdated', updated.id, { item: updated }),
        createPendingChange('historyAdded', historyEvent.id, { historyEvent }),
      ];

      return {
        ...prev,
        items,
        history,
        sync: {
          ...prev.sync,
          pendingChanges,
          status: {
            ...prev.sync.status,
            pendingChangesCount: pendingChanges.length,
          },
        },
      };
    });

    void trackEvent(
      field === 'packagesCount' ? 'item_packages_updated' : 'item_items_updated',
      stateRef.current.deviceId,
      stateRef.current.sync.pair
    );
  }, []);

  const closeItemForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: 'category',
      selectedItemId: undefined,
    }));
  }, []);

  const goHome = useCallback(() => {
    setCategorySearchQuery('');
    setCategoryShelfFilter(null);
    setState((prev) => ({
      ...prev,
      screen: 'home',
      selectedCategoryId: undefined,
      selectedItemId: undefined,
    }));
  }, []);

  const requestNotificationAccess = useCallback(async () => {
    const permission = await notificationService.requestPermission();

    if (permission === 'granted') {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          notificationsEnabled: true,
        },
      }));

      await trackEvent('notifications_enabled', stateRef.current.deviceId, stateRef.current.sync.pair);
    } else {
      setErrorMessage(state.settings.appLanguage === 'ru' ? 'Браузер отклонил уведомления.' : 'Browser denied notifications.');
    }
  }, [state.settings.appLanguage]);

  const exportBackup = useCallback(() => {
    const payload = buildBackupPayload({
      categories: stateRef.current.categories,
      items: stateRef.current.items,
      history: stateRef.current.history,
    });

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `freezer_backup_${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const importBackup = useCallback(async (file: File) => {
    const raw = await file.text();

    try {
      const parsed = parseBackupPayload(raw);

      setState((prev) => {
        const pendingChanges = [
          ...prev.sync.pendingChanges,
          ...parsed.categories.map((category) => createPendingChange('categoryUpdated', category.id, { category })),
          ...parsed.items.map((item) => createPendingChange('itemUpdated', item.id, { item })),
          ...parsed.history.map((historyEvent) => createPendingChange('historyAdded', historyEvent.id, { historyEvent })),
        ];

        return {
          ...prev,
          categories: withCategoryCounts(parsed.categories, parsed.items),
          items: parsed.items,
          history: parsed.history,
          sync: {
            ...prev.sync,
            pendingChanges,
            status: {
              ...prev.sync.status,
              pendingChangesCount: pendingChanges.length,
            },
          },
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Backup import failed');
    }
  }, []);

  const startCreatePair = useCallback(() => {
    setPairAction('create');
    setPairNameInput('');
    setPairInput('');
    setJoinImportMode('replace');
  }, []);

  const startJoinPair = useCallback(() => {
    setPairAction('join');
    setPairNameInput('');
    setPairInput('');
    setJoinImportMode('replace');
  }, []);

  const submitPairAction = useCallback(async () => {
    if (!pairAction) {
      return;
    }

    try {
      if (pairAction === 'create') {
        if (!pairNameInput.trim()) {
          setErrorMessage(state.settings.appLanguage === 'ru' ? 'Введите название холодильника' : 'Enter freezer name');
          return;
        }

        const response = await apiClient.createPair(pairNameInput.trim());
        const serverVersion = Number.parseInt(response.server_version, 10) || 0;

        setState((prev) => ({
          ...prev,
          sync: {
            ...prev.sync,
            pair: {
              pairId: response.pair_id,
              userId: response.user_id,
              mode: response.pair_context.mode,
              inviteCode: response.invite_code,
              inviteExpiresAt: response.invite_expires_at,
              serverVersion,
            },
            lastKnownVersion: serverVersion,
            status: {
              ...prev.sync.status,
              state: 'success',
              message: undefined,
            },
          },
        }));

        await trackEvent('pair_created', state.deviceId, {
          pairId: response.pair_id,
          userId: response.user_id,
          mode: response.pair_context.mode,
          serverVersion,
          inviteCode: response.invite_code,
          inviteExpiresAt: response.invite_expires_at,
        });
      }

      if (pairAction === 'join') {
        if (!pairInput.trim()) {
          setErrorMessage(state.settings.appLanguage === 'ru' ? 'Введите код приглашения' : 'Enter invite code');
          return;
        }

        const response = await apiClient.joinPair(pairInput.trim(), joinImportMode);
        const serverVersion = Number.parseInt(response.server_version, 10) || 0;
        const synced = syncDataFromDTO(response.initial_data);

        setState((prev) => ({
          ...prev,
          categories: withCategoryCounts(synced.categories, synced.items),
          items: synced.items,
          history: synced.history,
          sync: {
            ...prev.sync,
            pair: {
              pairId: response.pair_id,
              userId: response.user_id,
              mode: response.pair_context.mode,
              serverVersion,
            },
            lastKnownVersion: serverVersion,
            pendingChanges: [],
            status: {
              state: 'success',
              pendingChangesCount: 0,
              message: undefined,
            },
          },
        }));

        await trackEvent('pair_joined', state.deviceId, {
          pairId: response.pair_id,
          userId: response.user_id,
          mode: response.pair_context.mode,
          serverVersion,
          importMode: joinImportMode,
        });
      }

      setPairAction(null);
      setPairInput('');
      setPairNameInput('');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Pair action failed');
    }
  }, [joinImportMode, pairAction, pairInput, pairNameInput, state.deviceId, state.settings.appLanguage]);

  const leavePair = useCallback(async () => {
    const pair = stateRef.current.sync.pair;
    if (!pair) {
      return;
    }

    try {
      const response = await apiClient.leavePair();
      const synced = syncDataFromDTO(response.initial_data);
      const serverVersion = Number.parseInt(response.server_version, 10) || 0;

      setState((prev) => ({
        ...prev,
        categories: withCategoryCounts(synced.categories, synced.items),
        items: synced.items,
        history: synced.history,
        sync: {
          ...prev.sync,
          pair: {
            pairId: response.pair_id,
            userId: prev.auth.userId || pair.userId,
            mode: response.pair_context.mode,
            serverVersion,
          },
          lastKnownVersion: serverVersion,
          pendingChanges: [],
          status: {
            state: 'success',
            pendingChangesCount: 0,
          },
        },
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to leave shared freezer');
    }
  }, []);

  const submitAuth = useCallback(async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setErrorMessage(state.settings.appLanguage === 'ru' ? 'Введите email и пароль' : 'Enter email and password');
      return;
    }

    if (authMode === 'register' && !authName.trim()) {
      setErrorMessage(state.settings.appLanguage === 'ru' ? 'Введите имя' : 'Enter name');
      return;
    }

    setAuthLoading(true);
    setErrorMessage(null);

    try {
      const response =
        authMode === 'register'
          ? await apiClient.register(authName.trim(), authEmail.trim(), authPassword)
          : await apiClient.login(authEmail.trim(), authPassword);

      applyAuthPayload(response);
      setAuthPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthPayload, authEmail, authMode, authName, authPassword, state.settings.appLanguage]);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      await apiClient.logout();
      await clearSessionState();
    } finally {
      setAuthLoading(false);
    }
  }, [clearSessionState]);

  const totalItems = activeItems.length;

  if (authBootstrapping) {
    return (
      <div className="app-root auth-gate">
        <div className="auth-card">
          <h1>FreezerApp</h1>
          <p>{state.settings.appLanguage === 'ru' ? 'Проверяем сессию…' : 'Restoring session…'}</p>
        </div>
      </div>
    );
  }

  if (!state.auth.isAuthenticated) {
    const ru = state.settings.appLanguage === 'ru';

    return (
      <div className="app-root auth-gate">
        <div className="auth-card">
          <h1>FreezerApp</h1>
          <p>{ru ? 'Войдите в аккаунт, чтобы открыть холодильник' : 'Sign in to access your freezer'}</p>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
              type="button"
            >
              {ru ? 'Вход' : 'Login'}
            </button>
            <button
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              {ru ? 'Регистрация' : 'Register'}
            </button>
          </div>

          <div className="auth-form">
            {authMode === 'register' && (
              <label>
                {ru ? 'Имя' : 'Name'}
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder={ru ? 'Ваше имя' : 'Your name'}
                />
              </label>
            )}

            <label>
              Email
              <input
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>

            <label>
              {ru ? 'Пароль' : 'Password'}
              <input
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder={ru ? 'Минимум 8 символов' : 'At least 8 characters'}
                type="password"
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />
            </label>

            <button className="pill primary auth-submit" onClick={() => void submitAuth()} disabled={authLoading}>
              {authLoading
                ? ru ? 'Подождите…' : 'Please wait…'
                : authMode === 'register'
                  ? ru ? 'Создать аккаунт' : 'Create account'
                  : ru ? 'Войти' : 'Sign in'}
            </button>
          </div>

          {errorMessage ? (
            <div className="error-banner inline">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        {state.screen === 'home' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <h1>{t.appName}</h1>
                <p>
                  {totalItems} {getItemsWord(totalItems, state.settings.appLanguage)} · {activeCategories.length}
                </p>
              </div>
              <button
                className="pill"
                onClick={() => {
                  setExpandedCategories((prev) => {
                    if (prev.size === activeCategories.length) {
                      return new Set();
                    }
                    return new Set(activeCategories.map((category) => category.id));
                  });
                }}
              >
                {expandedCategories.size === activeCategories.length ? 'Свернуть' : 'Развернуть'}
              </button>
            </header>

            <div className="toolbar-row">
              <button className="icon-button" onClick={() => setState((prev) => ({ ...prev, screen: 'history' }))}>
                <Clock3 size={18} />
              </button>
              <button className="icon-button" onClick={() => setState((prev) => ({ ...prev, screen: 'settings' }))}>
                <Settings size={18} />
              </button>
              <div className="search-control">
                <Search size={16} />
                <input
                  value={homeSearchQuery}
                  onChange={(event) => setHomeSearchQuery(event.target.value)}
                  placeholder={t.search}
                />
              </div>
              <button className="fab-sm" onClick={() => openCategoryModal()}>
                <Plus size={18} />
              </button>
            </div>

            {allShelves.length > 0 && (
              <div className="chip-row">
                <button
                  className={`chip ${homeShelfFilter === null ? 'chip-active' : ''}`}
                  onClick={() => {
                    setHomeShelfFilter(null);
                    void trackEvent('filter_cleared', state.deviceId, state.sync.pair);
                  }}
                >
                  <Filter size={14} />
                  Все полки
                </button>
                {allShelves.map((shelf) => (
                  <button
                    key={shelf}
                    className={`chip ${homeShelfFilter === shelf ? 'chip-active' : ''}`}
                    onClick={() => {
                      setHomeShelfFilter(shelf);
                      void trackEvent('shelf_filter_applied', state.deviceId, state.sync.pair, { shelf: String(shelf) });
                    }}
                  >
                    Полка {shelf}
                  </button>
                ))}
              </div>
            )}

            <div className="list-stack">
              {homeFilteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const previewItems = homeFilteredItems.filter((item) => item.categoryId === category.id).slice(0, 4);

                return (
                  <article
                    key={category.id}
                    className="card"
                    draggable
                    onDragStart={() => setDraggedCategoryId(category.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => reorderCategories(category.id)}
                  >
                    <div className="category-row" onClick={() => openCategory(category.id)}>
                      <div className="category-badge" style={{ backgroundColor: category.color || '#5B9FD3' }}>
                        {category.icon || '📦'}
                      </div>

                      <div className="category-meta">
                        <strong>{category.name}</strong>
                        <span>
                          {category.itemCount} {getItemsWord(category.itemCount, state.settings.appLanguage)}
                        </span>
                      </div>

                      <div className="category-actions">
                        <button
                          className="icon-button tiny"
                          onClick={(event) => {
                            event.stopPropagation();
                            openCategoryModal(category);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="icon-button tiny danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteCategory(category.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          className="icon-button tiny"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedCategories((prev) => {
                              const next = new Set(prev);
                              if (next.has(category.id)) {
                                next.delete(category.id);
                                void trackEvent('category_collapsed', state.deviceId, state.sync.pair, { categoryId: category.id });
                              } else {
                                next.add(category.id);
                                void trackEvent('category_expanded', state.deviceId, state.sync.pair, { categoryId: category.id });
                              }
                              return next;
                            });
                          }}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="embedded-items">
                        {previewItems.length === 0 && <p className="muted">{t.noItems}</p>}
                        {previewItems.map((item) => {
                          const exp = getExpirationState(item);
                          return (
                            <div key={item.id} className="embedded-item" onClick={() => openCategory(category.id)}>
                              <span>{item.name}</span>
                              <small className={`status-${exp.type}`}>
                                {exp.type === 'expired'
                                  ? state.settings.appLanguage === 'ru'
                                    ? 'Просрочено'
                                    : 'Expired'
                                  : exp.type === 'soon'
                                    ? `${exp.daysLeft} ${getDaysWord(exp.daysLeft, state.settings.appLanguage)}`
                                    : state.settings.appLanguage === 'ru'
                                      ? 'Свежее'
                                      : 'Fresh'}
                              </small>
                            </div>
                          );
                        })}

                        <button className="ghost-button" onClick={() => openCategory(category.id)}>
                          {previewItems.length ? 'Открыть полный список' : 'Добавить +'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}

              {homeFilteredCategories.length === 0 && <p className="empty-state">{t.noCategories}</p>}
            </div>
          </section>
        )}

        {state.screen === 'category' && selectedCategory && (
          <section className="screen">
            <header className="screen-header compact">
              <button className="back-button" onClick={goHome}>
                <ArrowLeft size={18} />
                {t.categories}
              </button>
              <div>
                <h2>{selectedCategory.name}</h2>
                <p>
                  {categoryItems.length} {getItemsWord(categoryItems.length, state.settings.appLanguage)}
                </p>
              </div>
            </header>

            <div className="search-row">
              <div className="search-control">
                <Search size={16} />
                <input
                  value={categorySearchQuery}
                  onChange={(event) => {
                    setCategorySearchQuery(event.target.value);
                    void trackEvent('search_performed', state.deviceId, state.sync.pair);
                  }}
                  placeholder={t.search}
                />
              </div>
              <button className="fab-sm" onClick={() => openItemForm()}>
                <Plus size={18} />
              </button>
            </div>

            {allShelves.length > 1 && (
              <div className="chip-row">
                <button
                  className={`chip ${categoryShelfFilter === null ? 'chip-active' : ''}`}
                  onClick={() => setCategoryShelfFilter(null)}
                >
                  Все полки
                </button>
                {allShelves.map((shelf) => (
                  <button
                    key={shelf}
                    className={`chip ${categoryShelfFilter === shelf ? 'chip-active' : ''}`}
                    onClick={() => setCategoryShelfFilter(shelf)}
                  >
                    Полка {shelf}
                  </button>
                ))}
              </div>
            )}

            <div className="list-stack">
              {categoryItems.map((item) => {
                const exp = getExpirationState(item);
                return (
                  <article key={item.id} className="card item-row-card">
                    {item.photoUrl ? <img className="item-photo" src={item.photoUrl} alt={item.name} /> : null}
                    <div className="item-meta">
                      <strong>{item.name}</strong>
                      <span>
                        {item.packagesCount} уп. · {item.itemsCount} шт. · Полка {item.shelfNumber}
                      </span>
                      <small className={`status-${exp.type}`}>
                        {exp.type === 'expired'
                          ? state.settings.appLanguage === 'ru'
                            ? `Просрочено ${Math.abs(exp.daysLeft)} ${getDaysWord(exp.daysLeft, state.settings.appLanguage)} назад`
                            : `Expired ${Math.abs(exp.daysLeft)} ${getDaysWord(exp.daysLeft, state.settings.appLanguage)} ago`
                          : exp.type === 'soon'
                            ? `${exp.daysLeft} ${getDaysWord(exp.daysLeft, state.settings.appLanguage)}`
                            : state.settings.appLanguage === 'ru'
                              ? 'Свежее'
                              : 'Fresh'}
                      </small>
                      {item.notes ? <p>{item.notes}</p> : null}
                    </div>

                    <div className="item-actions">
                      <button className="icon-button tiny" onClick={() => updateItemCount(item.id, 'packagesCount', -1)}>
                        <Minus size={14} />
                      </button>
                      <span>{item.packagesCount}</span>
                      <button className="icon-button tiny" onClick={() => updateItemCount(item.id, 'packagesCount', 1)}>
                        <Plus size={14} />
                      </button>
                      <button className="icon-button tiny" onClick={() => openItemForm(item)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="icon-button tiny danger" onClick={() => deleteItem(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}

              {categoryItems.length === 0 && <p className="empty-state">{t.noItems}</p>}
            </div>
          </section>
        )}

        {state.screen === 'item-form' && itemDraft && (
          <section className="screen">
            <header className="screen-header compact">
              <button className="back-button" onClick={closeItemForm}>
                <ArrowLeft size={18} />
                {t.cancel}
              </button>
              <h2>{itemDraft.id ? t.editItem : t.addItem}</h2>
              <button className="pill primary" onClick={saveItem}>
                {t.done}
              </button>
            </header>

            <div className="form-stack">
              <label>
                {t.itemName}
                <input
                  value={itemDraft.name}
                  onChange={(event) => setItemDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                  placeholder={state.settings.appLanguage === 'ru' ? 'Например: Куриный бульон' : 'Example: Chicken broth'}
                />
              </label>

              <div className="grid-2">
                <label>
                  Упаковок
                  <input
                    type="number"
                    min={0}
                    value={itemDraft.packagesCount}
                    onChange={(event) =>
                      setItemDraft((prev) => (prev ? { ...prev, packagesCount: Number.parseInt(event.target.value, 10) || 0 } : prev))
                    }
                  />
                </label>
                <label>
                  Штук
                  <input
                    type="number"
                    min={0}
                    value={itemDraft.itemsCount}
                    onChange={(event) =>
                      setItemDraft((prev) => (prev ? { ...prev, itemsCount: Number.parseInt(event.target.value, 10) || 0 } : prev))
                    }
                  />
                </label>
              </div>

              <label>
                Полка
                <input
                  type="number"
                  min={1}
                  value={itemDraft.shelfNumber}
                  onChange={(event) =>
                    setItemDraft((prev) => (prev ? { ...prev, shelfNumber: Number.parseInt(event.target.value, 10) || 1 } : prev))
                  }
                />
              </label>

              <div className="grid-2">
                <label>
                  Дата заморозки
                  <input
                    type="date"
                    value={itemDraft.freezeDate}
                    onChange={(event) => setItemDraft((prev) => (prev ? { ...prev, freezeDate: event.target.value } : prev))}
                  />
                </label>
                <label>
                  Срок годности
                  <input
                    type="date"
                    value={itemDraft.expirationDate}
                    onChange={(event) =>
                      setItemDraft((prev) => (prev ? { ...prev, expirationDate: event.target.value } : prev))
                    }
                  />
                </label>
              </div>

              <label>
                Фото URL
                <input
                  value={itemDraft.photoUrl}
                  onChange={(event) => setItemDraft((prev) => (prev ? { ...prev, photoUrl: event.target.value } : prev))}
                  placeholder="https://..."
                />
              </label>

              <label>
                Заметки
                <textarea
                  value={itemDraft.notes}
                  onChange={(event) => setItemDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                  rows={4}
                />
              </label>
            </div>
          </section>
        )}

        {state.screen === 'history' && (
          <section className="screen">
            <header className="screen-header compact">
              <button className="back-button" onClick={() => setState((prev) => ({ ...prev, screen: 'home' }))}>
                <ArrowLeft size={18} />
                {t.categories}
              </button>
              <h2>{t.history}</h2>
              <span />
            </header>

            <div className="list-stack">
              {state.history.map((event) => (
                <article key={event.id} className="card history-row">
                  <div>
                    <strong>{historyText(event, state.settings.appLanguage)}</strong>
                    <small>{new Date(event.timestamp).toLocaleString(state.settings.appLanguage === 'ru' ? 'ru-RU' : 'en-US')}</small>
                  </div>
                </article>
              ))}
              {!state.history.length && <p className="empty-state">{state.settings.appLanguage === 'ru' ? 'История пока пуста' : 'History is empty'}</p>}
            </div>
          </section>
        )}

        {state.screen === 'settings' && (
          <section className="screen">
            <header className="screen-header compact">
              <button className="back-button" onClick={() => setState((prev) => ({ ...prev, screen: 'home' }))}>
                <ArrowLeft size={18} />
                {t.categories}
              </button>
              <h2>{t.settings}</h2>
              <span />
            </header>

            <div className="settings-stack">
              <section className="settings-group">
                <h3>{state.settings.appLanguage === 'ru' ? 'Аккаунт' : 'Account'}</h3>
                <div className="sync-status-line">
                  <span>{state.settings.appLanguage === 'ru' ? 'Имя' : 'Name'}</span>
                  <strong>{state.auth.userName || '-'}</strong>
                </div>
                <div className="sync-status-line">
                  <span>Email</span>
                  <strong>{state.auth.userEmail || '-'}</strong>
                </div>
                <button className="settings-button danger" onClick={() => void logout()} disabled={authLoading}>
                  <X size={16} />
                  {state.settings.appLanguage === 'ru' ? 'Выйти из аккаунта' : 'Log out'}
                </button>
              </section>

              <section className="settings-group">
                <h3>{t.syncWithPartner}</h3>

                {state.sync.pair ? (
                  <>
                    <div className="sync-status-line">
                      <span>{t.status}</span>
                      <strong>{syncStatusLabel(state.sync.status.state, state.settings.appLanguage)}</strong>
                    </div>
                    <div className="sync-status-line">
                      <span>Pair ID</span>
                      <code>{state.sync.pair.pairId}</code>
                    </div>
                    {state.sync.pair.inviteCode ? (
                      <div className="sync-status-line">
                        <span>{state.settings.appLanguage === 'ru' ? 'Код приглашения' : 'Invite code'}</span>
                        <code>{state.sync.pair.inviteCode}</code>
                      </div>
                    ) : null}

                    <button className="settings-button" onClick={() => void syncNow()} disabled={syncingNow}>
                      <RefreshCw size={16} />
                      {t.manualSync}
                    </button>

                    {state.sync.pair.mode === 'shared' ? (
                      <button className="settings-button danger" onClick={leavePair}>
                        <X size={16} />
                        {t.leaveShared}
                      </button>
                    ) : (
                      <>
                        <button className="settings-button" onClick={startCreatePair}>
                          <Plus size={16} />
                          {t.createShared}
                        </button>
                        <button className="settings-button" onClick={startJoinPair}>
                          <Link2 size={16} />
                          {t.joinShared}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button className="settings-button" onClick={startCreatePair}>
                      <Plus size={16} />
                      {t.createShared}
                    </button>
                    <button className="settings-button" onClick={startJoinPair}>
                      <Link2 size={16} />
                      {t.joinShared}
                    </button>
                  </>
                )}
              </section>

              <section className="settings-group">
                <h3>{t.notifications}</h3>
                <label className="toggle-row">
                  <span>{state.settings.appLanguage === 'ru' ? 'Включить напоминания' : 'Enable reminders'}</span>
                  <input
                    type="checkbox"
                    checked={state.settings.notificationsEnabled}
                    onChange={async (event) => {
                      const enabled = event.target.checked;
                      if (enabled) {
                        await requestNotificationAccess();
                      } else {
                        setState((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            notificationsEnabled: false,
                          },
                        }));
                      }
                    }}
                  />
                </label>

                <div className="chip-row">
                  {[3, 7, 14].map((day) => {
                    const selected = state.settings.notificationDays.includes(day);
                    return (
                      <button
                        key={day}
                        className={`chip ${selected ? 'chip-active' : ''}`}
                        onClick={() => {
                          setState((prev) => {
                            const currentlySelected = prev.settings.notificationDays.includes(day);
                            const notificationDays = currentlySelected
                              ? prev.settings.notificationDays.filter((value) => value !== day)
                              : [...prev.settings.notificationDays, day].sort((a, b) => a - b);

                            return {
                              ...prev,
                              settings: {
                                ...prev.settings,
                                notificationDays: notificationDays.length ? notificationDays : [day],
                              },
                            };
                          });
                        }}
                      >
                        {day} {getDaysWord(day, state.settings.appLanguage)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="settings-group">
                <h3>{t.appearance}</h3>
                <div className="grid-3">
                  {[
                    { key: 'system', label: t.system },
                    { key: 'light', label: t.light },
                    { key: 'dark', label: t.dark },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      className={`chip ${state.settings.appearanceMode === mode.key ? 'chip-active' : ''}`}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            appearanceMode: mode.key as AppState['settings']['appearanceMode'],
                          },
                        }))
                      }
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <h3>{t.language}</h3>
                <div className="grid-2">
                  <button
                    className={`chip ${state.settings.appLanguage === 'ru' ? 'chip-active' : ''}`}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          appLanguage: 'ru',
                        },
                      }))
                    }
                  >
                    Русский
                  </button>
                  <button
                    className={`chip ${state.settings.appLanguage === 'en' ? 'chip-active' : ''}`}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          appLanguage: 'en',
                        },
                      }))
                    }
                  >
                    English
                  </button>
                </div>
              </section>

              <section className="settings-group">
                <h3>{state.settings.appLanguage === 'ru' ? 'Резервные копии' : 'Backups'}</h3>
                <button className="settings-button" onClick={exportBackup}>
                  <Download size={16} />
                  {t.exportData}
                </button>
                <button className="settings-button" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                  {t.importData}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden-input"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      await importBackup(file);
                    }
                    event.currentTarget.value = '';
                  }}
                />
              </section>
            </div>
          </section>
        )}
      </div>

      <button className="fab" onClick={() => openCategoryModal()}>
        <Plus size={24} />
      </button>

      {showCategoryModal && categoryModalDraft && (
        <div className="overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <button className="icon-button" onClick={() => setShowCategoryModal(false)}>
                <X size={16} />
              </button>
              <h3>{categoryModalDraft.id ? t.editCategory : t.addCategory}</h3>
              <button className="pill primary" onClick={saveCategory}>
                {t.save}
              </button>
            </header>

            <div className="form-stack">
              <label>
                {t.categoryName}
                <input
                  value={categoryModalDraft.name}
                  onChange={(event) =>
                    setCategoryModalDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                  }
                />
              </label>

              <div>
                <p className="label-title">{t.icon}</p>
                <div className="icon-grid">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      className={`icon-pick ${categoryModalDraft.icon === icon ? 'icon-pick-active' : ''}`}
                      onClick={() =>
                        setCategoryModalDraft((prev) => (prev ? { ...prev, icon } : prev))
                      }
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label-title">{t.color}</p>
                <div className="color-grid">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`color-pick ${categoryModalDraft.color === color ? 'color-pick-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setCategoryModalDraft((prev) => (prev ? { ...prev, color } : prev))
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="label-title">{t.preview}</p>
                <div className="preview-card" style={{ backgroundColor: `${categoryModalDraft.color}20` }}>
                  <div className="category-badge" style={{ backgroundColor: categoryModalDraft.color }}>
                    {categoryModalDraft.icon}
                  </div>
                  <span>{categoryModalDraft.name || t.categoryName}</span>
                </div>
              </div>

              {categoryModalDraft.id ? (
                <button
                  className="settings-button danger"
                  onClick={() => {
                    deleteCategory(categoryModalDraft.id!);
                    setShowCategoryModal(false);
                    setCategoryModalDraft(null);
                  }}
                >
                  <Trash2 size={16} />
                  {t.delete}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {pairAction && (
        <div className="overlay" onClick={() => setPairAction(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <header className="sheet-header">
              <button className="icon-button" onClick={() => setPairAction(null)}>
                <X size={16} />
              </button>
              <h3>{pairAction === 'create' ? t.createShared : t.joinShared}</h3>
              <button className="pill primary" onClick={() => void submitPairAction()}>
                <Check size={14} />
                {t.done}
              </button>
            </header>

            <div className="form-stack">
              {pairAction === 'create' ? (
                <label>
                  {t.pairName}
                  <input
                    value={pairNameInput}
                    onChange={(event) => setPairNameInput(event.target.value)}
                    placeholder={state.settings.appLanguage === 'ru' ? 'Например: Наша морозилка' : 'Example: Shared freezer'}
                  />
                </label>
              ) : (
                <>
                  <label>
                    {t.pairCode}
                    <input
                      value={pairInput}
                      onChange={(event) => setPairInput(event.target.value.toUpperCase())}
                      placeholder="ABC123"
                    />
                  </label>
                  <div className="join-mode-grid">
                    <button
                      className={`chip ${joinImportMode === 'replace' ? 'chip-active' : ''}`}
                      onClick={() => setJoinImportMode('replace')}
                    >
                      {state.settings.appLanguage === 'ru' ? 'Заменить личные данные' : 'Replace personal data'}
                    </button>
                    <button
                      className={`chip ${joinImportMode === 'merge' ? 'chip-active' : ''}`}
                      onClick={() => setJoinImportMode('merge')}
                    >
                      {state.settings.appLanguage === 'ru' ? 'Объединить без дедупа' : 'Merge without dedupe'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="toast" onClick={() => setErrorMessage(null)}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
