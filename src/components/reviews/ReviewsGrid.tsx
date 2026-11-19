import React, { useState } from 'react';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import { ClientReview } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface ReviewsGridProps {
  reviews: ClientReview[];
  searchQuery: string;
  ratingFilter: number | 'all';
  onDeleteReview: (id: string) => void;
}

/**
 * ReviewsGrid Component
 * Renders the list of client feedback cards or an empty state, with delete confirmation.
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
              className="p-5 flex flex-col justify-between bg-surface-700 border-surface-400 relative group transition-colors hover:border-surface-300"
            >
              {/* Quiet Delete button: hidden/subtle until hovered */}
              <button
                onClick={() => setReviewToDelete(review.id)}
                className="absolute right-3.5 top-3.5 text-text-muted hover:text-accent p-1.5 rounded-md transition-colors opacity-80 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Delete testimonial"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="space-y-3">
                {/* Stars and Submission Date */}
                <div className="flex items-start justify-between pr-8">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'text-amber-400 fill-amber-400'
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

                {/* Review Feedback Text */}
                <div className="space-y-1.5">
                  <p className="text-text-primary text-sm leading-relaxed italic font-normal">
                    "{review.feedbackText}"
                  </p>
                  {review.projectName && (
                    <p className="text-xs text-text-secondary font-medium">
                      Project: <span className="text-text-primary">{review.projectName}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Client Info Footer */}
              <div className="pt-3.5 border-t border-surface-400 mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary leading-tight">
                    {review.clientName}
                  </span>
                  <span className="text-[11px] text-text-muted">Verified Testimonial</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-surface-600 flex items-center justify-center text-xs font-bold text-text-primary border border-surface-400">
                  {review.clientName.charAt(0).toUpperCase()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="No Testimonials Found"
          description={
            searchQuery || ratingFilter !== 'all'
              ? 'Try adjusting your search queries or rating filters.'
              : "You haven't received any client feedback yet. Use the share button above to request reviews from active clients!"
          }
        />
      )}

      {/* Delete Confirmation Dialog with dark background & backdrop blur (No White Background) */}
      {reviewToDelete && (
        <div
          onClick={() => setReviewToDelete(null)}
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-700 border border-surface-400 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="space-y-2">
              <h3 className="text-base font-bold text-text-primary">Delete Review?</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Are you sure you want to delete this testimonial? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReviewToDelete(null)}
                className="text-xs"
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
                className="text-xs"
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
