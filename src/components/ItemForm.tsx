import { useState, useRef } from 'react';
import { ChevronLeft, Camera, X } from 'lucide-react';
import { Item } from '../App';

interface ItemFormProps {
  item: Item | null;
  categoryId: string;
  onBack: () => void;
  onSave: (item: Item) => void;
}

export function ItemForm({ item, categoryId, onBack, onSave }: ItemFormProps) {
  const [name, setName] = useState(item?.name || '');
  const [packages, setPackages] = useState(item?.packages.toString() || '1');
  const [items, setItems] = useState(item?.items.toString() || '1');
  const [shelf, setShelf] = useState(item?.shelf.toString() || '1');
  const [freezeDate, setFreezeDate] = useState(item?.freezeDate || new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState(item?.expirationDate || '');
  const [photo, setPhoto] = useState(item?.photo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !expirationDate) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    const itemData: Item = {
      id: item?.id || '',
      name: name.trim(),
      packages: parseInt(packages) || 1,
      items: parseInt(items) || 1,
      shelf: parseInt(shelf) || 1,
      freezeDate,
      expirationDate,
      photo: photo || undefined,
      categoryId
    };

    onSave(itemData);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-2 pb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[#5B9FD3] text-[17px] active:opacity-60"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Отмена</span>
        </button>
        
        <h1 className="text-[17px] text-[#1C1C1E]">
          {item ? 'Редактировать' : 'Новая заготовка'}
        </h1>
        
        <button
          onClick={handleSubmit}
          className="text-[#5B9FD3] text-[17px] active:opacity-60"
        >
          Готово
        </button>
      </div>

      {/* Form */}
      <div className="px-4 space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-[13px] text-[#8E8E93] mb-3 uppercase tracking-wide">
            Фото (необязательно)
          </label>
          
          {photo ? (
            <div className="relative inline-block">
              <img 
                src={photo} 
                alt="Предпросмотр" 
                className="w-32 h-32 rounded-xl object-cover"
              />
              <button
                onClick={() => setPhoto('')}
                className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF3B30] rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-xl bg-[#F2F7FA] flex flex-col items-center justify-center gap-2 active:bg-[#E8F1F8] transition-colors"
            >
              <Camera className="w-8 h-8 text-[#5B9FD3]" />
              <span className="text-[13px] text-[#5B9FD3]">Добавить фото</span>
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Name */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-[13px] text-[#8E8E93] mb-3 uppercase tracking-wide">
            Название *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: куриная грудка, клубника"
            className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
          />
        </div>

        {/* Quantity */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-[13px] text-[#8E8E93] mb-3 uppercase tracking-wide">
            Количество
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-[#8E8E93] mb-2">Упаковок</label>
              <input
                type="number"
                min="0"
                value={packages}
                onChange={(e) => setPackages(e.target.value)}
                className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
              />
            </div>
            
            <div>
              <label className="block text-[13px] text-[#8E8E93] mb-2">Штук</label>
              <input
                type="number"
                min="0"
                value={items}
                onChange={(e) => setItems(e.target.value)}
                className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
              />
            </div>
          </div>
        </div>

        {/* Shelf Number */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-[13px] text-[#8E8E93] mb-3 uppercase tracking-wide">
            Номер полки
          </label>
          <input
            type="number"
            min="1"
            value={shelf}
            onChange={(e) => setShelf(e.target.value)}
            className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
          />
        </div>

        {/* Dates */}
        <div className="bg-white rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-[13px] text-[#8E8E93] mb-3 uppercase tracking-wide">
              Дата заморозки
            </label>
            <input
              type="date"
              value={freezeDate}
              onChange={(e) => setFreezeDate(e.target.value)}
              className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
            />
          </div>
          
          <div>
            <label className="block text-[13px] text-[#8E8E93] mb-3 uppercase tracking-wide">
              Срок годности *
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full text-[17px] text-[#1C1C1E] bg-[#F2F7FA] rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#5B9FD3]/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
