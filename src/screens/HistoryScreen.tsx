import { Icon, type IconName } from '../lib/icons';
import type { HistoryEvent } from '../domain/models';
import type { HistoryScreenProps } from '../lib/types';

const EVENT_CONFIG: Record<
  HistoryEvent['type'],
  { icon: IconName; color: string; ru: string; en: string }
> = {
  item_added: { icon: 'plus', color: '#34C759', ru: 'Добавлено', en: 'Added' },
  item_updated: { icon: 'edit', color: '#2BA4DA', ru: 'Изменено', en: 'Edited' },
  item_deleted: { icon: 'trash', color: '#8AA4B2', ru: 'Удалено', en: 'Removed' },
  packages_changed: { icon: 'refresh', color: '#FF9500', ru: 'Упаковки', en: 'Packages' },
  items_changed: { icon: 'refresh', color: '#FF9500', ru: 'Штуки', en: 'Pieces' },
};

function dayLabel(date: Date, lang: 'ru' | 'en'): string {
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / 86400000);
  if (diffDays === 0) return lang === 'ru' ? 'Сегодня' : 'Today';
  if (diffDays === 1) return lang === 'ru' ? 'Вчера' : 'Yesterday';
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
}

export function HistoryScreen({ state, lang }: HistoryScreenProps) {
  const groups: { key: string; label: string; events: HistoryEvent[] }[] = [];
  state.history.forEach((event) => {
    const date = new Date(event.timestamp);
    const valid = !Number.isNaN(date.getTime());
    const key = valid ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : event.timestamp;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: valid ? dayLabel(date, lang) : '—', events: [] };
      groups.push(group);
    }
    group.events.push(event);
  });

  const catName = (id?: string) => {
    const category = state.categories.find((c) => c.id === id);
    return category ? category.name : '';
  };

  const delta = (event: HistoryEvent): string => {
    const d = event.type === 'packages_changed' ? event.packagesDelta : event.type === 'items_changed' ? event.itemsDelta : undefined;
    if (d === undefined || d === 0) return '';
    const unit = event.type === 'packages_changed' ? (lang === 'ru' ? 'уп.' : 'pk') : lang === 'ru' ? 'шт.' : 'pcs';
    return ` · ${d > 0 ? '+' : ''}${d} ${unit}`;
  };

  return (
    <div className="w-wrap">
      <div className="w-head">
        <div>
          <h1 className="w-h1 sm">{lang === 'ru' ? 'История' : 'History'}</h1>
          <p className="w-h-sub">{lang === 'ru' ? 'Действия за последние дни' : 'Recent activity'}</p>
        </div>
      </div>

      <div className="w-feed">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="w-daygroup">{group.label}</div>
            {group.events.map((event) => {
              const config = EVENT_CONFIG[event.type];
              const time = new Date(event.timestamp);
              const timeLabel = Number.isNaN(time.getTime())
                ? ''
                : time.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={event.id} className="w-event">
                  <span className="ev-ic" style={{ background: config.color }}>
                    <Icon name={config.icon} size={17} />
                  </span>
                  <div className="ev-t">
                    <strong>{event.itemName}</strong>
                    <span>
                      {lang === 'ru' ? config.ru : config.en}
                      {catName(event.categoryId) ? ` · ${catName(event.categoryId)}` : ''}
                      {delta(event)}
                    </span>
                  </div>
                  <span className="ev-when">{timeLabel}</span>
                </div>
              );
            })}
          </div>
        ))}

        {state.history.length === 0 && (
          <div className="w-empty">
            <div className="ico">🧊</div>
            <h3>{lang === 'ru' ? 'История пуста' : 'No history yet'}</h3>
            <p>{lang === 'ru' ? 'Здесь появятся действия с заготовками' : 'Item activity will show up here'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
