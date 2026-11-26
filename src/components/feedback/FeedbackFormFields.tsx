import React from 'react';

interface FeedbackFormFieldsProps {
  clientName: string;
  setClientName: (val: string) => void;
  projectName: string;
  setProjectName: (val: string) => void;
  feedbackText: string;
  setFeedbackText: (val: string) => void;
}

export const FeedbackFormFields: React.FC<FeedbackFormFieldsProps> = ({
  clientName,
  setClientName,
  projectName,
  setProjectName,
  feedbackText,
  setFeedbackText,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5 uppercase tracking-wider">
          Your Name or Company *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Acme Media Corp"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg bg-[#131318] dark:bg-[#1B1B22] text-[#F7F7F8] dark:text-[#F7F7F8] placeholder-slate-400 outline-none transition-colors duration-120 focus:border-[#FF2D4A] focus:bg-[#131318] dark:focus:bg-[#131318]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5 uppercase tracking-wider">
          Project Name (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. YouTube Series Season 2, Commercial Cut"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg bg-[#131318] dark:bg-[#1B1B22] text-[#F7F7F8] dark:text-[#F7F7F8] placeholder-slate-400 outline-none transition-colors duration-120 focus:border-[#FF2D4A] focus:bg-[#131318] dark:focus:bg-[#131318]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#A1A1AA] dark:text-[#A1A1AA] mb-1.5 uppercase tracking-wider">
          Your Detailed Review *
        </label>
        <textarea
          required
          rows={4}
          placeholder="What did you like most about working with this creator? Quality, speed, communication..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          className="w-full p-3 text-sm border border-[#2A2A33] dark:border-[#2A2A33] rounded-lg bg-[#131318] dark:bg-[#1B1B22] text-[#F7F7F8] dark:text-[#F7F7F8] placeholder-slate-400 outline-none transition-colors duration-120 focus:border-[#FF2D4A] focus:bg-[#131318] dark:focus:bg-[#131318] resize-none leading-relaxed"
        />
      </div>
    </div>
  );
};

export default FeedbackFormFields;
