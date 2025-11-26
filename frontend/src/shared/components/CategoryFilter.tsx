import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <select
        id="category-select"
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="w-full py-3 px-3 sm:px-4 pr-10 rounded-md text-xs sm:text-sm font-medium cursor-pointer transition-all focus:outline-none appearance-none"
        style={{
          background: 'rgba(26, 26, 26, 0.6)',
          border: '1px solid rgba(245, 245, 245, 0.08)',
          color: '#f5f5f5'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.08)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.08)';
        }}
      >
        {categories.map((category) => (
          <option key={category} value={category} style={{ background: '#0a0a0a', color: '#f5f5f5' }}>
            {category === 'All' ? 'All Categories' : category}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#f5f5f5]/60 pointer-events-none" size={20} />
    </div>
  );
};

export default CategoryFilter;

