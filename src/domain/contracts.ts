export type HistoryEventType =
  | 'item_added'
  | 'item_updated'
  | 'item_deleted'
  | 'packages_changed'
  | 'items_changed';

export interface CategoryDTO {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ItemDTO {
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
  deleted_at?: string | null;
}

export interface HistoryEventDTO {
  id: string;
  type: HistoryEventType;
  item_id?: string;
  category_id?: string;
  item_name: string;
  packages_delta?: number;
  items_delta?: number;
  timestamp: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface SyncDataDTO {
  categories: CategoryDTO[];
  items: ItemDTO[];
  history: HistoryEventDTO[];
}

export interface SyncRequestDTO {
  last_known_version: number;
  changes: SyncDataDTO;
}

export interface SyncResponseDTO {
  server_version: string;
  applied_changes: number;
  server_changes: SyncDataDTO;
}

export interface PairContextDTO {
  active_pair_id: string | null;
  personal_pair_id: string | null;
  mode: 'personal' | 'shared' | 'none';
  active_pair_name?: string | null;
}

export interface AuthUserDTO {
  id: string;
  name: string;
  email: string;
  personal_pair_id: string | null;
  active_pair_id: string | null;
}

export interface AuthTokensDTO {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponseDTO {
  user: AuthUserDTO;
  tokens: AuthTokensDTO;
  pair_context: PairContextDTO;
}

export interface CreatePairResponseDTO {
  pair_id: string;
  user_id: string;
  invite_code: string;
  invite_expires_at: string;
  access_token: string;
  token: string;
  server_version: string;
  pair_context: PairContextDTO;
}

export type JoinImportMode = 'replace' | 'merge';

export interface JoinPairResponseDTO {
  pair_id: string;
  user_id: string;
  access_token: string;
  token: string;
  server_version: string;
  pair_context: PairContextDTO;
  initial_data: SyncDataDTO;
}

export interface LeavePairResponseDTO {
  success: true;
  pair_id: string;
  server_version: string;
  access_token: string;
  token: string;
  pair_context: PairContextDTO;
  initial_data: SyncDataDTO;
}

export interface AnalyticsPayloadDTO {
  event: string;
  device_id: string;
  user_id?: string;
  pair_id?: string;
  timestamp: string;
  properties?: Record<string, string>;
  platform?: 'ios' | 'web';
  app_version?: string;
  client_ts?: string;
  session_id?: string;
}
