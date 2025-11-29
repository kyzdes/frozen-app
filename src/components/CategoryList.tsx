import { Plus, Snowflake } from 'lucide-react';
import { Category } from '../App';
import { CategoryCard } from './CategoryCard';

interface CategoryListProps {
  categories: Category[];
  onCategorySelect: (category: Category) => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export function CategoryList({ 
  categories, 
  onCategorySelect, 
  onAddCategory,
  onEditCategory,
  onDeleteCategory 
}: CategoryListProps) {
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Snowflake className="w-8 h-8 text-[#5B9FD3]" />
          <h1 className="text-[34px] tracking-tight text-[#1C1C1E]">Морозилка</h1>
        </div>
        <p className="text-[#8E8E93] text-[17px]">
          {categories.reduce((sum, cat) => sum + cat.itemCount, 0)} {getItemsWord(categories.reduce((sum, cat) => sum + cat.itemCount, 0))} в {categories.length} {getCategoriesWord(categories.length)}
        </p>
      </div>

      {/* Categories List */}
      <div className="px-4 space-y-2">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onSelect={onCategorySelect}
            onEdit={onEditCategory}
            onDelete={onDeleteCategory}
          />
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="px-4 py-16 text-center">
          <Snowflake className="w-16 h-16 text-[#C7D3DD] mx-auto mb-4" />
          <p className="text-[#8E8E93] text-[17px]">Нет категорий</p>
          <p className="text-[#C7C7CC] text-[15px] mt-1">Нажмите +, чтобы создать первую категорию</p>
        </div>
      )}

      {/* Add Category Button */}
      <button
        onClick={onAddCategory}
        className="fixed bottom-8 right-4 w-14 h-14 bg-[#5B9FD3] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function getItemsWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'заготовка';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'заготовки';
  return 'заготовок';
}

function getCategoriesWord(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'категории';
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'категориях';
  return 'категориях';
}
