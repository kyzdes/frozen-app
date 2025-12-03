import { ChevronRight, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { Category } from '../App';

interface CategoryCardProps {
  category: Category;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export function CategoryCard({
  category,
  index,
  isDragging,
  isDragOver,
  onSelect,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: CategoryCardProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [showActions, setShowActions] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50) {
      setShowActions(true);
    } else if (diff < -50) {
      setShowActions(false);
    }
  };

  const getItemsWord = (count: number): string => {
    if (count % 10 === 1 && count % 100 !== 11) return 'заготовка';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заготовки';
    return 'заготовок';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action Buttons (behind) */}
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button
          onClick={() => {
            onEdit(category);
            setShowActions(false);
          }}
          className="w-20 bg-[#5B9FD3] flex items-center justify-center"
        >
          <Edit2 className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="w-20 bg-[#FF3B30] flex items-center justify-center"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Card Content */}
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(index);
        }}
        onDrop={() => onDrop(index)}
        onDragEnd={onDragEnd}
        className={`rounded-xl p-4 flex items-center gap-3 transition-all cursor-move ${
          showActions ? '-translate-x-40' : 'translate-x-0'
        } ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'scale-105 ring-2 ring-[#5B9FD3]' : ''}`}
        style={{ backgroundColor: `${category.color || '#34C759'}15` }}
        onClick={() => !showActions && onSelect(category)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <GripVertical className="w-5 h-5 text-[#C7C7CC] flex-shrink-0 cursor-grab active:cursor-grabbing" />

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: category.color || '#34C759' }}
        >
          {category.icon || '📦'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] text-[#1C1C1E] mb-1">{category.name}</h3>
          <p className="text-[15px] text-[#8E8E93]">
            {category.itemCount} {getItemsWord(category.itemCount)}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(category);
          }}
          className="p-2 rounded-lg active:bg-[#E8F1F8] transition-colors flex-shrink-0"
        >
          <Edit2 className="w-4 h-4 text-[#5B9FD3]" />
        </button>

        <ChevronRight className="w-5 h-5 text-[#C7C7CC] flex-shrink-0" />
      </div>
    </div>
  );
}
