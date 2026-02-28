import type {
  CategoryDTO,
  HistoryEventDTO,
  ItemDTO,
  SyncDataDTO,
} from './contracts';
import type {
  Category,
  HistoryEvent,
  Item,
} from './models';

export function nowISO(): string {
  return new Date().toISOString();
}

export function dateInputToISO(dateValue: string): string {
  const safeValue = dateValue.trim();
  if (!safeValue) {
    return nowISO();
  }

  if (safeValue.length === 10) {
    return `${safeValue}T00:00:00.000Z`;
  }

  const parsed = new Date(safeValue);
  if (Number.isNaN(parsed.getTime())) {
    return nowISO();
  }
  return parsed.toISOString();
}

export function isoToDateInput(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

export function asISO(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return nowISO();
  }
  return parsed.toISOString();
}

export function categoryToDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    sort_order: category.sortOrder,
    updated_at: asISO(category.updatedAt),
    deleted_at: category.deletedAt ? asISO(category.deletedAt) : null,
  };
}

export function categoryFromDTO(dto: CategoryDTO): Category {
  const raw = dto as CategoryDTO & {
    sortOrder?: number;
    updatedAt?: string;
    deletedAt?: string | null;
  };

  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    color: raw.color,
    itemCount: 0,
    sortOrder: raw.sort_order ?? raw.sortOrder,
    updatedAt: asISO(raw.updated_at ?? raw.updatedAt ?? nowISO()),
    deletedAt: raw.deleted_at
      ? asISO(raw.deleted_at)
      : raw.deletedAt
        ? asISO(raw.deletedAt)
        : null,
  };
}

export function itemToDTO(item: Item): ItemDTO {
  return {
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    packages_count: item.packagesCount,
    items_count: item.itemsCount,
    shelf_number: item.shelfNumber,
    freeze_date: asISO(item.freezeDate),
    expiration_date: asISO(item.expirationDate),
    notes: item.notes,
    photo_url: item.photoUrl,
    updated_at: asISO(item.updatedAt),
    deleted_at: item.deletedAt ? asISO(item.deletedAt) : null,
  };
}

export function itemFromDTO(dto: ItemDTO): Item {
  const raw = dto as ItemDTO & {
    categoryId?: string;
    packagesCount?: number;
    itemsCount?: number;
    shelfNumber?: number;
    freezeDate?: string;
    expirationDate?: string;
    photoUrl?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };

  return {
    id: raw.id,
    categoryId: raw.category_id ?? raw.categoryId ?? '',
    name: raw.name,
    packagesCount: raw.packages_count ?? raw.packagesCount ?? 0,
    itemsCount: raw.items_count ?? raw.itemsCount ?? 0,
    shelfNumber: raw.shelf_number ?? raw.shelfNumber ?? 1,
    freezeDate: asISO(raw.freeze_date ?? raw.freezeDate ?? nowISO()),
    expirationDate: asISO(raw.expiration_date ?? raw.expirationDate ?? nowISO()),
    notes: raw.notes,
    photoUrl: raw.photo_url ?? raw.photoUrl,
    updatedAt: asISO(raw.updated_at ?? raw.updatedAt ?? nowISO()),
    deletedAt: raw.deleted_at
      ? asISO(raw.deleted_at)
      : raw.deletedAt
        ? asISO(raw.deletedAt)
        : null,
  };
}

export function historyToDTO(event: HistoryEvent): HistoryEventDTO {
  return {
    id: event.id,
    type: event.type,
    item_id: event.itemId,
    category_id: event.categoryId,
    item_name: event.itemName,
    packages_delta: event.packagesDelta,
    items_delta: event.itemsDelta,
    timestamp: asISO(event.timestamp),
    updated_at: asISO(event.updatedAt),
    deleted_at: event.deletedAt ? asISO(event.deletedAt) : null,
  };
}

export function historyFromDTO(dto: HistoryEventDTO): HistoryEvent {
  const raw = dto as HistoryEventDTO & {
    itemId?: string;
    categoryId?: string;
    itemName?: string;
    packagesDelta?: number;
    itemsDelta?: number;
    updatedAt?: string;
    deletedAt?: string | null;
  };

  return {
    id: raw.id,
    type: raw.type,
    itemId: raw.item_id ?? raw.itemId,
    categoryId: raw.category_id ?? raw.categoryId,
    itemName: raw.item_name ?? raw.itemName ?? '',
    packagesDelta: raw.packages_delta ?? raw.packagesDelta,
    itemsDelta: raw.items_delta ?? raw.itemsDelta,
    timestamp: asISO(raw.timestamp),
    updatedAt: raw.updated_at
      ? asISO(raw.updated_at)
      : raw.updatedAt
        ? asISO(raw.updatedAt)
        : asISO(raw.timestamp),
    deletedAt: raw.deleted_at
      ? asISO(raw.deleted_at)
      : raw.deletedAt
        ? asISO(raw.deletedAt)
        : null,
  };
}

export function syncDataToDTO(data: {
  categories: Category[];
  items: Item[];
  history: HistoryEvent[];
}): SyncDataDTO {
  return {
    categories: data.categories.map(categoryToDTO),
    items: data.items.map(itemToDTO),
    history: data.history.map(historyToDTO),
  };
}

export function syncDataFromDTO(data: SyncDataDTO): {
  categories: Category[];
  items: Item[];
  history: HistoryEvent[];
} {
  const normalized = data as SyncDataDTO & {
    categories?: CategoryDTO[];
    items?: ItemDTO[];
    history?: HistoryEventDTO[];
  };

  return {
    categories: (normalized.categories ?? []).map(categoryFromDTO),
    items: (normalized.items ?? []).map(itemFromDTO),
    history: (normalized.history ?? []).map(historyFromDTO),
  };
}

export function withCategoryCounts(categories: Category[], items: Item[]): Category[] {
  return categories
    .filter((category) => !category.deletedAt)
    .map((category) => {
      const itemCount = items.filter((item) => item.categoryId === category.id && !item.deletedAt).length;
      return {
        ...category,
        itemCount,
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
