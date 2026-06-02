import { PRESET_COLORS, PRESET_ICONS } from '../lib/copy';
import { tint } from '../lib/format';
import { FrostModal } from '../lib/frost';
import { Icon } from '../lib/icons';
import type { CategoryDraft, CategoryModalProps } from '../lib/types';

export function CategoryModalSheet({ t, draft, onDraftChange, onSave, onDelete, onClose }: CategoryModalProps) {
  const set = (patch: Partial<CategoryDraft>) => onDraftChange((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <FrostModal title={draft.id ? t.editCategory : t.addCategory} onClose={onClose}>
      <div className="w-form">
        <div
          className="w-prev"
          style={{ background: `linear-gradient(0deg, ${tint(draft.color, 0.12)}, ${tint(draft.color, 0.12)}), var(--glass-fill)` }}
        >
          <div className="w-cap">{draft.icon}</div>
          <div className="w-cat-meta">
            <strong>{draft.name || t.categoryName}</strong>
            <div className="sub">{t.preview}</div>
          </div>
        </div>

        <div className="w-field">
          <label>{t.categoryName}</label>
          <input
            className="w-input"
            value={draft.name}
            onChange={(event) => set({ name: event.target.value })}
            autoFocus
          />
        </div>

        <div className="w-field">
          <label>{t.icon}</label>
          <div className="w-iconpick">
            {PRESET_ICONS.map((icon) => (
              <button key={icon} className={draft.icon === icon ? 'on' : ''} onClick={() => set({ icon })}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="w-field">
          <label>{t.color}</label>
          <div className="w-colorpick">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={draft.color === color ? 'on' : ''}
                style={{ background: color }}
                onClick={() => set({ color })}
                aria-label={color}
              />
            ))}
          </div>
        </div>

        <button className="w-btn primary full" disabled={!draft.name.trim()} onClick={onSave}>
          <Icon name="check" size={18} />
          {t.save}
        </button>
        {draft.id ? (
          <button
            className="w-btn danger full"
            onClick={() => {
              onDelete(draft.id!);
              onClose();
            }}
          >
            <Icon name="trash" size={17} />
            {t.delete}
          </button>
        ) : null}
      </div>
    </FrostModal>
  );
}
