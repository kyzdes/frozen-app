// Explicit camelCase <-> snake_case field mapping for iOS <-> DB compatibility

const CAMEL_TO_SNAKE: Record<string, string> = {
  categoryId: 'category_id',
  packagesCount: 'packages_count',
  itemsCount: 'items_count',
  shelfNumber: 'shelf_number',
  freezeDate: 'freeze_date',
  expirationDate: 'expiration_date',
  photoUrl: 'photo_url',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  serverVersion: 'server_version',
  sortOrder: 'sort_order',
  itemId: 'item_id',
  itemName: 'item_name',
  packagesDelta: 'packages_delta',
  itemsDelta: 'items_delta',
  itemCount: 'item_count',
  newPackages: 'new_packages',
  newItems: 'new_items',
};

const SNAKE_TO_CAMEL: Record<string, string> = {};
for (const [camel, snake] of Object.entries(CAMEL_TO_SNAKE)) {
  SNAKE_TO_CAMEL[snake] = camel;
}

/** Convert an object's camelCase keys to snake_case (for DB writes) */
export function camelToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = CAMEL_TO_SNAKE[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

/** Convert an object's snake_case keys to camelCase (for iOS responses) */
export function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = SNAKE_TO_CAMEL[key] || key;
    result[camelKey] = value;
  }
  return result;
}
