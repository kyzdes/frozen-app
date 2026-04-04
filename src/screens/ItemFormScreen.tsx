import { ArrowLeft } from 'lucide-react';
import type { ItemFormScreenProps } from '../lib/types';

export function ItemFormScreen({ t, lang, draft, onDraftChange, onSave, onCancel }: ItemFormScreenProps) {
  return (
    <section className="screen">
      <header className="screen-header compact">
        <button className="back-button" onClick={onCancel}>
          <ArrowLeft size={18} />
          {t.cancel}
        </button>
        <h2>{draft.id ? t.editItem : t.addItem}</h2>
        <button className="pill primary" onClick={onSave}>
          {t.done}
        </button>
      </header>

      <div className="form-stack">
        <label>
          {t.itemName}
          <input
            value={draft.name}
            onChange={(event) => onDraftChange((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
            placeholder={lang === 'ru' ? 'Например: Куриный бульон' : 'Example: Chicken broth'}
          />
        </label>

        <div className="grid-2">
          <label>
            Упаковок
            <input
              type="number"
              min={0}
              value={draft.packagesCount}
              onChange={(event) =>
                onDraftChange((prev) => (prev ? { ...prev, packagesCount: Number.parseInt(event.target.value, 10) || 0 } : prev))
              }
            />
          </label>
          <label>
            Штук
            <input
              type="number"
              min={0}
              value={draft.itemsCount}
              onChange={(event) =>
                onDraftChange((prev) => (prev ? { ...prev, itemsCount: Number.parseInt(event.target.value, 10) || 0 } : prev))
              }
            />
          </label>
        </div>

        <label>
          Полка
          <input
            type="number"
            min={1}
            value={draft.shelfNumber}
            onChange={(event) =>
              onDraftChange((prev) => (prev ? { ...prev, shelfNumber: Number.parseInt(event.target.value, 10) || 1 } : prev))
            }
          />
        </label>

        <div className="grid-2">
          <label>
            Дата заморозки
            <input
              type="date"
              value={draft.freezeDate}
              onChange={(event) => onDraftChange((prev) => (prev ? { ...prev, freezeDate: event.target.value } : prev))}
            />
          </label>
          <label>
            Срок годности
            <input
              type="date"
              value={draft.expirationDate}
              onChange={(event) =>
                onDraftChange((prev) => (prev ? { ...prev, expirationDate: event.target.value } : prev))
              }
            />
          </label>
        </div>

        <label>
          Фото URL
          <input
            value={draft.photoUrl}
            onChange={(event) => onDraftChange((prev) => (prev ? { ...prev, photoUrl: event.target.value } : prev))}
            placeholder="https://..."
          />
        </label>

        <label>
          Заметки
          <textarea
            value={draft.notes}
            onChange={(event) => onDraftChange((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
            rows={4}
          />
        </label>
      </div>
    </section>
  );
}
