import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Category } from '../App';

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function CategoryModal({ category, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
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
            {category ? 'Редактировать категорию' : 'Новая категория'}
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
        <form onSubmit={handleSubmit} className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название категории"
            autoFocus
            className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
          />
          
          {!category && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['Овощи', 'Бульоны', 'Мясо', 'Ягоды', 'Выпечка', 'Готовые блюда'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className="px-3 py-1.5 bg-[#E8F1F8] text-[#5B9FD3] rounded-full text-[13px] active:bg-[#D0E5F3]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
