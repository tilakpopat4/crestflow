import React from 'react';
import { KeyRound } from 'lucide-react';

interface DriveConnectionBannerProps {
  isCheckingConnection: boolean;
  hasConnectedDrive: boolean;
  hasUploadResults: boolean;
  hasError: boolean;
  isAuthorizing: boolean;
  isDisconnecting: boolean;
  isUploading: boolean;
  connectedEmail: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const DriveConnectionBanner: React.FC<DriveConnectionBannerProps> = ({
  isCheckingConnection,
  hasConnectedDrive,
  hasUploadResults,
  hasError,
  isAuthorizing,
  isDisconnecting,
  isUploading,
  connectedEmail,
  onConnect,
  onDisconnect,
}) => {
  if (!isCheckingConnection && !hasConnectedDrive && !hasUploadResults && !hasError) {
    return (
      <div className="bg-[#1B1B22] border border-[#2A2A33] p-3.5 rounded-xl flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#131318] border border-[#2A2A33] text-[#A1A1AA] flex items-center justify-center shrink-0">
            <KeyRound size={15} />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F7F7F8]">Google Drive Connection</div>
            <div className="text-[11px] text-[#A1A1AA]">Connect once — stays linked across sessions</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onConnect}
          disabled={isAuthorizing}
          className="px-3 py-1.5 bg-[#E0002B] hover:bg-[#FF2D4A] text-[#F7F7F8] rounded-lg text-xs font-semibold shrink-0 transition-colors border-0 cursor-pointer disabled:opacity-50"
        >
          {isAuthorizing ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    );
  }

  if (hasConnectedDrive && !hasUploadResults) {
    return (
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-[#A1A1AA]">
        <span className="truncate">Google Drive connected{connectedEmail ? ` (${connectedEmail})` : ''}</span>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={isDisconnecting || isUploading}
          className="text-xs font-medium text-[#A1A1AA] hover:text-[#F0607A] transition-colors border-0 bg-transparent shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return null;
};
