import type { JoinImportMode } from '../domain/contracts';
import type { AppState, Category, Item } from '../domain/models';
import type { CopyDictionary } from './copy';

export type CategoryDraft = {
  id?: string;
  name: string;
  icon: string;
  color: string;
};

export type ItemDraft = {
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

export type PairAction = 'create' | 'join';
export type AuthMode = 'login' | 'register';

export type ScreenProps = {
  state: AppState;
  t: CopyDictionary;
  lang: 'ru' | 'en';
};

export type HomeScreenProps = ScreenProps & {
  categories: Category[];
  filteredCategories: Category[];
  filteredItems: Item[];
  allShelves: number[];
  totalItems: number;
  expandedCategories: Set<string>;
  searchQuery: string;
  shelfFilter: number | null;
  onSearchChange: (query: string) => void;
  onShelfFilterChange: (shelf: number | null) => void;
  onToggleExpand: (categoryId: string) => void;
  onToggleExpandAll: () => void;
  onOpenCategory: (categoryId: string) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddCategory: () => void;
  onDragStart: (categoryId: string) => void;
  onDrop: (targetId: string) => void;
  onNavigate: (screen: AppState['screen']) => void;
};

export type CategoryScreenProps = ScreenProps & {
  category: Category;
  items: Item[];
  allShelves: number[];
  searchQuery: string;
  shelfFilter: number | null;
  onSearchChange: (query: string) => void;
  onShelfFilterChange: (shelf: number | null) => void;
  onBack: () => void;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateCount: (itemId: string, field: 'packagesCount' | 'itemsCount', delta: number) => void;
};

export type ItemFormScreenProps = ScreenProps & {
  draft: ItemDraft;
  onDraftChange: (updater: (prev: ItemDraft | null) => ItemDraft | null) => void;
  onSave: () => void;
  onCancel: () => void;
};

export type HistoryScreenProps = ScreenProps & {
  onBack: () => void;
};

export type SettingsScreenProps = ScreenProps & {
  syncingNow: boolean;
  authLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSyncNow: () => void;
  onCreatePair: () => void;
  onJoinPair: () => void;
  onLeavePair: () => void;
  onGenerateInvite: () => void;
  onRequestNotifications: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  onLogout: () => void;
  onBack: () => void;
  onUpdateSettings: (updater: (prev: AppState) => AppState) => void;
};

export type AuthScreenProps = {
  lang: 'ru' | 'en';
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onModeChange: (mode: AuthMode) => void;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
};

export type CategoryModalProps = {
  t: CopyDictionary;
  draft: CategoryDraft;
  onDraftChange: (updater: (prev: CategoryDraft | null) => CategoryDraft | null) => void;
  onSave: () => void;
  onDelete: (categoryId: string) => void;
  onClose: () => void;
};

export type PairModalProps = {
  t: CopyDictionary;
  lang: 'ru' | 'en';
  action: PairAction;
  nameInput: string;
  codeInput: string;
  importMode: JoinImportMode;
  onNameChange: (name: string) => void;
  onCodeChange: (code: string) => void;
  onImportModeChange: (mode: JoinImportMode) => void;
  onSubmit: () => void;
  onClose: () => void;
};
