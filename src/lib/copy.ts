export type CopyDictionary = {
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
  collapse: string;
  expand: string;
  allShelves: string;
  shelf: string;
  openFullList: string;
  addShort: string;
};

export const COPY: Record<'ru' | 'en', CopyDictionary> = {
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
    collapse: 'Свернуть',
    expand: 'Развернуть',
    allShelves: 'Все полки',
    shelf: 'Полка',
    openFullList: 'Открыть полный список',
    addShort: 'Добавить +',
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
    collapse: 'Collapse',
    expand: 'Expand',
    allShelves: 'All shelves',
    shelf: 'Shelf',
    openFullList: 'Open full list',
    addShort: 'Add +',
  },
};

export const PRESET_ICONS = [
  '🥬', '🥕', '🥦', '🧅', '🍅', '🥒',
  '🍖', '🥩', '🍗', '🥓', '🍤', '🐟',
  '🫐', '🍓', '🍒', '🍇', '🫙', '🍋',
  '🥟', '🥠', '🍝', '🥧', '🧁', '🍰',
  '🥣', '🍜', '🥘', '🥫', '🧈', '🧊',
];

export const PRESET_COLORS = [
  '#34C759',
  '#FF3B30',
  '#AF52DE',
  '#5B9FD3',
  '#FF9500',
  '#FFCC00',
  '#FF2D55',
  '#5AC8FA',
];
