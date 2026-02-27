import type { SyncDataDTO } from '../domain/contracts';
import {
  categoryFromDTO,
  categoryToDTO,
  historyFromDTO,
  historyToDTO,
  itemFromDTO,
  itemToDTO,
  withCategoryCounts,
} from '../domain/mappers';
import type {
  AppState,
  Category,
  HistoryEvent,
  Item,
  PendingChange,
} from '../domain/models';

function byUpdatedAt<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
}

export function compactPendingChanges(changes: PendingChange[]): SyncDataDTO {
  const categories = new Map<string, Category>();
  const items = new Map<string, Item>();
  const history = new Map<string, HistoryEvent>();

  for (const change of changes) {
    switch (change.type) {
      case 'categoryAdded':
      case 'categoryUpdated':
      case 'categoryDeleted':
        if (change.category) {
          categories.set(change.category.id, change.category);
        }
        break;
      case 'itemAdded':
      case 'itemUpdated':
      case 'itemDeleted':
        if (change.item) {
          items.set(change.item.id, change.item);
        }
        break;
      case 'historyAdded':
        if (change.historyEvent) {
          history.set(change.historyEvent.id, change.historyEvent);
        }
        break;
      default:
        break;
    }
  }

  return {
    categories: byUpdatedAt(Array.from(categories.values())).map(categoryToDTO),
    items: byUpdatedAt(Array.from(items.values())).map(itemToDTO),
    history: byUpdatedAt(Array.from(history.values())).map(historyToDTO),
  };
}

function mergeCategories(local: Category[], incoming: Category[]): Category[] {
  const map = new Map(local.map((category) => [category.id, category]));

  for (const next of incoming) {
    const current = map.get(next.id);
    if (!current || new Date(next.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      map.set(next.id, next);
    }
  }

  return Array.from(map.values());
}

function mergeItems(local: Item[], incoming: Item[]): Item[] {
  const map = new Map(local.map((item) => [item.id, item]));

  for (const next of incoming) {
    const current = map.get(next.id);
    if (!current || new Date(next.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      map.set(next.id, next);
    }
  }

  return Array.from(map.values());
}

function mergeHistory(local: HistoryEvent[], incoming: HistoryEvent[]): HistoryEvent[] {
  const map = new Map(local.map((event) => [event.id, event]));

  for (const next of incoming) {
    const current = map.get(next.id);
    if (!current || new Date(next.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      map.set(next.id, next);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function applyServerChanges(state: AppState, data: SyncDataDTO): AppState {
  const incomingCategories = data.categories.map(categoryFromDTO);
  const incomingItems = data.items.map(itemFromDTO);
  const incomingHistory = data.history.map(historyFromDTO);

  const mergedCategories = mergeCategories(state.categories, incomingCategories).filter(
    (category) => !category.deletedAt
  );
  const mergedItems = mergeItems(state.items, incomingItems).filter((item) => !item.deletedAt);
  const mergedHistory = mergeHistory(state.history, incomingHistory).filter((event) => !event.deletedAt);

  return {
    ...state,
    categories: withCategoryCounts(mergedCategories, mergedItems),
    items: mergedItems,
    history: mergedHistory.slice(0, 500),
  };
}
