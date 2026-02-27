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
  return {
    id: dto.id,
    name: dto.name,
    icon: dto.icon,
    color: dto.color,
    itemCount: 0,
    sortOrder: dto.sort_order,
    updatedAt: asISO(dto.updated_at),
    deletedAt: dto.deleted_at ? asISO(dto.deleted_at) : null,
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
  return {
    id: dto.id,
    categoryId: dto.category_id || '',
    name: dto.name,
    packagesCount: dto.packages_count,
    itemsCount: dto.items_count,
    shelfNumber: dto.shelf_number,
    freezeDate: asISO(dto.freeze_date),
    expirationDate: asISO(dto.expiration_date),
    notes: dto.notes,
    photoUrl: dto.photo_url,
    updatedAt: asISO(dto.updated_at),
    deletedAt: dto.deleted_at ? asISO(dto.deleted_at) : null,
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
  return {
    id: dto.id,
    type: dto.type,
    itemId: dto.item_id,
    categoryId: dto.category_id,
    itemName: dto.item_name,
    packagesDelta: dto.packages_delta,
    itemsDelta: dto.items_delta,
    timestamp: asISO(dto.timestamp),
    updatedAt: dto.updated_at ? asISO(dto.updated_at) : asISO(dto.timestamp),
    deletedAt: dto.deleted_at ? asISO(dto.deleted_at) : null,
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
  return {
    categories: data.categories.map(categoryFromDTO),
    items: data.items.map(itemFromDTO),
    history: data.history.map(historyFromDTO),
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
