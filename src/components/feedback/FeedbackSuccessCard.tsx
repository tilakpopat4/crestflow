import React from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import Logo from '../Logo';

interface FeedbackSuccessCardProps {
  freelancerName: string;
  clientName: string;
  projectName?: string;
  rating: number;
  feedbackText: string;
  isExisting?: boolean;
}

export const FeedbackSuccessCard: React.FC<FeedbackSuccessCardProps> = ({
  freelancerName,
  clientName,
  projectName,
  rating,
  feedbackText,
  isExisting = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-150">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isExisting ? 'Review Already Submitted' : 'Thank You!'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            {isExisting ? (
              <>
                You have already submitted a review for{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{freelancerName}</span>.
                Each account can review a creator once.
              </>
            ) : (
              <>
                Your review for{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{freelancerName}</span> has been
                submitted successfully.
              </>
            )}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Review</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {projectName && (
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Project: {projectName}</div>
            )}
            <p className="text-slate-600 dark:text-slate-300 text-sm italic leading-relaxed">"{feedbackText}"</p>
          </div>
          {clientName && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right font-medium">
              Submitted by {clientName}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Logo className="w-5 h-5" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              CrestFlow Portal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSuccessCard;
