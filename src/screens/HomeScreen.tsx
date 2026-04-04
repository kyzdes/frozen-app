import { Clock3, Edit2, Filter, Plus, Search, Settings, Trash2 } from 'lucide-react';
import { getDaysWord, getExpirationState, getItemsWord } from '../lib/helpers';
import type { HomeScreenProps } from '../lib/types';

export function HomeScreen({
  state,
  t,
  lang,
  categories,
  filteredCategories,
  filteredItems,
  allShelves,
  totalItems,
  expandedCategories,
  searchQuery,
  shelfFilter,
  onSearchChange,
  onShelfFilterChange,
  onToggleExpand,
  onToggleExpandAll,
  onOpenCategory,
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
  onDragStart,
  onDrop,
  onNavigate,
}: HomeScreenProps) {
  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <h1>{t.appName}</h1>
          <p>
            {totalItems} {getItemsWord(totalItems, lang)} · {categories.length}
          </p>
        </div>
        <button
          className="pill"
          onClick={onToggleExpandAll}
        >
          {expandedCategories.size === categories.length ? 'Свернуть' : 'Развернуть'}
        </button>
      </header>

      <div className="toolbar-row">
        <button className="icon-button" onClick={() => onNavigate('history')}>
          <Clock3 size={18} />
        </button>
        <button className="icon-button" onClick={() => onNavigate('settings')}>
          <Settings size={18} />
        </button>
        <div className="search-control">
          <Search size={16} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t.search}
          />
        </div>
        <button className="fab-sm" onClick={onAddCategory}>
          <Plus size={18} />
        </button>
      </div>

      {allShelves.length > 0 && (
        <div className="chip-row">
          <button
            className={`chip ${shelfFilter === null ? 'chip-active' : ''}`}
            onClick={() => onShelfFilterChange(null)}
          >
            <Filter size={14} />
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
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const previewItems = filteredItems.filter((item) => item.categoryId === category.id).slice(0, 4);

          return (
            <article
              key={category.id}
              className="card"
              draggable
              onDragStart={() => onDragStart(category.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(category.id)}
            >
              <div className="category-row" onClick={() => onOpenCategory(category.id)}>
                <div className="category-badge" style={{ backgroundColor: category.color || '#5B9FD3' }}>
                  {category.icon || '📦'}
                </div>

                <div className="category-meta">
                  <strong>{category.name}</strong>
                  <span>
                    {category.itemCount} {getItemsWord(category.itemCount, lang)}
                  </span>
                </div>

                <div className="category-actions">
                  <button
                    className="icon-button tiny"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditCategory(category);
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="icon-button tiny danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteCategory(category.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    className="icon-button tiny"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleExpand(category.id);
                    }}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="embedded-items">
                  {previewItems.length === 0 && <p className="muted">{t.noItems}</p>}
                  {previewItems.map((item) => {
                    const exp = getExpirationState(item);
                    return (
                      <div key={item.id} className="embedded-item" onClick={() => onOpenCategory(category.id)}>
                        <span>{item.name}</span>
                        <small className={`status-${exp.type}`}>
                          {exp.type === 'expired'
                            ? lang === 'ru' ? 'Просрочено' : 'Expired'
                            : exp.type === 'soon'
                              ? `${exp.daysLeft} ${getDaysWord(exp.daysLeft, lang)}`
                              : lang === 'ru' ? 'Свежее' : 'Fresh'}
                        </small>
                      </div>
                    );
                  })}

                  <button className="ghost-button" onClick={() => onOpenCategory(category.id)}>
                    {previewItems.length ? 'Открыть полный список' : 'Добавить +'}
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {filteredCategories.length === 0 && <p className="empty-state">{t.noCategories}</p>}
      </div>
    </section>
  );
}
