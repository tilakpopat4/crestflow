const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let gisLoadPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Google Identity Services script once.
 */
function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if ((window as any).google?.accounts?.oauth2?.initCodeClient) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    const timeout = window.setTimeout(() => reject(new Error('GIS script timed out')), 8000);
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      gisLoadPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

/**
 * Requests an offline authorization code via Google Identity Services popup.
 */
export async function requestGisDriveAuthCode(
  clientId: string,
  hintEmail?: string | null
): Promise<string> {
  await loadGisScript();
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2?.initCodeClient) {
    throw Object.assign(new Error('GIS code client unavailable'), { fallbackAllowed: true });
  }

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initCodeClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      ux_mode: 'popup',
      hint: hintEmail || undefined,
      callback: (resp: { code?: string; error?: string; error_description?: string }) => {
        if (resp?.code) resolve(resp.code);
        else if (resp?.error === 'access_denied') {
          reject(new Error('Google Drive permission was denied. Please grant access to upload files.'));
        } else {
          reject(
            Object.assign(new Error(resp?.error_description || resp?.error || 'Authorization failed'), {
              fallbackAllowed: true,
            })
          );
        }
      },
      error_callback: (err: { type?: string; message?: string }) => {
        if (err?.type === 'popup_failed_to_open') {
          reject(new Error('Google OAuth popup was blocked by your browser. Please allow popups for this site and try again.'));
        } else if (err?.type === 'popup_closed') {
          reject(new Error('Google sign-in popup was closed before completion. Please try again.'));
        } else {
          reject(Object.assign(new Error(err?.message || 'GIS popup error'), { fallbackAllowed: true }));
        }
      },
    });
    client.requestCode();
  });
}
