import React, { useState } from 'react';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import { ClientReview } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/EmptyState';

interface ReviewsGridProps {
  reviews: ClientReview[];
  searchQuery: string;
  ratingFilter: number | 'all';
  onDeleteReview: (id: string) => void;
}

/**
 * ReviewsGrid Component
 * Renders client review cards or empty state, with delete confirmation.
 */
export const ReviewsGrid: React.FC<ReviewsGridProps> = ({
  reviews,
  searchQuery,
  ratingFilter,
  onDeleteReview,
}) => {
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  return (
    <>
      {reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="p-5 flex flex-col justify-between bg-surface-700 border-0 shadow-none relative group"
            >
              <button
                type="button"
                onClick={() => setReviewToDelete(review.id)}
                className="absolute right-3.5 top-3.5 text-text-muted hover:text-accent p-1.5 rounded-md transition-colors opacity-80 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer border-0 bg-transparent"
                title="Delete review"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="space-y-3">
                <div className="flex items-start justify-between pr-8">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'text-[#FFB020] fill-amber-400'
                            : 'text-surface-400 fill-none'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-text-muted font-mono tabular-nums">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-text-primary text-sm leading-relaxed">
                    &ldquo;{review.feedbackText}&rdquo;
                  </p>
                  {review.projectName && (
                    <p className="text-xs text-text-muted">
                      {review.projectName}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3.5 border-t border-surface-500/60 mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">
                  {review.clientName}
                </span>
                <div className="w-7 h-7 rounded-full bg-surface-600 flex items-center justify-center text-xs font-bold text-text-primary border-0">
                  {review.clientName.charAt(0).toUpperCase()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="No reviews"
          description={
            searchQuery || ratingFilter !== 'all'
              ? 'Try another search or filter.'
              : 'Client reviews will appear here.'
          }
        />
      )}

      {reviewToDelete && (
        <div
          onClick={() => setReviewToDelete(null)}
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-700 border-0 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-text-primary">Delete review?</h3>
              <p className="text-xs text-text-secondary">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReviewToDelete(null)}
                className="text-xs border-0"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (reviewToDelete) {
                    onDeleteReview(reviewToDelete);
                    setReviewToDelete(null);
                  }
                }}
                className="text-xs border-0"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
