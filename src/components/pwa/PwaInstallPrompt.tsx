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
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] bg-[#212121] text-slate-100 rounded-xl p-4 shadow-xl border border-[#383838] transition-all duration-150 animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#282828] border border-[#3a3a3a] flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-slate-200" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">Install CrestFlow App</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Add to desktop or home screen for faster access and offline work logging.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#282828] transition-colors cursor-pointer border-0 bg-transparent shrink-0"
          title="Dismiss"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-[#2e2e2e]">
        <button
          type="button"
          onClick={() => promptInstall()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-semibold text-white bg-[#4870aa] hover:bg-[#3b5e90] transition-colors duration-120 cursor-pointer border-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
        <button
          type="button"
          onClick={dismissPrompt}
          className="py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#282828] transition-colors duration-120 cursor-pointer border-0 bg-transparent"
        >
          Not Now
        </button>
      </div>
    </div>
  );
};
