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
    <div className="bg-[#131318] dark:bg-[#1B1B22] border border-[#2A2A33] dark:border-[#2A2A33]/60 rounded-xl p-5 text-center space-y-3">
      <label className="block text-xs font-bold text-[#A1A1AA] dark:text-[#A1A1AA] uppercase tracking-wider">
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
                    ? 'text-[#FFB020] fill-amber-400'
                    : 'text-[#A1A1AA] dark:text-[#A1A1AA] fill-none hover:text-[#FFB020]'
                }`}
              />
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <span className="text-xs font-semibold text-[#FF2D4A] dark:text-[#FF2D4A] block">
          {getLabel()}
        </span>
      )}
    </div>
  );
};

export default FeedbackRatingSelector;
