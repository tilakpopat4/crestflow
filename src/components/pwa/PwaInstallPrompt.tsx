import React from 'react';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';

/**
 * PwaInstallPrompt renders a discreet, non-intrusive banner when the browser fires
 * the beforeinstallprompt event. Clicking "Install App" triggers the native browser
 * installation popout (Brave / Chrome / Edge).
 */
export const PwaInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isDismissed, promptInstall, dismissPrompt } = usePwaInstall();

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Install CrestFlow Application"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-[#131318] text-[#F7F7F8] rounded-xl p-4 shadow-xl border border-[#2A2A33] transition-all duration-150 animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1B1B22] border border-[#2A2A33] flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-[#F7F7F8]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Install CrestFlow App</h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
              Add to desktop or home screen for faster access and offline work logging.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="text-[#A1A1AA] hover:text-white p-1 rounded hover:bg-[#1B1B22] transition-colors cursor-pointer border-0 bg-transparent shrink-0"
          title="Dismiss"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-[#2A2A33]">
        <button
          type="button"
          onClick={() => promptInstall()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-semibold text-white bg-accent hover:bg-accent-hover transition-colors duration-120 cursor-pointer border-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
        <button
          type="button"
          onClick={dismissPrompt}
          className="py-2 px-3 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] transition-colors duration-120 cursor-pointer border-0 bg-transparent"
        >
          Not Now
        </button>
      </div>
    </div>
  );
};
