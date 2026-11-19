import React from 'react';
import { User } from 'firebase/auth';
import { Award, FileText, StickyNote as StickyNoteIcon } from 'lucide-react';
import { Client, WorkItem, UserProfile } from '../../types';
import StickyNotesWidget from '../StickyNotesWidget';
import AISummarizer from '../AISummarizer';

interface DashboardWorkspaceToolsProps {
  activeWorkspaceTool: 'none' | 'notes' | 'ai' | 'milestones';
  setActiveWorkspaceTool: React.Dispatch<React.SetStateAction<'none' | 'notes' | 'ai' | 'milestones'>>;
  isAiEnabled: boolean;
  journey: any;
  user: User | null;
  clients: Client[];
  workItems: WorkItem[];
  profile?: UserProfile | null;
}

export const DashboardWorkspaceTools: React.FC<DashboardWorkspaceToolsProps> = ({
  activeWorkspaceTool,
  setActiveWorkspaceTool,
  isAiEnabled,
  journey,
  user,
  clients,
  workItems,
  profile,
}) => {
  return (
    <div className="bg-surface-700 border border-surface-400 p-4 sm:p-6 rounded-xl shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-wider">
            Workspace Tools
          </h3>
          <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5">
            {isAiEnabled
              ? 'Quick access to scratchpad notes and Gemini AI summaries'
              : 'Quick access to scratchpad notes and client snippets'}
          </p>
        </div>
        <div className="inline-flex p-0.5 bg-surface-800 border border-surface-400 rounded-lg shrink-0 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveWorkspaceTool((prev) => (prev === 'notes' ? 'none' : 'notes'))}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
              activeWorkspaceTool === 'notes'
                ? 'bg-surface-600 text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <StickyNoteIcon size={13} /> Notes {activeWorkspaceTool === 'notes' ? '(Active)' : ''}
          </button>
          {isAiEnabled && (
            <button
              type="button"
              onClick={() => setActiveWorkspaceTool((prev) => (prev === 'ai' ? 'none' : 'ai'))}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                activeWorkspaceTool === 'ai'
                  ? 'bg-surface-600 text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText size={13} /> AI Summarizer {activeWorkspaceTool === 'ai' ? '(Active)' : ''}
            </button>
          )}
          {journey && (
            <button
              type="button"
              onClick={() => setActiveWorkspaceTool((prev) => (prev === 'milestones' ? 'none' : 'milestones'))}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                activeWorkspaceTool === 'milestones'
                  ? 'bg-surface-600 text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Award size={13} /> Milestones {activeWorkspaceTool === 'milestones' ? '(Active)' : ''}
            </button>
          )}
        </div>
      </div>

      {activeWorkspaceTool === 'notes' && (
        <div className="animate-in fade-in duration-200">
          <StickyNotesWidget user={user} clients={clients} />
        </div>
      )}

      {isAiEnabled && activeWorkspaceTool === 'ai' && (
        <div className="animate-in fade-in duration-200">
          <AISummarizer clients={clients} workItems={workItems} profile={profile} />
        </div>
      )}

      {activeWorkspaceTool === 'milestones' && journey && (
        <div className="bg-surface-800 border border-surface-400 text-text-primary p-4 sm:p-5 rounded-xl flex items-center justify-between gap-4 relative animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-surface-600 border border-surface-400 flex items-center justify-center shrink-0 text-text-secondary">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-surface-600 text-text-secondary px-2 py-0.5 rounded border border-surface-400/60">
                  Freelancing Journey
                </span>
                <span className="text-xs text-text-secondary font-mono tabular-nums">
                  {journey.workedDays} days worked ({journey.formattedDuration})
                </span>
              </div>
              {journey.currentAnniversary ? (
                <>
                  <h3 className="text-base font-bold mt-0.5 text-text-primary">{journey.currentAnniversary.title}!</h3>
                  <p className="text-xs text-text-secondary max-w-xl">{journey.currentAnniversary.description}</p>
                </>
              ) : (
                <p className="text-xs text-text-secondary mt-0.5">
                  Started on {journey.startDateFormatted}. Next milestone: {journey.nextMilestone?.badge || 'Career growth'}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardWorkspaceTools;
