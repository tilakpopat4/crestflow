import React, { useState } from 'react';
import { Client, WorkItem, UserProfile } from '../types';
import { FileText, Lock, Copy, Calendar, Loader2 } from 'lucide-react';
import { useAiSummarizerConfig } from '../lib/aiConfig';
import { useAccess } from '../hooks/useAccess';

interface AISummarizerProps {
  clients: Client[];
  workItems: WorkItem[];
  profile: UserProfile | null | undefined;
}

export default function AISummarizer({ clients, workItems, profile }: AISummarizerProps) {
  const { isEnabled: isAiEnabled } = useAiSummarizerConfig();
  const access = useAccess();
  const [targetDate, setTargetDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!access.requireAccess('ai_summary', 'Summarize deliverables and draft client portfolio notes.')) {
      return;
    }
    setIsGenerating(true);
    setError(null);
    setSummary('');
    setCopied(false);
    try {
      const upToDate = new Date(targetDate);
      upToDate.setHours(23, 59, 59, 999);

      const { generateWorkSummary } = await import('../lib/geminiService');
      const generatedText = await generateWorkSummary(clients, workItems, upToDate, profile);
      setSummary(generatedText);
    } catch (err: any) {
      if (err?.code === 'ENTITLEMENT_REQUIRED') {
        access.requireAccess('ai_summary');
      }
      setError(err.message || 'Failed to generate summary.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isAiEnabled) return null;

  return (
    <div className="bg-[#131318] border border-[#2A2A33] rounded-xl overflow-hidden flex flex-col mt-6">
      <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1B1B22] border-b border-[#2A2A33]">
        <div>
          <h3 className="text-base font-semibold text-[#F7F7F8] flex items-center gap-2">
            <FileText className="text-[#A1A1AA]" size={18} />
            AI Work Summarizer
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Generate a concise summary of your work experience and achievements up to a specific date.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-40">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={14} className="text-[#A1A1AA]" />
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="pl-9 w-full rounded-lg border border-[#2A2A33] text-xs bg-[#131318] text-[#F7F7F8] py-2 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 cf-btn-primary disabled:opacity-60 text-white px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : !access.canWrite ? <Lock size={14} /> : <FileText size={14} />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="p-5 bg-[#131318]">
        {error && (
          <div className="p-3 bg-[#1B1B22] border border-[#F0607A]/40 text-[#F0607A] rounded-lg text-xs mb-4">
            {error}
          </div>
        )}

        {!summary && !isGenerating && !error && (
          <div className="text-center py-6 text-[#A1A1AA] text-xs">
            Select a date and click &quot;Generate&quot; to create your AI summary.
          </div>
        )}

        {isGenerating && (
          <div className="py-6 flex flex-col items-center justify-center gap-2 select-none">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-xs text-[#A1A1AA]">Generating summary...</span>
          </div>
        )}

        {summary && !isGenerating && (
          <div className="relative group">
            <div className="absolute -top-3 -right-3">
              <button
                onClick={handleCopy}
                className="p-2 bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] rounded-lg shadow-sm text-[#A1A1AA] hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? <span className="text-xs font-semibold text-text-primary px-1">Copied!</span> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[#F7F7F8] text-sm sm:text-base leading-relaxed bg-[#131318] p-5 rounded-xl border border-[#2A2A33]">
              {summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
