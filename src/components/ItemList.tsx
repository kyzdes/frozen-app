import { ChevronLeft, Plus } from 'lucide-react';
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
  const getItemsWord = (count: number): string => {
    if (count % 10 === 1 && count % 100 !== 11) return 'заготовка';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заготовки';
    return 'заготовок';
  };

  return (
    <div className="pb-24">
      {/* Header with Back Button */}
      <div className="px-4 pt-2 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[#5B9FD3] text-[17px] mb-4 active:opacity-60"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Категории</span>
        </button>
        
        <h1 className="text-[34px] tracking-tight text-[#1C1C1E] mb-1">{category.name}</h1>
        <p className="text-[#8E8E93] text-[17px]">
          {items.length} {getItemsWord(items.length)}
        </p>
      </div>

      {/* Items List */}
      {items.length > 0 ? (
        <div className="px-4 space-y-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onUpdateQuantity={onUpdateQuantity}
            />
          ))}
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
