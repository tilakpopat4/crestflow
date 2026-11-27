import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink, Folder } from 'lucide-react';
import { GoogleDriveUploadResult } from '../../lib/driveService';

interface DriveSuccessCardProps {
  results: GoogleDriveUploadResult[];
  onClose: () => void;
}

export const DriveSuccessCard: React.FC<DriveSuccessCardProps> = ({ results, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyOne = (link: string, idx: number) => {
    navigator.clipboard.writeText(link);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const allLinks = results.map((r) => `${r.name}: ${r.webViewLink}`).join('\n');
    navigator.clipboard.writeText(allLinks);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const firstLink = results[0]?.webViewLink;

  return (
    <div className="bg-[#1B1B22] border border-[#2A2A33] rounded-xl p-5 space-y-4 text-left">
      <div className="flex items-center gap-2.5 text-[#F7F7F8]">
        <CheckCircle2 size={20} className="text-[#2DD4A0] shrink-0" />
        <div>
          <div className="font-bold text-sm">
            {results.length === 1 ? 'Upload Successful!' : `${results.length} Files Uploaded Successfully!`}
          </div>
          <div className="text-xs text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
            <Folder size={12} className="text-[#A1A1AA]" />
            <span>Saved to your Google Drive in <strong>"Work Logs"</strong> folder</span>
          </div>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
        {results.map((res, i) => (
          <div
            key={res.fileId || i}
            className="bg-[#131318] p-2.5 rounded-lg border border-[#2A2A33] flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#F7F7F8] truncate">{res.name}</div>
              <div className="text-[11px] font-mono text-[#A1A1AA] truncate">{res.webViewLink}</div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyOne(res.webViewLink, i)}
              className="px-2 py-1 bg-[#1B1B22] hover:bg-[#2A2A33] text-[#F7F7F8] rounded text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer border border-[#2A2A33]"
            >
              {copiedIndex === i ? <Check size={12} className="text-[#2DD4A0]" /> : <Copy size={12} />}
              <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[#2A2A33]">
        {results.length > 1 && (
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex-1 py-2 bg-[#1B1B22] hover:bg-[#2A2A33] text-[#F7F7F8] rounded-lg text-xs font-semibold transition-colors border border-[#2A2A33] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copiedAll ? <Check size={13} className="text-[#2DD4A0]" /> : <Copy size={13} />}
            <span>{copiedAll ? 'All Copied' : 'Copy All Links'}</span>
          </button>
        )}
        {firstLink && (
          <a
            href={firstLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 bg-[#1B1B22] hover:bg-[#2A2A33] text-[#F7F7F8] rounded-lg text-xs font-semibold text-center transition-colors border border-[#2A2A33] flex items-center justify-center gap-1.5 no-underline"
          >
            <ExternalLink size={13} />
            <span>Open in Drive</span>
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 bg-[#E0002B] hover:bg-[#FF2D4A] text-[#F7F7F8] rounded-lg text-xs font-semibold transition-colors border-0 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
