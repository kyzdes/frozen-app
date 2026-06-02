import { getExpirationState, getItemsWord } from '../lib/helpers';
import { tint } from '../lib/format';
import { FreshBadge } from '../lib/frost';
import { Icon } from '../lib/icons';
import type { HomeScreenProps } from '../lib/types';

function groupsWord(count: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') return count === 1 ? 'group' : 'groups';
  if (count % 10 === 1 && count % 100 !== 11) return 'группа';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'группы';
  return 'групп';
}

function itemMeta(packages: number, pieces: number, shelf: number, lang: 'ru' | 'en'): string {
  return lang === 'ru'
    ? `${packages} уп. · ${pieces} шт. · Полка ${shelf}`
    : `${packages} pk · ${pieces} pcs · Shelf ${shelf}`;
}

export function HomeScreen({
  t,
  lang,
  categories,
  filteredCategories,
  filteredItems,
  items,
  expiringItems,
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
  onAddCategory,
  onDragStart,
  onDrop,
}: HomeScreenProps) {
  const allOpen = categories.length > 0 && expandedCategories.size === categories.length;
  const filtering = Boolean(searchQuery) || shelfFilter !== null;

  return (
    <div className="w-wrap">
      <div className="w-head">
        <div>
          <h1 className="w-h1">{lang === 'ru' ? 'Морозилка' : 'Freezer'}</h1>
          <p className="w-h-sub">
            {totalItems} {getItemsWord(totalItems, lang)} · {categories.length} {groupsWord(categories.length, lang)}
          </p>
        </div>
        <button className="w-chip" onClick={onToggleExpandAll}>
          <Icon name={allOpen ? 'chevUp' : 'chevDown'} size={14} />
          {allOpen ? t.collapse : lang === 'ru' ? 'Развернуть всё' : 'Expand all'}
        </button>
      </div>

      {expiringItems.length > 0 && (
        <div className="w-spoil">
          <span className="ic"><Icon name="alertTri" size={22} /></span>
          <div className="tx">
            <strong>
              {lang === 'ru'
                ? `${expiringItems.length} ${getItemsWord(expiringItems.length, lang)} скоро испорт${expiringItems.length === 1 ? 'ится' : 'ятся'}`
                : `${expiringItems.length} ${getItemsWord(expiringItems.length, lang)} expiring soon`}
            </strong>
            <span>
              {expiringItems.slice(0, 3).map((i) => i.name).join(' · ')}
              {expiringItems.length > 3 ? ' …' : ''}
            </span>
          </div>
          <button
            className="w-btn glass go"
            style={{ padding: '9px 16px', fontSize: 14 }}
            onClick={() => onOpenCategory(expiringItems[0].categoryId)}
          >
            {lang === 'ru' ? 'Посмотреть' : 'View'}
            <Icon name="arrowR" size={15} />
          </button>
        </div>
      )}

      <div className="w-toolbar">
        <div className="w-search">
          <Icon name="search" size={18} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={lang === 'ru' ? 'Поиск по заготовкам' : 'Search items'}
          />
        </div>
        <button className="w-ib accent" onClick={onAddCategory} aria-label={t.addCategory}>
          <Icon name="plus" size={20} />
        </button>
      </div>

      {allShelves.length > 0 && (
        <div className="w-chiprow" style={{ marginBottom: 6 }}>
          <button className={`w-chip ${shelfFilter === null ? 'on' : ''}`} onClick={() => onShelfFilterChange(null)}>
            <Icon name="filter" size={14} />
            {t.allShelves}
          </button>
          {allShelves.map((shelf) => (
            <button
              key={shelf}
              className={`w-chip ${shelfFilter === shelf ? 'on' : ''}`}
              onClick={() => onShelfFilterChange(shelf)}
            >
              {t.shelf} {shelf}
            </button>
          ))}
        </div>
      )}

      <div className="w-seclabel">{t.categories}</div>

      {filteredCategories.map((category) => {
        const isOpen = expandedCategories.has(category.id);
        const catItems = items.filter((item) => item.categoryId === category.id);
        const preview = filteredItems.filter((item) => item.categoryId === category.id);
        const expired = catItems.filter((item) => getExpirationState(item).type === 'expired').length;
        const soon = catItems.filter((item) => getExpirationState(item).type === 'soon').length;

        return (
          <article
            key={category.id}
            className="w-cat"
            style={{ background: `linear-gradient(0deg, ${tint(category.color, 0.09)}, ${tint(category.color, 0.09)}), var(--glass-fill)` }}
            draggable
            onDragStart={() => onDragStart(category.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(category.id)}
          >
            <div className="w-cat-row" onClick={() => onToggleExpand(category.id)}>
              <div className="w-cap">{category.icon || '📦'}</div>
              <div className="w-cat-meta">
                <strong>{category.name}</strong>
                <div className="sub">
                  <span>{category.itemCount} {getItemsWord(category.itemCount, lang)}</span>
                  {expired > 0 && <span className="bad">· {expired} {lang === 'ru' ? 'просроч.' : 'expired'}</span>}
                  {expired === 0 && soon > 0 && <span className="warn">· {soon} {lang === 'ru' ? 'скоро' : 'soon'}</span>}
                </div>
              </div>
              <div className="w-cat-actions">
                <button
                  className="w-ib sm"
                  onClick={(event) => { event.stopPropagation(); onEditCategory(category); }}
                  aria-label={t.editCategory}
                >
                  <Icon name="edit" size={15} />
                </button>
                <span className="w-chev" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  <Icon name="chevDown" size={18} />
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="w-embed">
                <div className="w-embed-grid">
                  {preview.length === 0 && (
                    <p className="w-h-sub" style={{ margin: '2px 4px 8px' }}>
                      {filtering ? (lang === 'ru' ? 'Ничего не найдено' : 'Nothing found') : t.noItems}
                    </p>
                  )}
                  {preview.slice(0, 4).map((item) => (
                    <div key={item.id} className="w-eitem" onClick={() => onOpenCategory(category.id)}>
                      <div>
                        <div className="nm">{item.name}</div>
                        <div className="meta">{itemMeta(item.packagesCount, item.itemsCount, item.shelfNumber, lang)}</div>
                      </div>
                      <FreshBadge item={item} lang={lang} />
                    </div>
                  ))}
                </div>
                <div className="w-embed-foot">
                  <button className="w-link" onClick={() => onOpenCategory(category.id)}>
                    {t.openFullList}
                    <Icon name="arrowR" size={15} />
                  </button>
                  <button className="w-link" style={{ color: 'var(--fg2)' }} onClick={() => onOpenCategory(category.id)}>
                    <Icon name="plus" size={15} />
                    {lang === 'ru' ? 'Добавить' : 'Add'}
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}

      {filteredCategories.length === 0 && (
        <div className="w-empty">
          <div className="ico">🧊</div>
          <h3>{filtering ? (lang === 'ru' ? 'Ничего не найдено' : 'Nothing found') : t.noCategories}</h3>
          <p>{filtering ? (lang === 'ru' ? 'Измените поиск или фильтр' : 'Adjust search or filter') : lang === 'ru' ? 'Создайте первую группу заготовок' : 'Create your first group'}</p>
        </div>
      )}

      <button className="w-fab" onClick={onAddCategory} aria-label={t.addCategory}>
        <Icon name="plus" size={26} />
      </button>
    </div>
  );
}
