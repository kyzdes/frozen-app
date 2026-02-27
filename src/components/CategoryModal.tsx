import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Category } from '../App';

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSave: (name: string, icon: string, color: string) => void;
}

const PRESET_ICONS = [
  '🥬', '🥕', '🥦', '🧅', '🍅', '🥒', // Овощи
  '🍖', '🥩', '🍗', '🥓', '🍤', '🐟', // Мясо/Рыба
  '🫐', '🍓', '🍒', '🍇', '🫙', '🍋', // Ягоды/Фрукты
  '🥟', '🥠', '🍝', '🥧', '🧁', '🍰', // Готовые блюда
  '🥣', '🍜', '🥘', '🥫', '🧈', '🧊', // Бульоны/Другое
];

const PRESET_COLORS = [
  '#34C759', // Зеленый
  '#FF3B30', // Красный
  '#AF52DE', // Фиолетовый
  '#5B9FD3', // Синий
  '#FF9500', // Оранжевый
  '#FFCC00', // Желтый
  '#FF2D55', // Розовый
  '#5AC8FA', // Голубой
];

export function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🥬');
  const [selectedColor, setSelectedColor] = useState('#34C759');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSelectedIcon(category.icon || '🥬');
      setSelectedColor(category.color || '#34C759');
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), selectedIcon, selectedColor);
      setName('');
      setSelectedIcon('🥬');
      setSelectedColor('#34C759');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-4 bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5EA]">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center active:opacity-60"
          >
            <X className="w-5 h-5 text-[#8E8E93]" />
          </button>
          
          <h2 className="text-[17px] text-[#1C1C1E]">
            {category ? 'Редактировать группу' : 'Новая группа'}
          </h2>
          
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={`text-[17px] ${
              name.trim() ? 'text-[#5B9FD3]' : 'text-[#C7C7CC]'
            } active:opacity-60`}
          >
            {category ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-[13px] text-[#8E8E93] mb-2 uppercase tracking-wide">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название группы"
              autoFocus
              className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-[13px] text-[#8E8E93] mb-2 uppercase tracking-wide">
              Иконка
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl transition-all ${
                    selectedIcon === icon
                      ? 'bg-[#5B9FD3] scale-110'
                      : 'bg-[#F2F7FA] active:bg-[#E8F1F8]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-[13px] text-[#8E8E93] mb-2 uppercase tracking-wide">
              Цвет
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-full aspect-square rounded-lg transition-all ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-[#5B9FD3] scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2">
            <label className="block text-[13px] text-[#8E8E93] mb-2 uppercase tracking-wide">
              Предпросмотр
            </label>
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ backgroundColor: `${selectedColor}15` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: selectedColor }}
              >
                {selectedIcon}
              </div>
              <span className="text-[17px] text-[#1C1C1E]">
                {name || 'Название группы'}
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
