import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthResponseDTO, JoinImportMode, SyncDataDTO } from './domain/contracts';
import {
  dateInputToISO,
  isoToDateInput,
  nowISO,
  syncDataFromDTO,
  withCategoryCounts,
} from './domain/mappers';
import type { AppState, Category, Item } from './domain/models';
import { COPY } from './lib/copy';
import { buildHistoryEvent, createPendingChange, getExpirationState, syncStatusLabel } from './lib/helpers';
import { Icon } from './lib/icons';
import type { CategoryDraft, ItemDraft, PairAction, AuthMode } from './lib/types';
import { trackEvent } from './services/analytics';
import { apiClient, UnauthorizedError } from './services/api-client';
import { buildBackupPayload, parseBackupPayload } from './services/backup';
import { notificationService } from './services/notifications';
import { loadState, saveState } from './services/storage';
import { applyServerChanges, compactPendingChanges, MAX_HISTORY } from './services/sync-engine';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { ItemFormScreen } from './screens/ItemFormScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CategoryModalSheet } from './screens/CategoryModalSheet';
import { PairModalSheet } from './screens/PairModalSheet';
import { Aurora, BottomNav, MobileBar, Sidebar, type NavId } from './screens/Chrome';

type ApplyAuthPayloadOptions = { preserveLocalData?: boolean };

