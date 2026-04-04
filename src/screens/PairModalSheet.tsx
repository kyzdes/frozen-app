import { Check, X } from 'lucide-react';
import type { PairModalProps } from '../lib/types';

export function PairModalSheet({
  t,
  lang,
  action,
  nameInput,
  codeInput,
  importMode,
  onNameChange,
  onCodeChange,
  onImportModeChange,
  onSubmit,
  onClose,
}: PairModalProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <header className="sheet-header">
          <button className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
          <h3>{action === 'create' ? t.createShared : t.joinShared}</h3>
          <button className="pill primary" onClick={onSubmit}>
            <Check size={14} />
            {t.done}
          </button>
        </header>

        <div className="form-stack">
          {action === 'create' ? (
            <label>
              {t.pairName}
              <input
                value={nameInput}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={lang === 'ru' ? 'Например: Наша морозилка' : 'Example: Shared freezer'}
              />
            </label>
          ) : (
            <>
              <label>
                {t.pairCode}
                <input
                  value={codeInput}
                  onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                />
              </label>
              <div className="join-mode-grid">
                <button
                  className={`chip ${importMode === 'replace' ? 'chip-active' : ''}`}
                  onClick={() => onImportModeChange('replace')}
                >
                  {lang === 'ru' ? 'Заменить личные данные' : 'Replace personal data'}
                </button>
                <button
                  className={`chip ${importMode === 'merge' ? 'chip-active' : ''}`}
                  onClick={() => onImportModeChange('merge')}
                >
                  {lang === 'ru' ? 'Объединить без дедупа' : 'Merge without dedupe'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
