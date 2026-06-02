// frost.tsx — Arctic Frost shared UI primitives:
// FreshBadge, Stepper, Toggle, FrostModal, DateField (frosted calendar).
import { useEffect, useState, type ReactNode } from 'react';
import type { Item } from '../domain/models';
import { freshness, fmtPickerDate, parseDateInput, formatDateInput } from './format';
import { Icon } from './icons';

export function FreshBadge({ item, lang, bare = false }: { item: Item; lang: 'ru' | 'en'; bare?: boolean }) {
  const f = freshness(item, lang);
  return (
    <span className={`w-fresh ${f.type}${bare ? ' bare' : ''}`}>
      <Icon name={f.icon} size={14} />
      {f.label}
    </span>
  );
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (next: number) => void; min?: number }) {
  return (
    <div className="w-qty">
      <button type="button" className="w-step" onClick={() => onChange(Math.max(min, value - 1))} aria-label="−">
        <Icon name="minus" size={14} />
      </button>
      <span className="w-num">{value}</span>
      <button type="button" className="w-step" onClick={() => onChange(value + 1)} aria-label="+">
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`w-toggle ${on ? 'on' : ''}`} onClick={onClick} role="switch" aria-checked={on}>
      <i />
    </button>
  );
}

export function FrostModal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="w-scrim" onClick={onClose}>
      <div className={`w-modal ${wide ? 'wide' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="w-modal-head">
          <div>
            <div className="t">{title}</div>
            {subtitle ? <div className="sub">{subtitle}</div> : null}
          </div>
          <button type="button" className="w-ib sm" onClick={onClose} aria-label="Закрыть">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const MONTHS: Record<'ru' | 'en', string[]> = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const DOW: Record<'ru' | 'en', string[]> = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Calendar({ value, lang, onPick }: { value: Date | null; lang: 'ru' | 'en'; onPick: (date: Date) => void }) {
  const today = new Date();
  const base = value || today;
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div className="w-cal" onClick={(event) => event.stopPropagation()}>
      <div className="w-cal-head">
        <button type="button" className="w-cal-nav" onClick={() => setView(new Date(y, m - 1, 1))} aria-label="←">
          <Icon name="chevLeft" size={15} />
        </button>
        <span className="mo">{MONTHS[lang][m]} {y}</span>
        <button type="button" className="w-cal-nav" onClick={() => setView(new Date(y, m + 1, 1))} aria-label="→">
          <Icon name="chevRight" size={15} />
        </button>
      </div>
      <div className="w-cal-grid">
        {DOW[lang].map((d) => (
          <div key={d} className="w-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              className={`w-cal-day ${sameDay(new Date(y, m, d), value) ? 'on' : ''} ${sameDay(new Date(y, m, d), today) ? 'today' : ''}`}
              onClick={() => onPick(new Date(y, m, d))}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function DateField({
  value,
  onChange,
  lang,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  lang: 'ru' | 'en';
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const date = parseDateInput(value);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="w-input"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: date ? 'var(--fg1)' : 'var(--fg3)' }}>
          <Icon name="calendar" size={18} style={{ color: 'var(--frost-ice)' }} />
          {date ? fmtPickerDate(date, lang) : placeholder}
        </span>
        <Icon name="chevDown" size={16} style={{ color: 'var(--fg3)' }} />
      </button>
      {open && (
        <div
          style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 5 }}
          onMouseLeave={() => setOpen(false)}
        >
          <Calendar
            value={date}
            lang={lang}
            onPick={(picked) => {
              onChange(formatDateInput(picked));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
