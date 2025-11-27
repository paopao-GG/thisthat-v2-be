import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCategories } from '../services/marketService';

interface CategoryFilterContextType {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  loading: boolean;
}

const CategoryFilterContext = createContext<CategoryFilterContextType | null>(null);

export const useCategoryFilter = () => {
  const context = useContext(CategoryFilterContext);
  if (!context) {
    throw new Error('useCategoryFilter must be used within CategoryFilterProvider');
  }
  return context;
};

/**
 * Capitalize first letter of a string for display
 * Also handles the reverse: convert display name back to lowercase for API calls
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert display category name back to lowercase for API/filtering
 */
export function normalizeCategoryForFilter(displayCategory: string): string {
  if (displayCategory === 'All') return 'All';
  return displayCategory.toLowerCase();
}

export const CategoryFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']); // Start with 'All' as default
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const apiCategories = await getCategories();
        
        if (apiCategories.length === 0) {
          // Fallback to default categories if API returns empty
          setCategories(['All', 'Crypto', 'Politics', 'Sports', 'Entertainment', 'Technology', 'Finance', 'Esports', 'Other']);
          return;
        }
        
        // Capitalize category names for display (backend returns lowercase)
        const capitalizedCategories = apiCategories.map(cat => capitalize(cat));
        
        // Sort categories alphabetically (excluding 'All' which stays first)
        const sortedCategories = ['All', ...capitalizedCategories.sort()];
        
        setCategories(sortedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Fallback to default categories if API fails
        setCategories(['All', 'Crypto', 'Politics', 'Sports', 'Entertainment', 'Technology', 'Finance', 'Esports', 'Other']);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return (
    <CategoryFilterContext.Provider value={{ categories, selectedCategory, setSelectedCategory, loading }}>
      {children}
    </CategoryFilterContext.Provider>
  );
};

