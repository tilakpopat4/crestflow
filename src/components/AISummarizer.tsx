import React, { useState } from 'react';
import { Client, WorkItem, UserProfile } from '../types';
import { Sparkles, Copy, Calendar, Loader2 } from 'lucide-react';
import { useAiSummarizerConfig } from '../lib/aiConfig';

interface AISummarizerProps {
  clients: Client[];
  workItems: WorkItem[];
  profile: UserProfile | null | undefined;
}

export default function AISummarizer({ clients, workItems, profile }: AISummarizerProps) {
  const { isEnabled: isAiEnabled } = useAiSummarizerConfig();
  const [targetDate, setTargetDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSummary('');
    setCopied(false);
    try {
      const upToDate = new Date(targetDate);
      // Set to end of the day
      upToDate.setHours(23, 59, 59, 999);
      
      const { generateWorkSummary } = await import('../lib/geminiService');
      const generatedText = await generateWorkSummary(clients, workItems, upToDate, profile);
      setSummary(generatedText);
    } catch (err: any) {
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
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-xs overflow-hidden flex flex-col mt-8">
      <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800/80">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="text-text-primary" size={20} />
            AI Work Summarizer
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate a professional summary of your work experience, clients, and achievements up to a specific date.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-40">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="pl-9 w-full rounded-lg border-slate-200 dark:border-slate-700 text-sm focus:border-surface-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 py-2 shadow-xs transition-colors"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs whitespace-nowrap cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
      
      <div className="p-6 bg-[#212121]">
        {error && (
          <div className="p-3.5 bg-[#181818] border border-red-600/40 text-red-400 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {!summary && !isGenerating && !error && (
          <div className="text-center py-8 text-slate-400 text-sm italic">
            Select a date and click "Generate" to create your AI summary.
          </div>
        )}

        {isGenerating && (
          <div className="py-6 flex flex-col items-center justify-center gap-2 select-none">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400">Generating summary...</span>
          </div>
        )}

        {summary && !isGenerating && (
          <div className="relative group">
            <div className="absolute -top-3 -right-3">
              <button
                onClick={handleCopy}
                className="p-2 bg-[#282828] hover:bg-[#333333] border border-[#383838] rounded-lg shadow-sm text-slate-300 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? <span className="text-xs font-semibold text-text-primary px-1">Copied!</span> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[#f1f1f1] text-sm sm:text-base leading-relaxed bg-[#1e1e1e] p-5 rounded-xl border border-[#333333]">
              {summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
