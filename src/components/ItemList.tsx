import { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { Category, Item } from '../App';
import { ItemRow } from './ItemRow';

interface ItemListProps {
  category: Category;
  items: Item[];
  onBack: () => void;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
}

export function ItemList({
  category,
  items,
  onBack,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUpdateQuantity
}: ItemListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShelf, setSelectedShelf] = useState<number | null>(null);

  const getItemsWord = (count: number): string => {
    if (count % 10 === 1 && count % 100 !== 11) return 'заготовка';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заготовки';
    return 'заготовок';
  };

  // Get unique shelf numbers
  const uniqueShelves = useMemo(() => {
    const shelves = new Set(items.map(item => item.shelf));
    return Array.from(shelves).sort((a, b) => a - b);
  }, [items]);

  // Filter items by search query and shelf
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      const matchesShelf = selectedShelf === null || item.shelf === selectedShelf;
      return matchesSearch && matchesShelf;
    });
  }, [items, searchQuery, selectedShelf]);

  return (
    <div className="pb-24">
      {/* Header with Back Button */}
      <div className="px-4 pt-2 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[#5B9FD3] text-[17px] mb-4 active:opacity-60"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Группы</span>
        </button>

        <h1 className="text-[34px] tracking-tight text-[#1C1C1E] mb-1">{category.name}</h1>
        <p className="text-[#8E8E93] text-[17px]">
          {items.length} {getItemsWord(items.length)}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или заметкам"
            className="w-full pl-10 pr-10 py-3 bg-[#F2F7FA] rounded-lg text-[17px] text-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93] active:opacity-60"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Shelf Filter */}
      {uniqueShelves.length > 1 && (
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedShelf(null)}
              className={`px-4 py-2 rounded-full text-[15px] whitespace-nowrap transition-all flex-shrink-0 ${
                selectedShelf === null
                  ? 'bg-[#5B9FD3] text-white'
                  : 'bg-[#F2F7FA] text-[#8E8E93] active:bg-[#E8F1F8]'
              }`}
            >
              Все полки
            </button>
            {uniqueShelves.map((shelf) => (
              <button
                key={shelf}
                onClick={() => setSelectedShelf(shelf)}
                className={`px-4 py-2 rounded-full text-[15px] whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedShelf === shelf
                    ? 'bg-[#5B9FD3] text-white'
                    : 'bg-[#F2F7FA] text-[#8E8E93] active:bg-[#E8F1F8]'
                }`}
              >
                Полка {shelf}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length > 0 ? (
        <div className="px-4 space-y-2">
          {filteredItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onUpdateQuantity={onUpdateQuantity}
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[#E8F1F8] flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-[#5B9FD3]" />
          </div>
          <p className="text-[#8E8E93] text-[17px]">Ничего не найдено</p>
          <p className="text-[#C7C7CC] text-[15px] mt-1">Попробуйте изменить запрос</p>
        </div>
      ) : (
        <div className="px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[#E8F1F8] flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-[#5B9FD3]" />
          </div>
          <p className="text-[#8E8E93] text-[17px]">Нет заготовок</p>
          <p className="text-[#C7C7CC] text-[15px] mt-1">Нажмите +, чтобы добавить первую заготовку</p>
        </div>
      )}

      {/* Add Item Button */}
      <button
        onClick={onAddItem}
        className="fixed bottom-8 right-4 w-14 h-14 bg-[#5B9FD3] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
