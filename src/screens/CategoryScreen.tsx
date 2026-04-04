import { ArrowLeft, Edit2, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { getDaysWord, getExpirationState, getItemsWord } from '../lib/helpers';
import type { CategoryScreenProps } from '../lib/types';

export function CategoryScreen({
  t,
  lang,
  category,
  items,
  allShelves,
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
  return (
    <section className="screen">
      <header className="screen-header compact">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} />
          {t.categories}
        </button>
        <div>
          <h2>{category.name}</h2>
          <p>
            {items.length} {getItemsWord(items.length, lang)}
          </p>
        </div>
      </header>

      <div className="search-row">
        <div className="search-control">
          <Search size={16} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t.search}
          />
        </div>
        <button className="fab-sm" onClick={onAddItem}>
          <Plus size={18} />
        </button>
      </div>

      {allShelves.length > 1 && (
        <div className="chip-row">
          <button
            className={`chip ${shelfFilter === null ? 'chip-active' : ''}`}
            onClick={() => onShelfFilterChange(null)}
          >
            Все полки
          </button>
          {allShelves.map((shelf) => (
            <button
              key={shelf}
              className={`chip ${shelfFilter === shelf ? 'chip-active' : ''}`}
              onClick={() => onShelfFilterChange(shelf)}
            >
              Полка {shelf}
            </button>
          ))}
        </div>
      )}

      <div className="list-stack">
        {items.map((item) => {
          const exp = getExpirationState(item);
          return (
            <article key={item.id} className="card item-row-card">
              {item.photoUrl ? <img className="item-photo" src={item.photoUrl} alt={item.name} /> : null}
              <div className="item-meta">
                <strong>{item.name}</strong>
                <span>
                  {item.packagesCount} уп. · {item.itemsCount} шт. · Полка {item.shelfNumber}
                </span>
                <small className={`status-${exp.type}`}>
                  {exp.type === 'expired'
                    ? lang === 'ru'
                      ? `Просрочено ${Math.abs(exp.daysLeft)} ${getDaysWord(exp.daysLeft, lang)} назад`
                      : `Expired ${Math.abs(exp.daysLeft)} ${getDaysWord(exp.daysLeft, lang)} ago`
                    : exp.type === 'soon'
                      ? `${exp.daysLeft} ${getDaysWord(exp.daysLeft, lang)}`
                      : lang === 'ru' ? 'Свежее' : 'Fresh'}
                </small>
                {item.notes ? <p>{item.notes}</p> : null}
              </div>

              <div className="item-actions">
                <button className="icon-button tiny" onClick={() => onUpdateCount(item.id, 'packagesCount', -1)}>
                  <Minus size={14} />
                </button>
                <span>{item.packagesCount}</span>
                <button className="icon-button tiny" onClick={() => onUpdateCount(item.id, 'packagesCount', 1)}>
                  <Plus size={14} />
                </button>
                <button className="icon-button tiny" onClick={() => onEditItem(item)}>
                  <Edit2 size={14} />
                </button>
                <button className="icon-button tiny danger" onClick={() => onDeleteItem(item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          );
        })}

        {items.length === 0 && <p className="empty-state">{t.noItems}</p>}
      </div>
    </section>
  );
}
