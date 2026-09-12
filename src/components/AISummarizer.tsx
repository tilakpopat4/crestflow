import React, { useState } from 'react';
import { Client, WorkItem, UserProfile } from '../types';
import { generateWorkSummary } from '../lib/geminiService';
import { Sparkles, Copy, Calendar, Loader2 } from 'lucide-react';

interface AISummarizerProps {
  clients: Client[];
  workItems: WorkItem[];
  profile: UserProfile | null | undefined;
}

export default function AISummarizer({ clients, workItems, profile }: AISummarizerProps) {
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

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm overflow-hidden flex flex-col mt-8">
      <div className="p-6 border-b border-indigo-100/50 dark:border-indigo-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
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
              className="pl-9 w-full rounded-lg border-slate-200 dark:border-slate-700 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 py-2 shadow-sm transition-all"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
      
      <div className="p-6 bg-white/40 dark:bg-slate-900/40">
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {!summary && !isGenerating && !error && (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm italic">
            Select a date and click "Generate" to create your AI summary.
          </div>
        )}

        {isGenerating && (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-4 bg-indigo-100 dark:bg-indigo-900/60 rounded-full w-full"></div>
            <div className="h-4 bg-indigo-100 dark:bg-indigo-900/60 rounded-full w-11/12"></div>
            <div className="h-4 bg-indigo-100 dark:bg-indigo-900/60 rounded-full w-10/12"></div>
            <div className="h-4 bg-indigo-100 dark:bg-indigo-900/60 rounded-full w-4/5"></div>
          </div>
        )}

        {summary && !isGenerating && (
          <div className="relative group">
            <div className="absolute -top-3 -right-3">
              <button
                onClick={handleCopy}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-1">Copied!</span> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed bg-white dark:bg-slate-800/90 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shadow-inner">
              {summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
