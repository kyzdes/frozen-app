import { Minus, Plus, Edit2, Trash2, AlertCircle, CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { Item } from '../App';

interface ItemRowProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
}

export function ItemRow({ item, onEdit, onDelete, onUpdateQuantity }: ItemRowProps) {
  const [showActions, setShowActions] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const expirationDate = new Date(item.expirationDate);
  const today = new Date();
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpired = daysUntilExpiration < 0;
  const isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 30;

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

  const getDaysWord = (count: number): string => {
    const absCount = Math.abs(count);
    if (absCount % 10 === 1 && absCount % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(absCount % 10) && ![12, 13, 14].includes(absCount % 100)) return 'дня';
    return 'дней';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action Buttons (behind) */}
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button
          onClick={() => {
            onEdit(item);
            setShowActions(false);
          }}
          className="w-20 bg-[#5B9FD3] flex items-center justify-center"
        >
          <Edit2 className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="w-20 bg-[#FF3B30] flex items-center justify-center"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Card Content */}
      <div
        className={`bg-white rounded-xl p-4 transition-all ${
          showActions ? '-translate-x-40' : 'translate-x-0'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          {/* Photo */}
          {item.photo && (
            <img 
              src={item.photo} 
              alt={item.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          )}
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-[17px] text-[#1C1C1E]">{item.name}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="ml-2 p-1.5 rounded-lg active:bg-[#E8F1F8] transition-colors flex-shrink-0"
              >
                <Edit2 className="w-4 h-4 text-[#5B9FD3]" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 text-[15px] text-[#8E8E93] mb-2">
              <span>{item.packages} уп. • {item.items} шт.</span>
              <span>Полка {item.shelf}</span>
            </div>

            {/* Expiration Status */}
            <div className="flex items-center gap-1.5 text-[13px] mb-1">
              {isExpired ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF3B30]" />
                  <span className="text-[#FF3B30]">Просрочено</span>
                </>
              ) : isExpiringSoon ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#FF9500]" />
                  <span className="text-[#FF9500]">{daysUntilExpiration} {getDaysWord(daysUntilExpiration)}</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-3.5 h-3.5 text-[#34C759]" />
                  <span className="text-[#8E8E93]">Свежее</span>
                </>
              )}
            </div>

            {/* Notes */}
            {item.notes && (
              <div className="text-[13px] text-[#8E8E93] mt-1">
                {item.notes}
              </div>
            )}
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(item.id, -1);
              }}
              className="w-8 h-8 rounded-full bg-[#E8F1F8] flex items-center justify-center active:bg-[#D0E5F3] transition-colors"
              disabled={item.packages === 0}
            >
              <Minus className="w-4 h-4 text-[#5B9FD3]" strokeWidth={2.5} />
            </button>
            
            <span className="text-[17px] text-[#1C1C1E] w-8 text-center">
              {item.packages}
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(item.id, 1);
              }}
              className="w-8 h-8 rounded-full bg-[#E8F1F8] flex items-center justify-center active:bg-[#D0E5F3] transition-colors"
            >
              <Plus className="w-4 h-4 text-[#5B9FD3]" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
