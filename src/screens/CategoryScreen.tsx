import { useMemo, useState } from 'react';
import { getExpirationState, getItemsWord } from '../lib/helpers';
import { fmtShortDate } from '../lib/format';
import { FreshBadge, Stepper } from '../lib/frost';
import { Icon } from '../lib/icons';
import type { CategoryScreenProps } from '../lib/types';

type SortKey = 'expiry' | 'name' | 'shelf';

export function CategoryScreen({
  lang,
  category,
  items,
  searchQuery,
  shelfFilter,
  onSearchChange,
  onShelfFilterChange,
  onBack,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUpdateCount,
}: CategoryScreenProps) {
  const [sort, setSort] = useState<SortKey>('expiry');
  const filtering = Boolean(searchQuery) || shelfFilter !== null;

  const shelves = useMemo(
    () => Array.from(new Set(items.map((i) => i.shelfNumber))).sort((a, b) => a - b),
    [items]
  );

  const sorted = useMemo(() => {
    const list = [...items];
    if (sort === 'expiry') list.sort((a, b) => getExpirationState(a).daysLeft - getExpirationState(b).daysLeft);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, lang === 'ru' ? 'ru' : 'en'));
    else list.sort((a, b) => a.shelfNumber - b.shelfNumber);
    return list;
  }, [items, sort, lang]);

  const sorts: { key: SortKey; ru: string; en: string }[] = [
    { key: 'expiry', ru: 'По сроку', en: 'By date' },
    { key: 'name', ru: 'По названию', en: 'By name' },
    { key: 'shelf', ru: 'По полке', en: 'By shelf' },
  ];

  return (
    <div className="w-wrap">
      <button className="w-back" onClick={onBack}>
        <Icon name="arrowL" size={16} />
        {lang === 'ru' ? 'Все группы' : 'All groups'}
      </button>

      <div className="w-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="w-cap">{category.icon || '📦'}</div>
          <div>
            <h1 className="w-h1 sm">{category.name}</h1>
            <p className="w-h-sub">{items.length} {getItemsWord(items.length, lang)}</p>
          </div>
        </div>
        <button className="w-btn primary" onClick={onAddItem}>
          <Icon name="plus" size={17} />
          {lang === 'ru' ? 'Заготовка' : 'Item'}
        </button>
      </div>

      <div className="w-toolbar">
        <div className="w-search">
          <Icon name="search" size={18} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={lang === 'ru' ? 'Поиск в группе' : 'Search in group'}
          />
        </div>
      </div>

      <div className="w-toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="w-chiprow">
          <button className={`w-chip ${shelfFilter === null ? 'on' : ''}`} onClick={() => onShelfFilterChange(null)}>
            <Icon name="filter" size={14} />
            {lang === 'ru' ? 'Все полки' : 'All'}
          </button>
          {shelves.map((shelf) => (
            <button
              key={shelf}
              className={`w-chip ${shelfFilter === shelf ? 'on' : ''}`}
              onClick={() => onShelfFilterChange(shelf)}
            >
              {lang === 'ru' ? 'Полка' : 'Shelf'} {shelf}
            </button>
          ))}
        </div>
        <div className="w-chiprow">
          {sorts.map((s) => (
            <button key={s.key} className={`w-chip ${sort === s.key ? 'on' : ''}`} onClick={() => setSort(s.key)}>
              {s.key === 'expiry' && <Icon name="sort" size={14} />}
              {lang === 'ru' ? s.ru : s.en}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        {sorted.map((item) => (
          <div key={item.id} className="w-item">
            <div className="lead">
              {item.photoUrl ? <img src={item.photoUrl} alt={item.name} /> : category.icon || '📦'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="row">
                <h3>{item.name}</h3>
                <FreshBadge item={item} lang={lang} />
              </div>
              <div className="meta">
                <span>{item.packagesCount} {lang === 'ru' ? 'уп.' : 'pk'} · {item.itemsCount} {lang === 'ru' ? 'шт.' : 'pcs'}</span>
                <span>{lang === 'ru' ? 'Полка' : 'Shelf'} {item.shelfNumber}</span>
                <span>{lang === 'ru' ? 'Заморожен' : 'Frozen'} {fmtShortDate(item.freezeDate, lang)}</span>
              </div>
              {item.notes ? <div className="notes">{item.notes}</div> : null}
            </div>
            <div className="w-item-right">
              <div className="w-item-tools">
                <button className="w-ib sm" onClick={() => onEditItem(item)} aria-label={lang === 'ru' ? 'Изменить' : 'Edit'}>
                  <Icon name="edit" size={15} />
                </button>
                <button className="w-ib sm danger" onClick={() => onDeleteItem(item.id)} aria-label={lang === 'ru' ? 'Удалить' : 'Delete'}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
              <Stepper
                value={item.packagesCount}
                onChange={(next) => onUpdateCount(item.id, 'packagesCount', next - item.packagesCount)}
              />
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="w-empty">
            <div className="ico">{category.icon || '🧊'}</div>
            <h3>{filtering ? (lang === 'ru' ? 'Ничего не найдено' : 'Nothing found') : lang === 'ru' ? 'Группа пуста' : 'Empty group'}</h3>
            <p>{filtering ? (lang === 'ru' ? 'Измените поиск или фильтр' : 'Adjust search or filter') : lang === 'ru' ? 'Добавьте первую заготовку' : 'Add your first item'}</p>
          </div>
        )}
      </div>

      <button className="w-fab" onClick={onAddItem} aria-label={lang === 'ru' ? 'Добавить' : 'Add'}>
        <Icon name="plus" size={26} />
      </button>
    </div>
  );
}
