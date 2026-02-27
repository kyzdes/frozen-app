import type { Category, HistoryEvent, Item } from '../domain/models';

interface BackupData {
  version: '1.0';
  exportedAt: string;
  categories: Category[];
  items: Item[];
  history: HistoryEvent[];
}

interface ImportResult {
  categories: Category[];
  items: Item[];
  history: HistoryEvent[];
}

export function buildBackupPayload(data: {
  categories: Category[];
  items: Item[];
  history: HistoryEvent[];
}): string {
  const payload: BackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories: data.categories,
    items: data.items,
    history: data.history,
  };

  return JSON.stringify(payload, null, 2);
}

function hasDuplicateIds(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function validateBackup(payload: BackupData): string | null {
  if (payload.version !== '1.0') {
    return `Unsupported backup version: ${payload.version}`;
  }

  const categoryIds = payload.categories.map((category) => category.id);
  if (hasDuplicateIds(categoryIds)) {
    return 'Backup has duplicate group IDs';
  }

  const itemIds = payload.items.map((item) => item.id);
  if (hasDuplicateIds(itemIds)) {
    return 'Backup has duplicate item IDs';
  }

  const validCategorySet = new Set(categoryIds);
  const orphanItem = payload.items.find((item) => !validCategorySet.has(item.categoryId));
  if (orphanItem) {
    return `Backup has orphan item: ${orphanItem.name}`;
  }

  return null;
}

export function parseBackupPayload(raw: string): ImportResult {
  let parsed: BackupData;

  try {
    parsed = JSON.parse(raw) as BackupData;
  } catch {
    throw new Error('Failed to parse JSON backup file');
  }

  const validationError = validateBackup(parsed);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    categories: parsed.categories,
    items: parsed.items,
    history: parsed.history,
  };
}
