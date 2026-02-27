// Request/Response types for API

export interface PairContext {
  active_pair_id: string | null;
  personal_pair_id: string | null;
  mode: 'personal' | 'shared' | 'none';
  active_pair_name?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  personal_pair_id: string | null;
  active_pair_id: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
  pair_context: PairContext;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface CreatePairRequest {
  pair_name?: string;
}

export interface CreatePairResponse {
  pair_id: string;
  user_id: string;
  invite_code: string;
  invite_expires_at: string;
  server_version: string;
  access_token: string;
  token: string;
  pair_context: PairContext;
}

export type JoinImportMode = 'replace' | 'merge';

export interface JoinPairRequest {
  invite_code: string;
  import_mode: JoinImportMode;
}

export interface JoinPairResponse {
  pair_id: string;
  user_id: string;
  server_version: string;
  initial_data: {
    categories: Category[];
    items: Item[];
    history: HistoryEvent[];
  };
  access_token: string;
  token: string;
  pair_context: PairContext;
}

export interface LeavePairResponse {
  success: true;
  pair_id: string;
  server_version: string;
  initial_data: {
    categories: Category[];
    items: Item[];
    history: HistoryEvent[];
  };
  access_token: string;
  token: string;
  pair_context: PairContext;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  updated_at: string;
  deleted_at?: string;
}

export interface Item {
  id: string;
  category_id?: string;
  name: string;
  packages_count: number;
  items_count: number;
  shelf_number: number;
  freeze_date: string;
  expiration_date: string;
  notes?: string;
  photo_url?: string;
  updated_at: string;
  deleted_at?: string;
}

export interface HistoryEvent {
  id: string;
  type:
    | 'item_added'
    | 'item_updated'
    | 'item_deleted'
    | 'packages_changed'
    | 'items_changed'
    | 'itemAdded'
    | 'quantityChanged';
  item_id?: string;
  category_id?: string;
  item_name: string;
  packages_delta?: number;
  items_delta?: number;
  new_packages?: number;
  new_items?: number;
  timestamp: string;
  deleted_at?: string;
}

export interface SyncRequest {
  last_known_version: number;
  changes: {
    categories: Category[];
    items: Item[];
    history: HistoryEvent[];
  };
}

export interface SyncResponse {
  server_version: string;
  applied_changes: number;
  server_changes: {
    categories: Category[];
    items: Item[];
    history: HistoryEvent[];
  };
}
