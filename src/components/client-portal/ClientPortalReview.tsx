/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, CheckCircle2, Send } from 'lucide-react';

interface ExistingReview {
  rating: number;
  feedbackText: string;
  createdAt: number;
}

interface ClientPortalReviewProps {
  freelancerName: string;
  checkingReview: boolean;
  existingReview: ExistingReview | null;
  reviewSuccess: boolean;
  reviewRating: number;
  onRatingChange: (rating: number) => void;
  reviewText: string;
  onReviewTextChange: (text: string) => void;
  isSubmittingReview: boolean;
  onSubmitReview: (e: React.FormEvent) => void;
}

/**
 * Rate & Review tab for Client Portal.
 * Features 44x44px touch targets for star ratings and accessible mobile-friendly feedback submission.
 */
export const ClientPortalReview: React.FC<ClientPortalReviewProps> = ({
  freelancerName,
  checkingReview,
  existingReview,
  reviewSuccess,
  reviewRating,
  onRatingChange,
  reviewText,
  onReviewTextChange,
  isSubmittingReview,
  onSubmitReview,
}) => {
  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center justify-center mx-auto">
          <Star size={22} className="text-amber-500 fill-amber-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          Rate & Review Your Experience
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Your feedback helps {freelancerName || 'your freelancer'} improve their editing services and workflow.
        </p>
      </div>

      {checkingReview ? (
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
          Checking review status...
        </div>
      ) : existingReview || reviewSuccess ? (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-6 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Review Submitted
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Thank you! Only one review per client account is allowed.
          </p>

          {/* Submitted Star Rating */}
          <div className="flex items-center justify-center gap-1 pt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={20}
                className={
                  s <= (existingReview?.rating ?? reviewRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-200 dark:text-slate-700'
                }
              />
            ))}
          </div>

          {existingReview?.feedbackText && (
            <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-left leading-relaxed">
              "{existingReview.feedbackText}"
            </p>
          )}

          {existingReview?.createdAt && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Submitted on{' '}
              {new Date(existingReview.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmitReview} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
              Your Rating
            </label>
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onRatingChange(star)}
                  aria-label={`Rate ${star} out of 5 stars`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-amber-400 transition-colors cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Star
                    size={28}
                    className={
                      star <= reviewRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200 dark:text-slate-700'
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="review-feedback"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
            >
              Feedback / Testimonial *
            </label>
            <textarea
              id="review-feedback"
              required
              rows={4}
              placeholder="Share your thoughts on turnaround time, video quality, and communication..."
              value={reviewText}
              onChange={(e) => onReviewTextChange(e.target.value)}
              className="w-full p-3.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingReview || !reviewText.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSubmittingReview ? (
              <span>Submitting Review...</span>
            ) : (
              <>
                <Send size={14} />
                <span>Submit Review</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
