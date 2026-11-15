import React from 'react';
import { Star } from 'lucide-react';

interface FeedbackRatingSelectorProps {
  rating: number;
  hoveredRating: number;
  onRatingChange: (val: number) => void;
  onHoverChange: (val: number) => void;
}

export const FeedbackRatingSelector: React.FC<FeedbackRatingSelectorProps> = ({
  rating,
  hoveredRating,
  onRatingChange,
  onHoverChange,
}) => {
  const getLabel = () => {
    switch (rating) {
      case 5:
        return 'Exceptional Work! (5/5)';
      case 4:
        return 'Great Service (4/5)';
      case 3:
        return 'Average Service (3/5)';
      case 2:
        return 'Needs Improvement (2/5)';
      case 1:
        return 'Poor Experience (1/5)';
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl p-5 text-center space-y-3">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Rate Your Experience *
      </label>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isLit = star <= (hoveredRating || rating);
          return (
            <button
              type="button"
              key={star}
              onClick={() => onRatingChange(star)}
              onMouseEnter={() => onHoverChange(star)}
              onMouseLeave={() => onHoverChange(0)}
              className="p-1 transition-colors cursor-pointer outline-none border-0 bg-transparent"
              title={`Rate ${star} Stars`}
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  isLit
                    ? 'text-amber-500 fill-amber-400'
                    : 'text-slate-300 dark:text-slate-600 fill-none hover:text-amber-400'
                }`}
              />
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">
          {getLabel()}
        </span>
      )}
    </div>
  );
};

export default FeedbackRatingSelector;
