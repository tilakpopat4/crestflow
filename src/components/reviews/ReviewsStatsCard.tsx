import React from 'react';
import { Star } from 'lucide-react';
import { Card } from '../ui/Card';

interface ReviewsStatsCardProps {
  averageRating: number;
  totalReviews: number;
  ratingCounts: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

/**
 * ReviewsStatsCard Component
 * Displays the overall client rating score, star representation, and rating distribution bars.
 */
export const ReviewsStatsCard: React.FC<ReviewsStatsCardProps> = ({
  averageRating,
  totalReviews,
  ratingCounts,
}) => {
  return (
    <Card className="p-6 flex flex-col md:flex-row lg:col-span-2 items-stretch gap-6 md:gap-8 bg-surface-700 border-surface-400">
      {/* Average Rating Hero */}
      <div className="flex flex-col items-center justify-center text-center p-4 md:border-r border-surface-400 md:pr-8 min-w-[150px]">
        <span className="text-5xl sm:text-6xl font-extrabold text-text-primary leading-none font-mono tabular-nums">
          {averageRating ? averageRating.toFixed(1) : '0.0'}
        </span>

        {/* Stars Display */}
        <div className="flex gap-0.5 mt-3 mb-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= Math.round(averageRating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-surface-400 fill-none'
              }`}
            />
          ))}
        </div>

        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-1 font-mono tabular-nums">
          {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
        </span>
      </div>

      {/* Rating Breakdown Progress Bars */}
      <div className="flex-1 flex flex-col justify-center space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingCounts[rating as 5 | 4 | 3 | 2 | 1] || 0;
          const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <div key={rating} className="flex items-center text-xs gap-3">
              <span className="w-3 font-semibold text-text-secondary font-mono tabular-nums">{rating}</span>
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <div className="flex-1 bg-surface-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="w-8 text-right text-text-muted font-medium font-mono tabular-nums">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
