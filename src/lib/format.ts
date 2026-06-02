// format.ts — Arctic Frost UI formatting helpers (tints, dates, freshness).
import type { Item } from '../domain/models';
import { getDaysWord, getExpirationState } from './helpers';
import type { IconName } from './icons';

/** Convert a #RRGGBB hex into an rgba() string at the given alpha. */
export function tint(hex: string | undefined, alpha: number): string {
  const fallback = '#5B9FD3';
  const h = (hex || fallback).replace('#', '');
  const safe = h.length === 6 ? h : fallback.replace('#', '');
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const MONTHS_SHORT: Record<'ru' | 'en', string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Short, list-friendly date from a stored ISO string: "14 фев" / "14 Feb". */
export function fmtShortDate(iso: string, lang: 'ru' | 'en'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS_SHORT[lang][d.getUTCMonth()]}`;
}

/** Longer date for the picker field: "14 фев 2026" / "14 Feb 2026". */
export function fmtPickerDate(date: Date | null, lang: 'ru' | 'en'): string {
  if (!date) return '';
  return `${date.getDate()} ${MONTHS_SHORT[lang][date.getMonth()]} ${date.getFullYear()}`;
}

/** Parse a date-input string ("YYYY-MM-DD") into a local Date, or null. */
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Format a local Date back into a date-input string ("YYYY-MM-DD"). */
export function formatDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type FreshnessInfo = {
  type: 'fresh' | 'soon' | 'expired';
  label: string;
  icon: IconName;
};

/** Freshness badge content derived from an item's expiration date. */
export function freshness(item: Item, lang: 'ru' | 'en'): FreshnessInfo {
  const { type, daysLeft } = getExpirationState(item);
  if (type === 'expired') {
    return { type, label: lang === 'ru' ? 'Просрочено' : 'Expired', icon: 'alert' };
  }
  if (type === 'soon') {
    return {
      type,
      label: lang === 'ru' ? `${daysLeft} ${getDaysWord(daysLeft, lang)}` : `${daysLeft} ${getDaysWord(daysLeft, lang)}`,
      icon: 'alert',
    };
  }
  return { type, label: lang === 'ru' ? 'Свежее' : 'Fresh', icon: 'checkCircle' };
}
