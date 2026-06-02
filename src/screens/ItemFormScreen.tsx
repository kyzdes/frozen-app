import { DateField, FrostModal, Stepper } from '../lib/frost';
import { Icon } from '../lib/icons';
import type { ItemDraft, ItemFormScreenProps } from '../lib/types';

const SHELVES = [1, 2, 3, 4, 5];

export function ItemFormScreen({ state, t, lang, draft, onDraftChange, onSave, onCancel }: ItemFormScreenProps) {
  const category = state.categories.find((c) => c.id === state.selectedCategoryId);
  const set = (patch: Partial<ItemDraft>) => onDraftChange((prev) => (prev ? { ...prev, ...patch } : prev));

  const canSave = Boolean(draft.name.trim()) && Boolean(draft.expirationDate);
  const shelves = SHELVES.includes(draft.shelfNumber) ? SHELVES : [...SHELVES, draft.shelfNumber];

  return (
    <FrostModal
      title={draft.id ? t.editItem : t.addItem}
      subtitle={category ? `${category.icon || '📦'} ${category.name}` : undefined}
      onClose={onCancel}
    >
      <div className="w-form">
        <div className="w-field">
          <label>{t.itemName}</label>
          <input
            className="w-input"
            value={draft.name}
            onChange={(event) => set({ name: event.target.value })}
            placeholder={lang === 'ru' ? 'Например, куриный бульон' : 'e.g. chicken broth'}
            autoFocus
          />
        </div>

        <div className="w-row2">
          <div className="w-field">
            <label>{lang === 'ru' ? 'Упаковки' : 'Packages'}</label>
            <div className="w-stepfield">
              <span className="w-num" style={{ fontSize: 17 }}>{draft.packagesCount}</span>
              <Stepper value={draft.packagesCount} onChange={(v) => set({ packagesCount: v })} />
            </div>
          </div>
          <div className="w-field">
            <label>{lang === 'ru' ? 'Штуки' : 'Pieces'}</label>
            <div className="w-stepfield">
              <span className="w-num" style={{ fontSize: 17 }}>{draft.itemsCount}</span>
              <Stepper value={draft.itemsCount} onChange={(v) => set({ itemsCount: v })} />
            </div>
          </div>
        </div>

        <div className="w-field">
          <label>{lang === 'ru' ? 'Срок годности' : 'Expiry date'}</label>
          <DateField
            value={draft.expirationDate}
            onChange={(value) => set({ expirationDate: value })}
            lang={lang}
            placeholder={lang === 'ru' ? 'Выберите дату' : 'Pick a date'}
          />
        </div>

        <div className="w-field">
          <label>{lang === 'ru' ? 'Дата заморозки' : 'Freeze date'}</label>
          <DateField
            value={draft.freezeDate}
            onChange={(value) => set({ freezeDate: value })}
            lang={lang}
            placeholder={lang === 'ru' ? 'Выберите дату' : 'Pick a date'}
          />
        </div>

        <div className="w-field">
          <label>{lang === 'ru' ? 'Полка' : 'Shelf'}</label>
          <div className="w-chiprow">
            {shelves.map((shelf) => (
              <button
                key={shelf}
                className={`w-chip ${draft.shelfNumber === shelf ? 'on' : ''}`}
                onClick={() => set({ shelfNumber: shelf })}
              >
                {lang === 'ru' ? 'Полка' : 'Shelf'} {shelf}
              </button>
            ))}
          </div>
        </div>

        <div className="w-field">
          <label>{lang === 'ru' ? 'Фото (URL)' : 'Photo (URL)'}</label>
          <input
            className="w-input"
            value={draft.photoUrl}
            onChange={(event) => set({ photoUrl: event.target.value })}
            placeholder="https://…"
          />
        </div>

        <div className="w-field">
          <label>{lang === 'ru' ? 'Заметки' : 'Notes'}</label>
          <textarea
            className="w-input"
            rows={2}
            value={draft.notes}
            onChange={(event) => set({ notes: event.target.value })}
            placeholder={lang === 'ru' ? 'Необязательно' : 'Optional'}
          />
        </div>

        <button className="w-btn primary full" disabled={!canSave} onClick={onSave}>
          <Icon name="check" size={18} />
          {t.save}
        </button>
      </div>
    </FrostModal>
  );
}
