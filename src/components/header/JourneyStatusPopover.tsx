import React from 'react';
import { Award, Calendar } from 'lucide-react';
import { WorkJourneyStats } from '../../lib/anniversary';

interface JourneyStatusPopoverProps {
  journey: WorkJourneyStats | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEditProfile?: () => void;
  onOpenAnniversaryModal?: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Displays worked-days streak button and career milestone popover in GlobalHeader.
 */
export default function JourneyStatusPopover({
  journey,
  isOpen,
  onToggle,
  onClose,
  onEditProfile,
  onOpenAnniversaryModal,
  menuRef,
}: JourneyStatusPopoverProps) {
  return (
    <div className="relative shrink-0" ref={menuRef}>
      {journey ? (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="py-1.5 px-2 md:py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border-0 bg-transparent"
            title={`Started: ${journey.startDateFormatted} (${journey.workedDays} days freelancing).`}
          >
            <Calendar size={14} className="text-[#A1A1AA]" />
            <span className="font-medium text-[#F7F7F8] tabular-figures">{journey.workedDays}</span>
            <span className="hidden sm:inline text-[#A1A1AA]">days worked</span>
            <span className="sm:hidden text-[#A1A1AA]">d</span>
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 md:w-80 max-w-[calc(100vw-1.5rem)] bg-[#131318] text-[#F7F7F8] rounded-xl border border-[#2A2A33] p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A2A33]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-[#F7F7F8] flex items-center justify-center">
                    <Award size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#F7F7F8]">Freelancing Journey</h4>
                    <p className="text-[10px] text-[#A1A1AA]">Since {journey.startDateFormatted}</p>
                  </div>
                </div>
                {onEditProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditProfile();
                    }}
                    className="text-[10px] font-semibold text-[#A1A1AA] hover:text-[#F7F7F8] hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Edit Date
                  </button>
                )}
              </div>

              <div className="py-3 space-y-2.5">
                <div className="bg-[#1B1B22] rounded-xl p-3 border border-[#2A2A33] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] block">
                      Total Worked
                    </span>
                    <span className="text-lg font-bold text-[#F7F7F8] tabular-figures">
                      {journey.workedDays} <span className="text-xs font-normal text-[#A1A1AA]">days</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] block">
                      Duration
                    </span>
                    <span className="text-xs font-semibold text-[#F7F7F8]">{journey.formattedDuration}</span>
                  </div>
                </div>

                {journey.currentAnniversary && (
                  <div className="bg-[#1B1B22] border border-[#2A2A33] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={14} className="text-[#F7F7F8] shrink-0" />
                      <span className="text-xs font-bold text-[#F7F7F8]">{journey.currentAnniversary.title}</span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed mb-2">
                      {journey.currentAnniversary.description}
                    </p>
                    {onOpenAnniversaryModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAnniversaryModal();
                        }}
                        className="w-full py-1.5 bg-[#131318] hover:bg-[#2A2A33] text-[#F7F7F8] border border-[#2A2A33] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        View Celebration Card
                      </button>
                    )}
                  </div>
                )}

                {journey.nextMilestone && (
                  <div className="bg-[#1B1B22] rounded-xl p-3 border border-[#2A2A33] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#A1A1AA] shrink-0" />
                      <div className="text-[11px] text-[#F7F7F8]">
                        Next milestone: <strong className="font-semibold">{journey.nextMilestone.badge}</strong>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#A1A1AA] tabular-figures">
                      in {Math.abs(journey.nextMilestone.diffDays)}d
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : onEditProfile ? (
        <button
          type="button"
          onClick={onEditProfile}
          className="py-1.5 px-2.5 md:px-3 md:py-2 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-[#F7F7F8] bg-[#1B1B22] hover:bg-[#2A2A33] border border-dashed border-[#2A2A33] transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Set your freelancing start date to track worked days"
        >
          <Calendar size={14} className="text-[#A1A1AA]" />
          <span className="hidden sm:inline">+ Start Date</span>
          <span className="sm:hidden">+ Date</span>
        </button>
      ) : null}
    </div>
  );
}
