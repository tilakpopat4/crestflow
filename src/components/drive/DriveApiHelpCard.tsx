import React from 'react';
import { AlertCircle, ExternalLink, Loader2, UploadCloud } from 'lucide-react';

interface DriveApiHelpCardProps {
  error: string;
  isApiDisabledError: boolean;
  isPopupBlockedError: boolean;
  isUploading: boolean;
  isAuthorizing: boolean;
  onRetryUpload: () => void;
  onConnectDrive: () => void;
  onDismiss: () => void;
}

export const DriveApiHelpCard: React.FC<DriveApiHelpCardProps> = ({
  error,
  isApiDisabledError,
  isPopupBlockedError,
  isUploading,
  isAuthorizing,
  onRetryUpload,
  onConnectDrive,
  onDismiss,
}) => {
  const activationUrl =
    'https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=960977935987';

  if (isApiDisabledError) {
    return (
      <div className="bg-[#131318] border border-[#2A2A33] rounded-xl p-4 space-y-3 text-left">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1B1B22] text-[#FFB020] flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle size={18} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="font-bold text-xs text-[#F7F7F8] uppercase tracking-wide">
              Google Drive API Needs 1-Click Activation
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Google Cloud requires the <strong>Google Drive API</strong> to be turned on once for project{' '}
              <strong>960977935987</strong> (CrestFlow).
            </p>
            <ol className="list-decimal list-inside text-xs text-[#A1A1AA] space-y-0.5 pl-1">
              <li>Click the button below to open Google Cloud Console.</li>
              <li>Click the blue <strong>"ENABLE"</strong> button on that page.</li>
              <li>Return here and click <strong>"Retry Upload"</strong>.</li>
            </ol>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2 border-t border-[#2A2A33]">
          <a
            href={activationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#E0002B] hover:bg-[#FF2D4A] text-[#F7F7F8] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 no-underline cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>Enable Drive API</span>
          </a>
          <button
            type="button"
            onClick={onRetryUpload}
            disabled={isUploading}
            className="px-3.5 py-2 bg-[#1B1B22] hover:bg-[#2A2A33] text-[#F7F7F8] rounded-lg text-xs font-semibold transition-colors border border-[#2A2A33] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
            <span>Retry Upload</span>
          </button>
        </div>
      </div>
    );
  }

  if (isPopupBlockedError) {
    return (
      <div className="bg-[#131318] border border-[#2A2A33] rounded-xl p-4 space-y-3 text-left">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1B1B22] text-[#FFB020] flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle size={18} />
          </div>
          <div className="space-y-1 flex-1">
            <div className="font-bold text-xs text-[#F7F7F8] uppercase tracking-wide">
              Google Popup Blocked by Browser
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Your browser blocked the Google Drive sign-in popup. Allow popups for this site in your address bar:
            </p>
            <ol className="list-decimal list-inside text-xs text-[#A1A1AA] space-y-0.5 pl-1">
              <li>Click the <strong>Pop-up blocked icon</strong> on the right of your address bar.</li>
              <li>Select <strong>"Always allow pop-ups and redirects for this site"</strong>.</li>
            </ol>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2 border-t border-[#2A2A33]">
          <button
            type="button"
            onClick={onConnectDrive}
            disabled={isAuthorizing}
            className="px-3.5 py-2 bg-[#E0002B] hover:bg-[#FF2D4A] text-[#F7F7F8] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-0 disabled:opacity-50"
          >
            {isAuthorizing ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
            <span>Authorize Google Drive</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-2 text-xs font-semibold text-[#A1A1AA] hover:text-[#F7F7F8] rounded-lg cursor-pointer border-0 bg-transparent"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#131318] border border-[#F0607A]/50 text-[#F0607A] p-3 rounded-xl text-xs flex items-start gap-2.5 text-left">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">{error}</div>
    </div>
  );
};