export default function App() {
  // ── Core state ──────────────────────────────────────────────
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  const syncInFlightRef = useRef(false);

  const t = COPY[state.settings.appLanguage];
  const lang = state.settings.appLanguage;

  // ── Derived / computed ──────────────────────────────────────
  const activeCategories = useMemo(() => withCategoryCounts(state.categories, state.items), [state.categories, state.items]);
  const activeItems = useMemo(() => state.items.filter((item) => !item.deletedAt), [state.items]);
  const selectedCategory = useMemo(
    () => activeCategories.find((c) => c.id === state.selectedCategoryId) || null,
    [activeCategories, state.selectedCategoryId]
  );
  const activePairId = state.sync.pair?.pairId ?? null;

  const allShelves = useMemo(
    () => Array.from(new Set(activeItems.map((i) => i.shelfNumber))).sort((a, b) => a - b),
    [activeItems]
  );

  const homeFilteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchesSearch = !homeSearchQuery || item.name.toLowerCase().includes(homeSearchQuery.toLowerCase()) || (item.notes || '').toLowerCase().includes(homeSearchQuery.toLowerCase());
      const matchesShelf = homeShelfFilter === null || item.shelfNumber === homeShelfFilter;
      return matchesSearch && matchesShelf;
    });
  }, [activeItems, homeSearchQuery, homeShelfFilter]);

  const homeFilteredCategories = useMemo(() => {
    if (!homeSearchQuery && homeShelfFilter === null) return activeCategories;
    const visibleIds = new Set(homeFilteredItems.map((i) => i.categoryId));
    return activeCategories.filter((c) => visibleIds.has(c.id) || c.name.toLowerCase().includes(homeSearchQuery.toLowerCase()));
  }, [activeCategories, homeFilteredItems, homeSearchQuery, homeShelfFilter]);

  const categoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return activeItems
      .filter((item) => item.categoryId === selectedCategory.id)
      .filter((item) => {
        const matchesSearch = !categorySearchQuery || item.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) || (item.notes || '').toLowerCase().includes(categorySearchQuery.toLowerCase());
        const matchesShelf = categoryShelfFilter === null || item.shelfNumber === categoryShelfFilter;
        return matchesSearch && matchesShelf;
      });
  }, [selectedCategory, activeItems, categorySearchQuery, categoryShelfFilter]);

  const expiringItems = useMemo(
    () =>
      activeItems
        .filter((item) => getExpirationState(item).daysLeft <= 7)
        .sort((a, b) => getExpirationState(a).daysLeft - getExpirationState(b).daysLeft),
    [activeItems]
  );

  // ── Auth helpers ────────────────────────────────────────────
  const applyAuthPayload = useCallback(
    (payload: Pick<AuthResponseDTO, 'user' | 'pair_context'>, options: ApplyAuthPayloadOptions = {}) => {
      setState((prev) => {
        const nextPairId = payload.pair_context.active_pair_id || null;
        const prevPairId = prev.sync.pair?.pairId || null;
        const sameUser = !prev.auth.userId || prev.auth.userId === payload.user.id;
        const preserveLocalData = Boolean(options.preserveLocalData && nextPairId && prevPairId === nextPairId && sameUser);

        return {
          ...prev,
          categories: preserveLocalData ? prev.categories : [],
          items: preserveLocalData ? prev.items : [],
          history: preserveLocalData ? prev.history : [],
          selectedCategoryId: undefined,
          selectedItemId: undefined,
          screen: 'home',
          auth: { isAuthenticated: true, userId: payload.user.id, userName: payload.user.name, userEmail: payload.user.email },
          sync: {
            ...prev.sync,
            pair: nextPairId ? {
              pairId: nextPairId, userId: payload.user.id, mode: payload.pair_context.mode,
              serverVersion: preserveLocalData ? prev.sync.pair?.serverVersion ?? prev.sync.lastKnownVersion : 0,
              inviteCode: preserveLocalData ? prev.sync.pair?.inviteCode : undefined,
              inviteExpiresAt: preserveLocalData ? prev.sync.pair?.inviteExpiresAt : undefined,
            } : null,
            lastKnownVersion: preserveLocalData ? prev.sync.lastKnownVersion : 0,
            pendingChanges: preserveLocalData ? prev.sync.pendingChanges : [],
            status: { ...prev.sync.status, state: preserveLocalData ? prev.sync.status.state : 'idle', pendingChangesCount: preserveLocalData ? prev.sync.pendingChanges.length : 0, message: preserveLocalData ? prev.sync.status.message : undefined },
          },
        };
      });
    }, []
  );

  const clearSessionState = useCallback(async () => {
    apiClient.clearTokens();
    setState((prev) => ({
      ...prev,
      auth: { isAuthenticated: false },
      categories: [], items: [], history: [],
      selectedCategoryId: undefined, selectedItemId: undefined, screen: 'home',
      sync: { ...prev.sync, pair: null, lastKnownVersion: 0, pendingChanges: [], status: { state: 'idle', pendingChangesCount: 0 } },
    }));
  }, []);

  // ── Effects ─────────────────────────────────────────────────
  useEffect(() => { stateRef.current = state; saveState(state); }, [state]);
  useEffect(() => { void notificationService.init(); }, []);
  useEffect(() => { void trackEvent('app_opened', stateRef.current.deviceId, stateRef.current.sync.pair); }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      if (!apiClient.hasSession()) { if (!cancelled) { await clearSessionState(); setAuthBootstrapping(false); } return; }
      try {
        const me = await apiClient.me();
        if (!cancelled) applyAuthPayload({ user: me.user, pair_context: me.pair_context }, { preserveLocalData: true });
      } catch { if (!cancelled) await clearSessionState(); }
      finally { if (!cancelled) setAuthBootstrapping(false); }
    };
    void bootstrap();
    return () => { cancelled = true; };
  }, [applyAuthPayload, clearSessionState]);

  useEffect(() => {
    if (state.settings.notificationsEnabled && state.settings.flags.web_notifications) {
      notificationService.schedule(state.items, true, state.settings.notificationDays);
    } else { notificationService.clearSchedules(); }
  }, [state.items, state.settings.notificationsEnabled, state.settings.notificationDays, state.settings.flags.web_notifications]);

  useEffect(() => {
    const root = document.documentElement;
    const mode = state.settings.appearanceMode;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.settings.appearanceMode]);

  useEffect(() => {
    const hasOrphanItems = state.items.some((i) => !i.deletedAt && !i.categoryId);
    if (!hasOrphanItems || !state.sync.pair || state.sync.lastKnownVersion === 0) return;
    setState((prev) => ({ ...prev, sync: { ...prev.sync, lastKnownVersion: 0, status: { ...prev.sync.status, state: 'idle' } } }));
  }, [state.items, state.sync.pair, state.sync.lastKnownVersion]);

  // ── Sync ────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    const current = stateRef.current;
    const pair = current.sync.pair;
    if (!pair || !current.settings.flags.web_sync_engine || syncInFlightRef.current || !navigator.onLine) {
      if (!navigator.onLine && pair) setState((prev) => ({ ...prev, sync: { ...prev.sync, status: { ...prev.sync.status, state: 'offline', pendingChangesCount: prev.sync.pendingChanges.length } } }));
      return;
    }
    syncInFlightRef.current = true;
    setSyncingNow(true);
    setState((prev) => ({ ...prev, sync: { ...prev.sync, status: { ...prev.sync.status, state: 'syncing', message: undefined, pendingChangesCount: prev.sync.pendingChanges.length } } }));

    const payload: SyncDataDTO = compactPendingChanges(current.sync.pendingChanges);
    try {
      const response = await apiClient.sync(current.sync.lastKnownVersion, payload);
      setState((prev) => {
        const applied = applyServerChanges(prev, response.server_changes);
        const v = Number.parseInt(response.server_version, 10) || prev.sync.lastKnownVersion;
        return { ...applied, sync: { ...applied.sync, lastKnownVersion: v, pair: applied.sync.pair ? { ...applied.sync.pair, serverVersion: v } : null, pendingChanges: [], status: { state: 'success', pendingChangesCount: 0, lastSyncAt: nowISO() } } };
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) await clearSessionState();
      else setState((prev) => ({ ...prev, sync: { ...prev.sync, status: { ...prev.sync.status, state: navigator.onLine ? 'error' : 'offline', message: error instanceof Error ? error.message : 'Sync error', pendingChangesCount: prev.sync.pendingChanges.length } } }));
    } finally { syncInFlightRef.current = false; setSyncingNow(false); }
  }, [clearSessionState]);

  useEffect(() => {
    if (!activePairId || !state.settings.flags.web_sync_engine) return;
    void syncNow();
    const timer = window.setInterval(() => { void syncNow(); }, 5000);
    const onOnline = () => { void syncNow(); };
    window.addEventListener('online', onOnline);
    return () => { window.clearInterval(timer); window.removeEventListener('online', onOnline); };
  }, [activePairId, state.settings.flags.web_sync_engine, syncNow]);

  // ── Category actions ────────────────────────────────────────
  const openCategoryModal = useCallback((category?: Category) => {
    setCategoryModalDraft({ id: category?.id, name: category?.name || '', icon: category?.icon || '🥬', color: category?.color || '#34C759' });
    setShowCategoryModal(true);
  }, []);

  const saveCategory = useCallback(() => {
    if (!categoryModalDraft || !categoryModalDraft.name.trim()) return;
    const now = nowISO();
    if (categoryModalDraft.id) {
      setState((prev) => {
        const categories = prev.categories.map((c) => c.id === categoryModalDraft.id ? { ...c, name: categoryModalDraft.name.trim(), icon: categoryModalDraft.icon, color: categoryModalDraft.color, updatedAt: now } : c);
        const updated = categories.find((c) => c.id === categoryModalDraft.id);
        if (!updated) return prev;
        const pending = [...prev.sync.pendingChanges, createPendingChange('categoryUpdated', updated.id, { category: updated })];
        return { ...prev, categories: withCategoryCounts(categories, prev.items), sync: { ...prev.sync, pendingChanges: pending, status: { ...prev.sync.status, pendingChangesCount: pending.length } } };
      });
      void trackEvent('category_edited', stateRef.current.deviceId, stateRef.current.sync.pair);
    } else {
      setState((prev) => {
        const category: Category = { id: crypto.randomUUID(), name: categoryModalDraft.name.trim(), icon: categoryModalDraft.icon, color: categoryModalDraft.color, itemCount: 0, sortOrder: prev.categories.length, updatedAt: now, deletedAt: null };
        const categories = [...prev.categories, category];
        const pending = [...prev.sync.pendingChanges, createPendingChange('categoryAdded', category.id, { category })];
        return { ...prev, categories: withCategoryCounts(categories, prev.items), sync: { ...prev.sync, pendingChanges: pending, status: { ...prev.sync.status, pendingChangesCount: pending.length } } };
      });
      void trackEvent('category_created', stateRef.current.deviceId, stateRef.current.sync.pair);
    }
    setShowCategoryModal(false);
    setCategoryModalDraft(null);
  }, [categoryModalDraft]);

  const deleteCategory = useCallback((categoryId: string) => {
    const now = nowISO();
    setState((prev) => {
      const category = prev.categories.find((c) => c.id === categoryId);
      if (!category) return prev;
      const categoryDelete = { ...category, updatedAt: now, deletedAt: now };
      const deletedItems = prev.items.filter((i) => i.categoryId === categoryId).map((i) => ({ ...i, updatedAt: now, deletedAt: now }));
      const categories = prev.categories.filter((c) => c.id !== categoryId);
      const items = prev.items.filter((i) => i.categoryId !== categoryId);
      const pendingChanges = [...prev.sync.pendingChanges, createPendingChange('categoryDeleted', categoryId, { category: categoryDelete }), ...deletedItems.map((i) => createPendingChange('itemDeleted', i.id, { item: i }))];
      return { ...prev, categories: withCategoryCounts(categories, items), items, sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
    });
    void trackEvent('category_deleted', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, []);

  const reorderCategories = useCallback((targetId: string) => {
    if (!draggedCategoryId || draggedCategoryId === targetId) return;
    setState((prev) => {
      const categories = [...prev.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const si = categories.findIndex((c) => c.id === draggedCategoryId);
      const ti = categories.findIndex((c) => c.id === targetId);
      if (si < 0 || ti < 0) return prev;
      const [moved] = categories.splice(si, 1);
      categories.splice(ti, 0, moved);
      const now = nowISO();
      const reordered = categories.map((c, i) => ({ ...c, sortOrder: i, updatedAt: now }));
      const pendingChanges = [...prev.sync.pendingChanges, ...reordered.map((c) => createPendingChange('categoryUpdated', c.id, { category: c }))];
      return { ...prev, categories: withCategoryCounts(reordered, prev.items), sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
    });
    setDraggedCategoryId(null);
    void trackEvent('categories_reordered', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, [draggedCategoryId]);

  // ── Item actions ────────────────────────────────────────────
  const openItemForm = useCallback((item?: Item) => {
    if (!stateRef.current.selectedCategoryId) return;
    setItemDraft(item
      ? { id: item.id, name: item.name, packagesCount: item.packagesCount, itemsCount: item.itemsCount, shelfNumber: item.shelfNumber, freezeDate: isoToDateInput(item.freezeDate), expirationDate: isoToDateInput(item.expirationDate), notes: item.notes || '', photoUrl: item.photoUrl || '' }
      : { name: '', packagesCount: 1, itemsCount: 1, shelfNumber: 1, freezeDate: isoToDateInput(nowISO()), expirationDate: '', notes: '', photoUrl: '' }
    );
    setState((prev) => ({ ...prev, selectedItemId: item?.id, screen: 'item-form' }));
  }, []);

  const saveItem = useCallback(() => {
    const current = stateRef.current;
    const categoryId = current.selectedCategoryId;
    if (!categoryId || !itemDraft || !itemDraft.name.trim() || !itemDraft.expirationDate) return;
    const now = nowISO();

    if (itemDraft.id) {
      setState((prev) => {
        const items = prev.items.map((i) => i.id === itemDraft.id ? { ...i, name: itemDraft.name.trim(), packagesCount: Math.max(0, itemDraft.packagesCount), itemsCount: Math.max(0, itemDraft.itemsCount), shelfNumber: Math.max(1, itemDraft.shelfNumber), freezeDate: dateInputToISO(itemDraft.freezeDate), expirationDate: dateInputToISO(itemDraft.expirationDate), notes: itemDraft.notes.trim() || undefined, photoUrl: itemDraft.photoUrl || undefined, updatedAt: now } : i);
        const updated = items.find((i) => i.id === itemDraft.id);
        if (!updated) return prev;
        const he = buildHistoryEvent('item_updated', updated);
        const history = [he, ...prev.history].slice(0, MAX_HISTORY);
        const pendingChanges = [...prev.sync.pendingChanges, createPendingChange('itemUpdated', updated.id, { item: updated }), createPendingChange('historyAdded', he.id, { historyEvent: he })];
        return { ...prev, items, categories: withCategoryCounts(prev.categories, items), history, sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
      });
      void trackEvent('item_edited', current.deviceId, current.sync.pair);
    } else {
      setState((prev) => {
        const item: Item = { id: crypto.randomUUID(), categoryId, name: itemDraft.name.trim(), packagesCount: Math.max(0, itemDraft.packagesCount), itemsCount: Math.max(0, itemDraft.itemsCount), shelfNumber: Math.max(1, itemDraft.shelfNumber), freezeDate: dateInputToISO(itemDraft.freezeDate), expirationDate: dateInputToISO(itemDraft.expirationDate), notes: itemDraft.notes.trim() || undefined, photoUrl: itemDraft.photoUrl || undefined, updatedAt: now, deletedAt: null };
        const he = buildHistoryEvent('item_added', item);
        const items = [...prev.items, item];
        const history = [he, ...prev.history].slice(0, MAX_HISTORY);
        const pendingChanges = [...prev.sync.pendingChanges, createPendingChange('itemAdded', item.id, { item }), createPendingChange('historyAdded', he.id, { historyEvent: he })];
        return { ...prev, items, history, categories: withCategoryCounts(prev.categories, items), sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
      });
      void trackEvent('item_created', current.deviceId, current.sync.pair);
    }
    setState((prev) => ({ ...prev, screen: 'category', selectedItemId: undefined }));
  }, [itemDraft]);

  const deleteItem = useCallback((itemId: string) => {
    const now = nowISO();
    setState((prev) => {
      const found = prev.items.find((i) => i.id === itemId);
      if (!found) return prev;
      const deleted = { ...found, updatedAt: now, deletedAt: now };
      const he = buildHistoryEvent('item_deleted', found);
      const items = prev.items.filter((i) => i.id !== itemId);
      const history = [he, ...prev.history].slice(0, MAX_HISTORY);
      const pendingChanges = [...prev.sync.pendingChanges, createPendingChange('itemDeleted', deleted.id, { item: deleted }), createPendingChange('historyAdded', he.id, { historyEvent: he })];
      return { ...prev, items, history, categories: withCategoryCounts(prev.categories, items), sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
    });
    void trackEvent('item_deleted', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, []);

  const updateItemCount = useCallback((itemId: string, field: 'packagesCount' | 'itemsCount', delta: number) => {
    const now = nowISO();
    setState((prev) => {
      const items = prev.items.map((i) => i.id !== itemId ? i : { ...i, [field]: Math.max(0, i[field] + delta), updatedAt: now });
      const updated = items.find((i) => i.id === itemId);
      if (!updated) return prev;
      const he = buildHistoryEvent(field === 'packagesCount' ? 'packages_changed' : 'items_changed', updated, field === 'packagesCount' ? { packagesDelta: delta } : { itemsDelta: delta });
      const history = [he, ...prev.history].slice(0, MAX_HISTORY);
      const pendingChanges = [...prev.sync.pendingChanges, createPendingChange('itemUpdated', updated.id, { item: updated }), createPendingChange('historyAdded', he.id, { historyEvent: he })];
      return { ...prev, items, history, sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
    });
    void trackEvent(field === 'packagesCount' ? 'item_packages_updated' : 'item_items_updated', stateRef.current.deviceId, stateRef.current.sync.pair);
  }, []);

  // ── Navigation ──────────────────────────────────────────────
  const goHome = useCallback(() => {
    setCategorySearchQuery('');
    setCategoryShelfFilter(null);
    setState((prev) => ({ ...prev, screen: 'home', selectedCategoryId: undefined, selectedItemId: undefined }));
  }, []);

  const openCategory = useCallback((categoryId: string) => {
    setState((prev) => ({ ...prev, selectedCategoryId: categoryId, selectedItemId: undefined, screen: 'category' }));
  }, []);

  const navTo = useCallback((id: NavId) => {
    if (id === 'home') { goHome(); return; }
    setHomeSearchQuery('');
    setHomeShelfFilter(null);
    setState((prev) => ({ ...prev, screen: id, selectedItemId: undefined }));
  }, [goHome]);

  // ── Settings actions ────────────────────────────────────────
  const requestNotificationAccess = useCallback(async () => {
    const permission = await notificationService.requestPermission();
    if (permission === 'granted') {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: true } }));
      await trackEvent('notifications_enabled', stateRef.current.deviceId, stateRef.current.sync.pair);
    } else {
      setErrorMessage(lang === 'ru' ? 'Браузер отклонил уведомления.' : 'Browser denied notifications.');
    }
  }, [lang]);

  const exportBackup = useCallback(() => {
    const payload = buildBackupPayload({ categories: stateRef.current.categories, items: stateRef.current.items, history: stateRef.current.history });
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freezer_backup_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importBackup = useCallback(async (file: File) => {
    try {
      const parsed = parseBackupPayload(await file.text());
      setState((prev) => {
        const pendingChanges = [...prev.sync.pendingChanges, ...parsed.categories.map((c) => createPendingChange('categoryUpdated', c.id, { category: c })), ...parsed.items.map((i) => createPendingChange('itemUpdated', i.id, { item: i })), ...parsed.history.map((h) => createPendingChange('historyAdded', h.id, { historyEvent: h }))];
        return { ...prev, categories: withCategoryCounts(parsed.categories, parsed.items), items: parsed.items, history: parsed.history, sync: { ...prev.sync, pendingChanges, status: { ...prev.sync.status, pendingChangesCount: pendingChanges.length } } };
      });
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Backup import failed'); }
  }, []);

  // ── Pair actions ────────────────────────────────────────────
  const startCreatePair = useCallback(() => { setPairAction('create'); setPairNameInput(''); setPairInput(''); setJoinImportMode('replace'); }, []);
  const startJoinPair = useCallback(() => { setPairAction('join'); setPairNameInput(''); setPairInput(''); setJoinImportMode('replace'); }, []);

  const submitPairAction = useCallback(async () => {
    if (!pairAction) return;
    try {
      if (pairAction === 'create') {
        if (!pairNameInput.trim()) { setErrorMessage(lang === 'ru' ? 'Введите название холодильника' : 'Enter freezer name'); return; }
        const r = await apiClient.createPair(pairNameInput.trim());
        const sv = Number.parseInt(r.server_version, 10) || 0;
        setState((prev) => ({ ...prev, sync: { ...prev.sync, pair: { pairId: r.pair_id, userId: r.user_id, mode: r.pair_context.mode, inviteCode: r.invite_code, inviteExpiresAt: r.invite_expires_at, serverVersion: sv }, lastKnownVersion: sv, status: { ...prev.sync.status, state: 'success', message: undefined } } }));
        await trackEvent('pair_created', state.deviceId, state.sync.pair, { pairId: r.pair_id, userId: r.user_id, mode: r.pair_context.mode, serverVersion: String(sv), inviteCode: r.invite_code, inviteExpiresAt: r.invite_expires_at });
      }
      if (pairAction === 'join') {
        if (!pairInput.trim()) { setErrorMessage(lang === 'ru' ? 'Введите код приглашения' : 'Enter invite code'); return; }
        const r = await apiClient.joinPair(pairInput.trim(), joinImportMode);
        const sv = Number.parseInt(r.server_version, 10) || 0;
        const synced = syncDataFromDTO(r.initial_data);
        setState((prev) => ({ ...prev, categories: withCategoryCounts(synced.categories, synced.items), items: synced.items, history: synced.history, sync: { ...prev.sync, pair: { pairId: r.pair_id, userId: r.user_id, mode: r.pair_context.mode, serverVersion: sv }, lastKnownVersion: sv, pendingChanges: [], status: { state: 'success', pendingChangesCount: 0, message: undefined } } }));
        await trackEvent('pair_joined', state.deviceId, state.sync.pair, { pairId: r.pair_id, userId: r.user_id, mode: r.pair_context.mode, serverVersion: String(sv), importMode: joinImportMode });
      }
      setPairAction(null); setPairInput(''); setPairNameInput(''); setErrorMessage(null);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Pair action failed'); }
  }, [joinImportMode, pairAction, pairInput, pairNameInput, state.deviceId, lang]);

  const leavePair = useCallback(async () => {
    const pair = stateRef.current.sync.pair;
    if (!pair) return;
    try {
      const r = await apiClient.leavePair();
      const synced = syncDataFromDTO(r.initial_data);
      const sv = Number.parseInt(r.server_version, 10) || 0;
      setState((prev) => ({ ...prev, categories: withCategoryCounts(synced.categories, synced.items), items: synced.items, history: synced.history, sync: { ...prev.sync, pair: { pairId: r.pair_id, userId: prev.auth.userId || pair.userId, mode: r.pair_context.mode, serverVersion: sv }, lastKnownVersion: sv, pendingChanges: [], status: { state: 'success', pendingChangesCount: 0 } } }));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Failed to leave shared freezer'); }
  }, []);

  const generateInviteCode = useCallback(async () => {
    if (!stateRef.current.sync.pair) return;
    try {
      const r = await apiClient.createInviteCode();
      const sv = Number.parseInt(r.server_version, 10) || 0;
      setState((prev) => ({ ...prev, sync: { ...prev.sync, pair: prev.sync.pair ? { ...prev.sync.pair, inviteCode: r.invite_code, inviteExpiresAt: r.invite_expires_at, serverVersion: Math.max(prev.sync.pair.serverVersion || 0, sv) } : prev.sync.pair, lastKnownVersion: Math.max(prev.sync.lastKnownVersion, sv), status: { ...prev.sync.status, state: 'success', message: undefined } } }));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Failed to get invite code'); }
  }, []);

  // ── Auth actions ────────────────────────────────────────────
  const submitAuth = useCallback(async () => {
    if (!authEmail.trim() || !authPassword.trim()) { setErrorMessage(lang === 'ru' ? 'Введите email и пароль' : 'Enter email and password'); return; }
    if (authMode === 'register' && !authName.trim()) { setErrorMessage(lang === 'ru' ? 'Введите имя' : 'Enter name'); return; }
    setAuthLoading(true); setErrorMessage(null);
    try {
      const response = authMode === 'register' ? await apiClient.register(authName.trim(), authEmail.trim(), authPassword) : await apiClient.login(authEmail.trim(), authPassword);
      applyAuthPayload(response);
      setAuthPassword('');
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Authentication failed'); }
    finally { setAuthLoading(false); }
  }, [applyAuthPayload, authEmail, authMode, authName, authPassword, lang]);

  const logout = useCallback(async () => {
    setAuthLoading(true); setErrorMessage(null);
    try { await apiClient.logout(); await clearSessionState(); } finally { setAuthLoading(false); }
  }, [clearSessionState]);

  // ── Render ──────────────────────────────────────────────────
  if (authBootstrapping) {
    return (
      <div className="w-bootstrap">
        <Aurora />
        <div className="w-auth-card">
          <div className="w-auth-brand">
            <div className="w-auth-mark">❄️</div>
            <h1>Морозилка</h1>
            <p>{lang === 'ru' ? 'Проверяем сессию…' : 'Restoring session…'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!state.auth.isAuthenticated) {
    return (
      <>
        <Aurora />
        <AuthScreen
          lang={lang} mode={authMode} name={authName} email={authEmail} password={authPassword}
          loading={authLoading} error={errorMessage}
          onModeChange={setAuthMode} onNameChange={setAuthName} onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword} onSubmit={() => void submitAuth()}
        />
      </>
    );
  }

  const navActive: NavId = state.screen === 'history' ? 'history' : state.screen === 'settings' ? 'settings' : 'home';
  const paired = Boolean(state.sync.pair);
  const synced = state.sync.status.state === 'success';
  const pairTitle = state.auth.userName || (lang === 'ru' ? 'Морозилка' : 'Freezer');
  const pairSubtitle = paired ? syncStatusLabel(state.sync.status.state, lang) : lang === 'ru' ? 'Личная морозилка' : 'Personal freezer';
  const mobileStatus = paired
    ? synced ? (lang === 'ru' ? 'Синхр.' : 'Synced') : syncStatusLabel(state.sync.status.state, lang)
    : lang === 'ru' ? 'Личная' : 'Personal';
  const avatar = (state.auth.userName?.trim()?.charAt(0) || '❄').toUpperCase();

  return (
    <div className="w-app">
      <Aurora />
      <Sidebar
        lang={lang} active={navActive} expiringCount={expiringItems.length}
        onNavigate={navTo} onLogout={() => void logout()}
        pairTitle={pairTitle} pairSubtitle={pairSubtitle} pairSynced={synced} avatar={avatar}
      />

      <main className="w-main">
        <MobileBar statusLabel={mobileStatus} synced={synced} />

        {state.screen === 'home' && (
          <HomeScreen
            state={state} t={t} lang={lang}
            categories={activeCategories} filteredCategories={homeFilteredCategories}
            filteredItems={homeFilteredItems} items={activeItems} expiringItems={expiringItems}
            allShelves={allShelves} totalItems={activeItems.length}
            expandedCategories={expandedCategories} searchQuery={homeSearchQuery} shelfFilter={homeShelfFilter}
            onSearchChange={setHomeSearchQuery}
            onShelfFilterChange={(shelf) => {
              setHomeShelfFilter(shelf);
              if (shelf === null) void trackEvent('filter_cleared', state.deviceId, state.sync.pair);
              else void trackEvent('shelf_filter_applied', state.deviceId, state.sync.pair, { shelf: String(shelf) });
            }}
            onToggleExpand={(id) => setExpandedCategories((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); void trackEvent('category_collapsed', state.deviceId, state.sync.pair, { categoryId: id }); } else { next.add(id); void trackEvent('category_expanded', state.deviceId, state.sync.pair, { categoryId: id }); } return next; })}
            onToggleExpandAll={() => setExpandedCategories((prev) => prev.size === activeCategories.length ? new Set() : new Set(activeCategories.map((c) => c.id)))}
            onOpenCategory={openCategory} onEditCategory={openCategoryModal} onDeleteCategory={deleteCategory}
            onAddCategory={() => openCategoryModal()} onDragStart={setDraggedCategoryId} onDrop={reorderCategories}
            onNavigate={(screen) => setState((prev) => ({ ...prev, screen }))}
          />
        )}

        {(state.screen === 'category' || state.screen === 'item-form') && selectedCategory && (
          <CategoryScreen
            state={state} t={t} lang={lang}
            category={selectedCategory} items={categoryItems} allShelves={allShelves}
            searchQuery={categorySearchQuery} shelfFilter={categoryShelfFilter}
            onSearchChange={(q) => { setCategorySearchQuery(q); void trackEvent('search_performed', state.deviceId, state.sync.pair); }}
            onShelfFilterChange={setCategoryShelfFilter}
            onBack={goHome} onAddItem={() => openItemForm()} onEditItem={openItemForm}
            onDeleteItem={deleteItem} onUpdateCount={updateItemCount}
          />
        )}

        {state.screen === 'history' && (
          <HistoryScreen state={state} t={t} lang={lang} onBack={() => setState((prev) => ({ ...prev, screen: 'home' }))} />
        )}

        {state.screen === 'settings' && (
          <SettingsScreen
            state={state} t={t} lang={lang} syncingNow={syncingNow} authLoading={authLoading} fileInputRef={fileInputRef}
            onSyncNow={() => void syncNow()} onCreatePair={startCreatePair} onJoinPair={startJoinPair}
            onLeavePair={() => void leavePair()} onGenerateInvite={() => void generateInviteCode()}
            onRequestNotifications={() => void requestNotificationAccess()} onExport={exportBackup}
            onImportFile={importBackup} onLogout={() => void logout()}
            onBack={() => setState((prev) => ({ ...prev, screen: 'home' }))} onUpdateSettings={setState}
          />
        )}
      </main>

      <BottomNav lang={lang} active={navActive} expiringCount={expiringItems.length} onNavigate={navTo} />

      {state.screen === 'item-form' && itemDraft && (
        <ItemFormScreen
          state={state} t={t} lang={lang} draft={itemDraft}
          onDraftChange={setItemDraft} onSave={saveItem}
          onCancel={() => setState((prev) => ({ ...prev, screen: 'category', selectedItemId: undefined }))}
        />
      )}

      {showCategoryModal && categoryModalDraft && (
        <CategoryModalSheet t={t} draft={categoryModalDraft} onDraftChange={setCategoryModalDraft} onSave={saveCategory} onDelete={deleteCategory} onClose={() => { setShowCategoryModal(false); setCategoryModalDraft(null); }} />
      )}

      {pairAction && (
        <PairModalSheet t={t} lang={lang} action={pairAction} nameInput={pairNameInput} codeInput={pairInput} importMode={joinImportMode} onNameChange={setPairNameInput} onCodeChange={setPairInput} onImportModeChange={setJoinImportMode} onSubmit={() => void submitPairAction()} onClose={() => setPairAction(null)} />
      )}

      {errorMessage && (
        <div className="w-toast error" onClick={() => setErrorMessage(null)}>
          <Icon name="alert" size={16} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
