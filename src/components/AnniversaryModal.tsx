import React from 'react';
import { X, Trophy, Award, Calendar, ArrowRight } from 'lucide-react';
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
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200 select-none"
    >
      <div
        id="anniversary-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#212121] border border-[#333333] text-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden cursor-default relative animate-in zoom-in-95 duration-200"
      >
        {/* Top header banner */}
        <div className="relative bg-[#181818] p-6 text-white text-center border-b border-[#2e2e2e]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-[#aaaaaa] hover:text-white bg-[#282828] hover:bg-[#333333] border border-[#383838] p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>

          {/* Milestone Badge Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#282828] border border-[#383838] text-white mb-3 shadow-inner">
            <Trophy size={28} className="text-white" />
          </div>

          <div>
            <div className="inline-block px-3 py-1 rounded-md bg-[#282828] border border-[#383838] text-[#cccccc] text-[11px] font-bold uppercase tracking-wider mb-2">
              {isExactToday ? 'Milestone Reached Today' : 'Recent Career Milestone'}
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            {milestone.title}
          </h2>

          <p className="text-[#aaaaaa] text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            {milestone.description}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 bg-[#212121]">
          {freelancerName && (
            <p className="text-center text-xs text-[#aaaaaa]">
              Honoring <strong className="text-white">{freelancerName}</strong> for dedicated client craftsmanship
            </p>
          )}

          {/* Stats Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#282828] border border-[#383838] rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#aaaaaa] block mb-0.5">
                Days Freelancing
              </span>
              <span className="text-2xl font-black text-white">
                {stats.workedDays}
              </span>
              <span className="text-[11px] text-[#888888] block mt-0.5 font-medium">
                {stats.formattedDuration}
              </span>
            </div>

            <div className="bg-[#282828] border border-[#383838] rounded-xl p-3.5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#aaaaaa] block mb-0.5">
                Started Working
              </span>
              <span className="text-sm font-bold text-white mt-1 block">
                {stats.startDateFormatted}
              </span>
              <span className="text-[11px] text-[#888888] block mt-0.5 font-medium">
                {milestone.badge} Milestone
              </span>
            </div>
          </div>

          {/* Next milestone preview */}
          {stats.nextMilestone && (
            <div className="bg-[#282828] rounded-xl p-3 border border-[#383838] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Award size={15} className="text-[#aaaaaa] shrink-0" />
                <span className="text-[#cccccc]">
                  Next target: <strong className="text-white">{stats.nextMilestone.title}</strong>
                </span>
              </div>
              <span className="text-[11px] font-medium text-[#aaaaaa]">
                in {Math.abs(stats.nextMilestone.diffDays)} days
              </span>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-[#282828] hover:bg-[#333333] text-white text-sm font-semibold rounded-xl border border-[#444444] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
