import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PublicProfileNotFoundProps {
  error: string | null;
}

export const PublicProfileNotFound: React.FC<PublicProfileNotFoundProps> = ({ error }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#131318] dark:bg-[#0B0B0E] p-4 text-center text-[#F7F7F8] dark:text-[#F7F7F8] transition-colors duration-150">
      <div className="w-16 h-16 bg-[#131318] text-[#F0607A] border border-red-600/40 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2">Profile Not Found</h1>
      <p className="text-[#A1A1AA] dark:text-[#A1A1AA] text-sm max-w-md">{error}</p>
      <a
        href="/"
        className="mt-5 inline-flex items-center justify-center px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer no-underline"
      >
        Return to CrestFlow
      </a>
    </div>
  );
};

export default PublicProfileNotFound;
