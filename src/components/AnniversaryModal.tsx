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
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        id="anniversary-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-amber-500/30 dark:border-amber-500/20 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden cursor-default relative animate-in zoom-in-95 duration-200"
      >
        {/* Top celebratory decorative banner */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-indigo-600 p-7 text-white text-center overflow-hidden">
          {/* Background glowing rings */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-all cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>

          {/* Floating Emoji / Trophy */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg text-3xl mb-3 animate-bounce duration-1000">
            {milestone.emoji || '🎉'}
          </div>

          <div className="inline-block px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider mb-1.5">
            {isExactToday ? 'Milestone Reached Today!' : 'Recent Career Milestone'}
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            {milestone.title}
          </h2>

          <p className="text-white/90 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            {milestone.description}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {freelancerName && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Honoring <strong className="text-slate-800 dark:text-slate-200">{freelancerName}</strong> for dedicated client craftsmanship!
            </p>
          )}

          {/* Stats Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                Days Freelancing
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {stats.workedDays}
              </span>
              <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 block mt-0.5 font-medium">
                {stats.formattedDuration}
              </span>
            </div>

            <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                Started Working
              </span>
              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mt-1 block">
                {stats.startDateFormatted}
              </span>
              <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 block mt-0.5 font-medium">
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
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Celebrate & Keep Hustling</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
