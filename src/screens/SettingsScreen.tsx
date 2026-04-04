import { ArrowLeft, Download, Link2, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { getDaysWord, syncStatusLabel } from '../lib/helpers';
import type { AppState } from '../domain/models';
import type { SettingsScreenProps } from '../lib/types';

export function SettingsScreen({
  state,
  t,
  lang,
  syncingNow,
  authLoading,
  fileInputRef,
  onSyncNow,
  onCreatePair,
  onJoinPair,
  onLeavePair,
  onGenerateInvite,
  onRequestNotifications,
  onExport,
  onImportFile,
  onLogout,
  onBack,
  onUpdateSettings,
}: SettingsScreenProps) {
  return (
    <section className="screen">
      <header className="screen-header compact">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t.categories}
        </button>
        <h2>{t.settings}</h2>
        <span />
      </header>

      <div className="settings-stack">
        <section className="settings-group">
          <h3>{lang === 'ru' ? 'Аккаунт' : 'Account'}</h3>
          <div className="sync-status-line">
            <span>{lang === 'ru' ? 'Имя' : 'Name'}</span>
            <strong>{state.auth.userName || '-'}</strong>
          </div>
          <div className="sync-status-line">
            <span>Email</span>
            <strong>{state.auth.userEmail || '-'}</strong>
          </div>
          <button className="settings-button danger" onClick={onLogout} disabled={authLoading}>
            <X size={16} />
            {lang === 'ru' ? 'Выйти из аккаунта' : 'Log out'}
          </button>
        </section>

        <section className="settings-group">
          <h3>{t.syncWithPartner}</h3>

          {state.sync.pair ? (
            <>
              <div className="sync-status-line">
                <span>{t.status}</span>
                <strong>{syncStatusLabel(state.sync.status.state, lang)}</strong>
              </div>
              <div className="sync-status-line">
                <span>Pair ID</span>
                <code>{state.sync.pair.pairId}</code>
              </div>
              {state.sync.pair.inviteCode ? (
                <div className="sync-status-line">
                  <span>{lang === 'ru' ? 'Код приглашения' : 'Invite code'}</span>
                  <code>{state.sync.pair.inviteCode}</code>
                </div>
              ) : null}

              <button className="settings-button" onClick={onSyncNow} disabled={syncingNow}>
                <RefreshCw size={16} />
                {t.manualSync}
              </button>

              <button className="settings-button" onClick={onGenerateInvite}>
                <Link2 size={16} />
                {lang === 'ru' ? 'Получить код приглашения' : 'Get invite code'}
              </button>

              {state.sync.pair.mode === 'shared' ? (
                <button className="settings-button danger" onClick={onLeavePair}>
                  <X size={16} />
                  {t.leaveShared}
                </button>
              ) : (
                <>
                  <button className="settings-button" onClick={onCreatePair}>
                    <Plus size={16} />
                    {t.createShared}
                  </button>
                  <button className="settings-button" onClick={onJoinPair}>
                    <Link2 size={16} />
                    {t.joinShared}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="settings-button" onClick={onCreatePair}>
                <Plus size={16} />
                {t.createShared}
              </button>
              <button className="settings-button" onClick={onJoinPair}>
                <Link2 size={16} />
                {t.joinShared}
              </button>
            </>
          )}
        </section>

        <section className="settings-group">
          <h3>{t.notifications}</h3>
          <label className="toggle-row">
            <span>{lang === 'ru' ? 'Включить напоминания' : 'Enable reminders'}</span>
            <input
              type="checkbox"
              checked={state.settings.notificationsEnabled}
              onChange={(event) => {
                if (event.target.checked) {
                  onRequestNotifications();
                } else {
                  onUpdateSettings((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, notificationsEnabled: false },
                  }));
                }
              }}
            />
          </label>

          <div className="chip-row">
            {[3, 7, 14].map((day) => {
              const selected = state.settings.notificationDays.includes(day);
              return (
                <button
                  key={day}
                  className={`chip ${selected ? 'chip-active' : ''}`}
                  onClick={() => {
                    onUpdateSettings((prev) => {
                      const currentlySelected = prev.settings.notificationDays.includes(day);
                      const notificationDays = currentlySelected
                        ? prev.settings.notificationDays.filter((value) => value !== day)
                        : [...prev.settings.notificationDays, day].sort((a, b) => a - b);
                      return {
                        ...prev,
                        settings: {
                          ...prev.settings,
                          notificationDays: notificationDays.length ? notificationDays : [day],
                        },
                      };
                    });
                  }}
                >
                  {day} {getDaysWord(day, lang)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-group">
          <h3>{t.appearance}</h3>
          <div className="grid-3">
            {[
              { key: 'system', label: t.system },
              { key: 'light', label: t.light },
              { key: 'dark', label: t.dark },
            ].map((mode) => (
              <button
                key={mode.key}
                className={`chip ${state.settings.appearanceMode === mode.key ? 'chip-active' : ''}`}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      appearanceMode: mode.key as AppState['settings']['appearanceMode'],
                    },
                  }))
                }
              >
                {mode.label}
              </button>
            ))}
          </div>

          <h3>{t.language}</h3>
          <div className="grid-2">
            <button
              className={`chip ${lang === 'ru' ? 'chip-active' : ''}`}
              onClick={() =>
                onUpdateSettings((prev) => ({ ...prev, settings: { ...prev.settings, appLanguage: 'ru' } }))
              }
            >
              Русский
            </button>
            <button
              className={`chip ${lang === 'en' ? 'chip-active' : ''}`}
              onClick={() =>
                onUpdateSettings((prev) => ({ ...prev, settings: { ...prev.settings, appLanguage: 'en' } }))
              }
            >
              English
            </button>
          </div>
        </section>

        <section className="settings-group">
          <h3>{lang === 'ru' ? 'Резервные копии' : 'Backups'}</h3>
          <button className="settings-button" onClick={onExport}>
            <Download size={16} />
            {t.exportData}
          </button>
          <button className="settings-button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            {t.importData}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden-input"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) {
                await onImportFile(file);
              }
              event.currentTarget.value = '';
            }}
          />
        </section>
      </div>
    </section>
  );
}
