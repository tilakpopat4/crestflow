import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'crestflow_pwa_prompt_dismissed';

/**
 * usePwaInstall captures the browser's beforeinstallprompt event
 * and provides a method to trigger the native installation popup.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed or running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      // Prevent automatic browser mini-infobar on mobile
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // If deferredPrompt is not yet available, fallback hint
      alert('To install CrestFlow, click the install icon in your browser address bar or use Browser Menu > Install App.');
      return false;
    }

    try {
      // Trigger the native browser install dialog
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return choice.outcome === 'accepted';
    } catch (err) {
      console.warn('[PWA] promptInstall failed:', err);
      return false;
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsInstallable(false);
    try {
      localStorage.setItem(DISMISS_KEY, (Date.now() + 7 * 86400 * 1000).toString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  const isDismissed = Boolean(
    typeof window !== 'undefined' &&
      parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10) > Date.now()
  );

  return {
    isInstallable,
    isInstalled,
    isDismissed,
    promptInstall,
    dismissPrompt,
  };
}
