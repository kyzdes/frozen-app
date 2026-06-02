import { getDaysWord, syncStatusLabel } from '../lib/helpers';
import { Toggle } from '../lib/frost';
import { Icon } from '../lib/icons';
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
  onUpdateSettings,
}: SettingsScreenProps) {
  const L = (ru: string, en: string) => (lang === 'ru' ? ru : en);
  const pair = state.sync.pair;

  const setAppearance = (mode: AppState['settings']['appearanceMode']) =>
    onUpdateSettings((prev) => ({ ...prev, settings: { ...prev.settings, appearanceMode: mode } }));
  const setLanguage = (code: 'ru' | 'en') =>
    onUpdateSettings((prev) => ({ ...prev, settings: { ...prev.settings, appLanguage: code } }));

  return (
    <div className="w-wrap">
      <div className="w-head">
        <div>
          <h1 className="w-h1 sm">{t.settings}</h1>
          <p className="w-h-sub">{L('Профиль, синхронизация и данные', 'Profile, sync and data')}</p>
        </div>
      </div>

      {/* Appearance */}
      <div className="w-seclabel">{t.appearance}</div>
      <div className="w-card">
        <div className="w-srow">
          <span className="ic" style={{ background: '#34C759' }}><Icon name="globe" size={18} /></span>
          <span className="lbl">{t.language}</span>
          <div className="w-seg" style={{ flexShrink: 1, minWidth: 0, maxWidth: 160 }}>
            <button className={lang === 'ru' ? 'on' : ''} onClick={() => setLanguage('ru')}>RU</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLanguage('en')}>EN</button>
          </div>
        </div>
        <div className="w-srow">
          <span className="ic" style={{ background: '#2BA4DA' }}>
            <Icon name={state.settings.appearanceMode === 'dark' ? 'moon' : state.settings.appearanceMode === 'light' ? 'sun' : 'display'} size={18} />
          </span>
          <span className="lbl">{L('Тема', 'Theme')}</span>
          <div className="w-seg" style={{ flexShrink: 1, minWidth: 0 }}>
            <button className={state.settings.appearanceMode === 'system' ? 'on' : ''} onClick={() => setAppearance('system')}>
              <Icon name="display" size={15} />{t.system}
            </button>
            <button className={state.settings.appearanceMode === 'light' ? 'on' : ''} onClick={() => setAppearance('light')}>
              <Icon name="sun" size={15} />{t.light}
            </button>
            <button className={state.settings.appearanceMode === 'dark' ? 'on' : ''} onClick={() => setAppearance('dark')}>
              <Icon name="moon" size={15} />{t.dark}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="w-seclabel">{t.notifications}</div>
      <div className="w-card">
        <div className="w-srow">
          <span className="ic" style={{ background: '#FF9500' }}><Icon name="bell" size={18} /></span>
          <span className="lbl">
            {L('Напоминания об истечении', 'Expiry reminders')}
            <small>{L('Push, когда срок подходит к концу', 'Push when items near expiry')}</small>
          </span>
          <Toggle
            on={state.settings.notificationsEnabled}
            onClick={() => {
              if (state.settings.notificationsEnabled) {
                onUpdateSettings((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: false } }));
              } else {
                onRequestNotifications();
              }
            }}
          />
        </div>
        {state.settings.notificationsEnabled && (
          <div className="w-srow" style={{ alignItems: 'flex-start' }}>
            <span className="lbl">{L('Напомнить за', 'Remind before')}</span>
            <div className="w-chiprow" style={{ justifyContent: 'flex-end' }}>
              {[3, 7, 14].map((day) => {
                const selected = state.settings.notificationDays.includes(day);
                return (
                  <button
                    key={day}
                    className={`w-chip ${selected ? 'on' : ''}`}
                    onClick={() =>
                      onUpdateSettings((prev) => {
                        const has = prev.settings.notificationDays.includes(day);
                        const next = has
                          ? prev.settings.notificationDays.filter((d) => d !== day)
                          : [...prev.settings.notificationDays, day].sort((a, b) => a - b);
                        return { ...prev, settings: { ...prev.settings, notificationDays: next.length ? next : [day] } };
                      })
                    }
                  >
                    {day} {getDaysWord(day, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Partner sync */}
      <div className="w-seclabel">{t.syncWithPartner}</div>
      <div className="w-card">
        {pair ? (
          <>
            <div className="w-srow">
              <span className="ic" style={{ background: 'var(--frost-grad)' }}><Icon name="users" size={18} /></span>
              <span className="lbl">{L('Холодильник', 'Freezer')}</span>
              <span className="val" style={{ color: 'var(--fresh)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--fresh)' }} />
                {syncStatusLabel(state.sync.status.state, lang)}
              </span>
            </div>
            {pair.inviteCode ? (
              <div className="w-srow">
                <span className="ic" style={{ background: '#AF52DE' }}><Icon name="link" size={18} /></span>
                <span className="lbl">{t.pairCode}</span>
                <code>{pair.inviteCode}</code>
              </div>
            ) : null}
            <button className="w-srow btn" onClick={onSyncNow} disabled={syncingNow}>
              <span className="ic" style={{ background: '#5AC8FA' }}><Icon name="refresh" size={18} /></span>
              <span className="lbl">{t.manualSync}</span>
              <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
            </button>
            <button className="w-srow btn" onClick={onGenerateInvite}>
              <span className="ic" style={{ background: '#0FB5A8' }}><Icon name="link" size={18} /></span>
              <span className="lbl">{L('Получить код приглашения', 'Get invite code')}</span>
              <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
            </button>
            {pair.mode === 'shared' ? (
              <button className="w-srow danger" onClick={onLeavePair}>
                <span className="ic" style={{ background: '#FB5870' }}><Icon name="logout" size={18} /></span>
                <span className="lbl">{t.leaveShared}</span>
              </button>
            ) : (
              <>
                <button className="w-srow btn" onClick={onCreatePair}>
                  <span className="ic" style={{ background: '#34C759' }}><Icon name="plus" size={18} /></span>
                  <span className="lbl">{t.createShared}</span>
                  <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
                </button>
                <button className="w-srow btn" onClick={onJoinPair}>
                  <span className="ic" style={{ background: '#5B9FD3' }}><Icon name="link" size={18} /></span>
                  <span className="lbl">{t.joinShared}</span>
                  <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button className="w-srow btn" onClick={onCreatePair}>
              <span className="ic" style={{ background: '#34C759' }}><Icon name="plus" size={18} /></span>
              <span className="lbl">{t.createShared}</span>
              <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
            </button>
            <button className="w-srow btn" onClick={onJoinPair}>
              <span className="ic" style={{ background: '#5B9FD3' }}><Icon name="link" size={18} /></span>
              <span className="lbl">{t.joinShared}</span>
              <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
            </button>
          </>
        )}
      </div>

      {/* Backup */}
      <div className="w-seclabel">{L('Резервные копии', 'Backup')}</div>
      <div className="w-card">
        <button className="w-srow btn" onClick={onExport}>
          <span className="ic" style={{ background: '#5B9FD3' }}><Icon name="download" size={18} /></span>
          <span className="lbl">{t.exportData}<small>JSON · {L('вся морозилка', 'whole freezer')}</small></span>
          <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
        </button>
        <button className="w-srow btn" onClick={() => fileInputRef.current?.click()}>
          <span className="ic" style={{ background: '#0FB5A8' }}><Icon name="upload" size={18} /></span>
          <span className="lbl">{t.importData}</span>
          <Icon name="chevRight" size={18} style={{ color: 'var(--fg3)' }} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await onImportFile(file);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {/* Account */}
      <div className="w-seclabel">{L('Аккаунт', 'Account')}</div>
      <div className="w-card">
        <div className="w-srow">
          <span className="ic" style={{ background: '#8AA4B2' }}><Icon name="mail" size={18} /></span>
          <span className="lbl">{state.auth.userName || L('Пользователь', 'User')}<small>{state.auth.userEmail || '—'}</small></span>
        </div>
        <button className="w-srow danger" onClick={onLogout} disabled={authLoading}>
          <span className="ic" style={{ background: '#FB5870' }}><Icon name="logout" size={18} /></span>
          <span className="lbl">{L('Выйти из аккаунта', 'Sign out')}</span>
        </button>
      </div>

      <p className="w-h-sub" style={{ textAlign: 'center', marginTop: 20 }}>❄️ Морозилка</p>
    </div>
  );
}
