import React from 'react';
import { X, Trophy, Sparkles, Calendar, ArrowRight, PartyPopper } from 'lucide-react';
import { AnniversaryMilestone, WorkJourneyStats } from '../lib/anniversary';

interface AnniversaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: AnniversaryMilestone | null;
  stats: WorkJourneyStats | null;
  freelancerName?: string;
}

export default function AnniversaryModal({
  isOpen,
  onClose,
  milestone,
  stats,
  freelancerName
}: AnniversaryModalProps) {
  if (!isOpen || !milestone || !stats) return null;

  const isExactToday = milestone.diffDays === 0;

  return (
    <div
      id="anniversary-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        id="anniversary-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl max-w-md w-full overflow-hidden cursor-default relative animate-in zoom-in-95 duration-200"
      >
        {/* Top header banner */}
        <div className="relative bg-slate-900 p-6 text-white text-center border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>

          {/* Milestone Badge Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-3">
            <Trophy size={28} />
          </div>

          <div className="inline-block px-3 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            {isExactToday ? 'Milestone Reached Today' : 'Recent Career Milestone'}
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            {milestone.title}
          </h2>

          <p className="text-slate-300 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            {milestone.description}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {freelancerName && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Honoring <strong className="text-slate-800 dark:text-slate-200">{freelancerName}</strong> for dedicated client craftsmanship
            </p>
          )}

          {/* Stats Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 block mb-0.5">
                Days Freelancing
              </span>
              <span className="text-2xl font-black text-amber-800 dark:text-amber-200">
                {stats.workedDays}
              </span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 block mt-0.5 font-medium">
                {stats.formattedDuration}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400 block mb-0.5">
                Started Working
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                {stats.startDateFormatted}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 font-medium">
                {milestone.badge} Milestone
              </span>
            </div>
          </div>

          {/* Next milestone preview */}
          {stats.nextMilestone && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-amber-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300">
                  Next target: <strong className="text-slate-900 dark:text-white">{stats.nextMilestone.title}</strong>
                </span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                in {Math.abs(stats.nextMilestone.diffDays)} days
              </span>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
