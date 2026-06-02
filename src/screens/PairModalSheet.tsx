import { FrostModal } from '../lib/frost';
import { Icon } from '../lib/icons';
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
  const L = (ru: string, en: string) => (lang === 'ru' ? ru : en);
  const isCreate = action === 'create';

  return (
    <FrostModal title={isCreate ? t.createShared : t.joinShared} onClose={onClose}>
      <div className="w-form">
        {isCreate ? (
          <>
            <p className="w-h-sub" style={{ textAlign: 'center', margin: 0 }}>
              {L('Создайте общую морозилку и пригласите партнёра по коду', 'Create a shared freezer and invite your partner with a code')}
            </p>
            <div className="w-field">
              <label>{t.pairName}</label>
              <input
                className="w-input"
                value={nameInput}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={L('Например, наша морозилка', 'e.g. our freezer')}
                autoFocus
              />
            </div>
            <button className="w-btn primary full" disabled={!nameInput.trim()} onClick={onSubmit}>
              <Icon name="check" size={17} />
              {t.createShared}
            </button>
          </>
        ) : (
          <>
            <p className="w-h-sub" style={{ textAlign: 'center', margin: 0 }}>
              {L('Введите код, который прислал партнёр', 'Enter the code your partner sent you')}
            </p>
            <div className="w-field">
              <label>{t.pairCode}</label>
              <input
                className="w-input"
                value={codeInput}
                onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
                placeholder="ABC123"
                style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', fontSize: 18 }}
                autoFocus
              />
            </div>
            <div className="w-field">
              <label>{L('Личные данные', 'Personal data')}</label>
              <div className="w-chiprow">
                <button
                  className={`w-chip ${importMode === 'replace' ? 'on' : ''}`}
                  onClick={() => onImportModeChange('replace')}
                >
                  {L('Заменить', 'Replace')}
                </button>
                <button
                  className={`w-chip ${importMode === 'merge' ? 'on' : ''}`}
                  onClick={() => onImportModeChange('merge')}
                >
                  {L('Объединить', 'Merge')}
                </button>
              </div>
            </div>
            <button className="w-btn primary full" disabled={!codeInput.trim()} onClick={onSubmit}>
              <Icon name="users" size={17} />
              {t.joinShared}
            </button>
          </>
        )}
      </div>
    </FrostModal>
  );
}
