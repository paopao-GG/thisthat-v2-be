import React, { createContext, useContext, useState } from 'react';

interface CategoryFilterContextType {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const CategoryFilterContext = createContext<CategoryFilterContextType | null>(null);

export const useCategoryFilter = () => {
  const context = useContext(CategoryFilterContext);
  if (!context) {
    throw new Error('useCategoryFilter must be used within CategoryFilterProvider');
  }
  return context;
};

export const CategoryFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'Crypto', 'Politics', 'Sports', 'Entertainment', 'Technology', 'Finance', 'Esports', 'Other'];

  return (
    <CategoryFilterContext.Provider value={{ categories, selectedCategory, setSelectedCategory }}>
      {children}
    </CategoryFilterContext.Provider>
  );
};

