import { useState, useEffect } from 'react';
import { CategoryList } from './components/CategoryList';
import { ItemList } from './components/ItemList';
import { ItemForm } from './components/ItemForm';
import { CategoryModal } from './components/CategoryModal';

export interface Item {
  id: string;
  name: string;
  packages: number;
  items: number;
  shelf: number;
  freezeDate: string;
  expirationDate: string;
  notes?: string;
  photo?: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  itemCount: number;
  sortOrder?: number;
}

type Screen = 'home' | 'category' | 'item-form';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem('freezer-categories');
    const savedItems = localStorage.getItem('freezer-items');
    
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      // Initialize with sample data
      const initialCategories = [
        { id: '1', name: 'Овощи', icon: '🥬', color: '#34C759', itemCount: 0, sortOrder: 0 },
        { id: '2', name: 'Мясо', icon: '🍖', color: '#FF3B30', itemCount: 0, sortOrder: 1 },
        { id: '3', name: 'Ягоды', icon: '🫐', color: '#AF52DE', itemCount: 0, sortOrder: 2 },
      ];
      setCategories(initialCategories);
      localStorage.setItem('freezer-categories', JSON.stringify(initialCategories));
    }
    
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('freezer-categories', JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('freezer-items', JSON.stringify(items));
    
    // Update item counts for categories
    const updatedCategories = categories.map(cat => ({
      ...cat,
      itemCount: items.filter(item => item.categoryId === cat.id).length
    }));
    setCategories(updatedCategories);
  }, [items]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setScreen('category');
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setScreen('item-form');
  };

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setScreen('item-form');
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleSaveItem = (item: Item) => {
    if (selectedItem) {
      // Edit existing item
      setItems(items.map(i => i.id === item.id ? item : i));
    } else {
      // Add new item
      setItems([...items, { ...item, id: Date.now().toString() }]);
    }
    setScreen('category');
    setSelectedItem(null);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newPackages = Math.max(0, item.packages + delta);
        return { ...item, packages: newPackages };
      }
      return item;
    }));
  };

  const handleAddCategory = (name: string, icon: string, color: string) => {
    if (editingCategory) {
      // Edit existing category
      setCategories(categories.map(cat =>
        cat.id === editingCategory.id ? { ...cat, name, icon, color } : cat
      ));
      setEditingCategory(null);
    } else {
      // Add new category
      const newCategory = {
        id: Date.now().toString(),
        name,
        icon,
        color,
        itemCount: 0,
        sortOrder: categories.length
      };
      setCategories([...categories, newCategory]);
    }
    setShowCategoryModal(false);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
    setItems(items.filter(item => item.categoryId !== categoryId));
  };

  const handleReorderCategories = (newCategories: Category[]) => {
    const categoriesWithOrder = newCategories.map((cat, index) => ({
      ...cat,
      sortOrder: index
    }));
    setCategories(categoriesWithOrder);
  };

  const handleBack = () => {
    if (screen === 'item-form') {
      setScreen('category');
    } else if (screen === 'category') {
      setScreen('home');
      setSelectedCategory(null);
    }
  };

  const categoryItems = selectedCategory 
    ? items.filter(item => item.categoryId === selectedCategory.id)
    : [];

  return (
    <div className="min-h-screen bg-[#F2F7FA]">
      {/* iOS Status Bar */}
      <div className="h-11 bg-[#F2F7FA]" />
      
      {/* Content */}
      <div className="max-w-md mx-auto min-h-screen bg-[#F2F7FA]">
        {screen === 'home' && (
          <CategoryList
            categories={categories}
            onCategorySelect={handleCategorySelect}
            onAddCategory={() => {
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onReorderCategories={handleReorderCategories}
          />
        )}
        
        {screen === 'category' && selectedCategory && (
          <ItemList
            category={selectedCategory}
            items={categoryItems}
            onBack={handleBack}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}
        
        {screen === 'item-form' && selectedCategory && (
          <ItemForm
            item={selectedItem}
            categoryId={selectedCategory.id}
            onBack={handleBack}
            onSave={handleSaveItem}
          />
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={handleAddCategory}
        />
      )}
    </div>
  );
}
