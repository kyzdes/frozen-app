// Chrome.tsx — Arctic Frost app shell: aurora field, desktop sidebar,
// mobile top bar and bottom nav.
import { Icon, type IconName } from '../lib/icons';

export type NavId = 'home' | 'history' | 'settings';

const NAV: { id: NavId; icon: IconName; ru: string; en: string }[] = [
  { id: 'home', icon: 'home', ru: 'Главная', en: 'Home' },
  { id: 'history', icon: 'history', ru: 'История', en: 'History' },
  { id: 'settings', icon: 'settings', ru: 'Настройки', en: 'Settings' },
];

export function Aurora() {
  return (
    <div className="w-aurora">
      <i className="b1" />
      <i className="b2" />
      <i className="b3" />
    </div>
  );
}

type ChromeProps = {
  lang: 'ru' | 'en';
  active: NavId;
  expiringCount: number;
  onNavigate: (id: NavId) => void;
};

export function Sidebar({
  lang,
  active,
  expiringCount,
  onNavigate,
  onLogout,
  pairTitle,
  pairSubtitle,
  pairSynced,
  avatar,
}: ChromeProps & {
  onLogout: () => void;
  pairTitle: string;
  pairSubtitle: string;
  pairSynced: boolean;
  avatar: string;
}) {
  return (
    <aside className="w-side">
      <div className="w-brand">
        <span className="flake">❄️</span>
        <span className="wm">Морозилка</span>
      </div>
      <nav className="w-nav">
        {NAV.map((n) => (
          <button key={n.id} type="button" className={`w-navitem ${active === n.id ? 'on' : ''}`} onClick={() => onNavigate(n.id)}>
            <Icon name={n.icon} size={19} />
            {lang === 'ru' ? n.ru : n.en}
            {n.id === 'home' && expiringCount > 0 && <span className="badge">{expiringCount}</span>}
          </button>
        ))}
      </nav>
      <div className="w-side-foot">
        <div className="w-pair">
          <span className="av">{avatar}</span>
          <div style={{ minWidth: 0 }}>
            <div className="nm">{pairTitle}</div>
            <div className={`st ${pairSynced ? '' : 'idle'}`}>
              <span className="dot" />
              {pairSubtitle}
            </div>
          </div>
        </div>
        <button className="w-btn glass full" onClick={onLogout} style={{ fontSize: 14, padding: '10px 16px' }}>
          <Icon name="logout" size={16} />
          {lang === 'ru' ? 'Выйти' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}

export function MobileBar({ statusLabel, synced }: { statusLabel: string; synced: boolean }) {
  return (
    <div className="w-mobilebar">
      <div className="mb-brand">
        <span className="flake">❄️</span>
        <span className="wm">Морозилка</span>
      </div>
      <div className="w-pair" style={{ padding: '6px 10px', gap: 8 }}>
        <div className={`st ${synced ? '' : 'idle'}`} style={{ fontSize: 11 }}>
          <span className="dot" />
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

export function BottomNav({ lang, active, expiringCount, onNavigate }: ChromeProps) {
  return (
    <nav className="w-bottomnav">
      {NAV.map((n) => (
        <button key={n.id} type="button" className={active === n.id ? 'on' : ''} onClick={() => onNavigate(n.id)}>
          {n.id === 'home' && expiringCount > 0 && <span className="nbadge">{expiringCount}</span>}
          <Icon name={n.icon} size={21} />
          {lang === 'ru' ? n.ru : n.en}
        </button>
      ))}
    </nav>
  );
}
