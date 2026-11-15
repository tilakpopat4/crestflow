import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PublicProfileNotFoundProps {
  error: string | null;
}

export const PublicProfileNotFound: React.FC<PublicProfileNotFoundProps> = ({ error }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center text-slate-800 dark:text-slate-200 transition-colors duration-150">
      <div className="w-16 h-16 bg-red-50 dark:bg-rose-950/40 text-red-500 dark:text-rose-400 border border-red-100 dark:border-rose-900/50 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Profile Not Found</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">{error}</p>
      <a
        href="/"
        className="mt-5 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer no-underline"
      >
        Return to CrestFlow
      </a>
    </div>
  );
};

export default PublicProfileNotFound;
