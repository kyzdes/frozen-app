import { Trash2, X } from 'lucide-react';
import { PRESET_COLORS, PRESET_ICONS } from '../lib/copy';
import type { CategoryModalProps } from '../lib/types';

export function CategoryModalSheet({ t, draft, onDraftChange, onSave, onDelete, onClose }: CategoryModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <header className="sheet-header">
          <button className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
          <h3>{draft.id ? t.editCategory : t.addCategory}</h3>
          <button className="pill primary" onClick={onSave}>
            {t.save}
          </button>
        </header>

        <div className="form-stack">
          <label>
            {t.categoryName}
            <input
              value={draft.name}
              onChange={(event) =>
                onDraftChange((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
            />
          </label>

          <div>
            <p className="label-title">{t.icon}</p>
            <div className="icon-grid">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  className={`icon-pick ${draft.icon === icon ? 'icon-pick-active' : ''}`}
                  onClick={() =>
                    onDraftChange((prev) => (prev ? { ...prev, icon } : prev))
                  }
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label-title">{t.color}</p>
            <div className="color-grid">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-pick ${draft.color === color ? 'color-pick-active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() =>
                    onDraftChange((prev) => (prev ? { ...prev, color } : prev))
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <p className="label-title">{t.preview}</p>
            <div className="preview-card" style={{ backgroundColor: `${draft.color}20` }}>
              <div className="category-badge" style={{ backgroundColor: draft.color }}>
                {draft.icon}
              </div>
              <span>{draft.name || t.categoryName}</span>
            </div>
          </div>

          {draft.id ? (
            <button
              className="settings-button danger"
              onClick={() => {
                onDelete(draft.id!);
                onClose();
              }}
            >
              <Trash2 size={16} />
              {t.delete}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
