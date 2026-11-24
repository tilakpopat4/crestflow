import React from 'react';
import { Search, Star, X } from 'lucide-react';
import { Card } from '../ui/Card';

interface ReviewsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  ratingFilter: number | 'all';
  onRatingFilterChange: (rating: number | 'all') => void;
}

/**
 * ReviewsToolbar Component
 * Filter and search controls for client reviews.
 */
export const ReviewsToolbar: React.FC<ReviewsToolbarProps> = ({
  searchQuery,
  onSearchChange,
  ratingFilter,
  onRatingFilterChange,
}) => {
  return (
    <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-700 border-0 shadow-none">
      <div className="relative flex-1 max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search reviews..."
          className="w-full border border-surface-400 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm bg-surface-800 text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-surface-300"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 border-0 bg-transparent cursor-pointer"
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full md:w-auto shrink-0">
        <button
          type="button"
          onClick={() => onRatingFilterChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border-0 ${
            ratingFilter === 'all'
              ? 'bg-surface-500 text-text-primary'
              : 'bg-surface-800 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
          }`}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => onRatingFilterChange(r)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border-0 ${
              ratingFilter === r
                ? 'bg-surface-500 text-text-primary'
                : 'bg-surface-800 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
            }`}
          >
            <span className="font-mono tabular-nums">{r}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
          </button>
        ))}
      </div>
    </Card>
  );
};
