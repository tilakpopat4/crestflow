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
    <div className="min-h-screen bg-[#131318] dark:bg-[#0B0B0E] flex items-center justify-center p-4 font-sans text-[#F7F7F8] dark:text-[#F7F7F8] transition-colors duration-150">
      <div className="max-w-md w-full bg-[#131318] dark:bg-[#131318] rounded-xl shadow-xl border border-[#2A2A33] dark:border-[#2A2A33] p-8 text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-[#FF2D4A] dark:text-[#FF2D4A] border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#F7F7F8] dark:text-[#F7F7F8] tracking-tight">
            {isExisting ? 'Review Already Submitted' : 'Thank You!'}
          </h1>
          <p className="text-[#A1A1AA] dark:text-[#A1A1AA] text-sm leading-relaxed">
            {isExisting ? (
              <>
                You have already submitted a review for{' '}
                <span className="font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">{freelancerName}</span>.
                Each account can review a creator once.
              </>
            ) : (
              <>
                Your review for{' '}
                <span className="font-semibold text-[#F7F7F8] dark:text-[#F7F7F8]">{freelancerName}</span> has been
                submitted successfully.
              </>
            )}
          </p>
        </div>

        <div className="bg-[#131318] dark:bg-[#1B1B22] border border-[#2A2A33] dark:border-[#2A2A33]/60 rounded-xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Your Review</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= rating ? 'text-[#FFB020] fill-amber-400' : 'text-[#F7F7F8] dark:text-[#A1A1AA]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {projectName && (
              <div className="text-xs font-bold text-[#A1A1AA] dark:text-[#A1A1AA]">Project: {projectName}</div>
            )}
            <p className="text-[#A1A1AA] dark:text-[#A1A1AA] text-sm italic leading-relaxed">"{feedbackText}"</p>
          </div>
          {clientName && (
            <div className="text-[10px] text-[#A1A1AA] dark:text-[#A1A1AA] text-right font-medium">
              Submitted by {clientName}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#2A2A33] dark:border-[#2A2A33] flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Logo className="w-5 h-5" />
            <span className="text-xs font-bold text-[#A1A1AA] dark:text-[#A1A1AA] tracking-wider uppercase">
              CrestFlow Portal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSuccessCard;
