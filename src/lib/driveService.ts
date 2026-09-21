import { auth, googleProvider } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

let cachedDriveAccessToken: string | null = null;

export function setDriveAccessToken(token: string | null) {
  cachedDriveAccessToken = token;
}

export function getDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

export interface GoogleDriveUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  embedUrl: string;
  directDownloadUrl: string;
  thumbnailUrl: string;
}

/**
 * Extracts Google Drive file ID from various link formats.
 */
export function extractDriveFileId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Format 1: /file/d/FILE_ID/view or /preview or trailing slash
  const dMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  // Format 2: ?id=FILE_ID or &id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Format 3: /open?id=FILE_ID
  const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) return openMatch[1];

  return null;
}

/**
 * Returns true if the URL is a Google Drive file link.
 */
export function isGoogleDriveUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

/**
 * Returns the embeddable preview URL for Google Drive files.
 */
export function getDriveEmbedUrl(url: string | undefined | null): string | null {
  const fileId = extractDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return null;
}

/**
 * Ensures a valid Google Access Token with Drive file scopes is available.
 * Scope: https://www.googleapis.com/auth/drive.file (allows uploading & managing files created by this app)
 */
export async function acquireDriveAccessToken(forcePrompt = false): Promise<string> {
  if (cachedDriveAccessToken && !forcePrompt) {
    return cachedDriveAccessToken;
  }

  try {
    // Add Google Drive scope for file creation & access
    googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google OAuth sign-in did not return an access token for Google Drive. Please try again.');
    }

    cachedDriveAccessToken = token;
    return token;
  } catch (err: any) {
    console.error('Failed to acquire Drive token via OAuth popup:', err);
    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup')) {
      throw new Error('Google OAuth popup was blocked. Please allow popups for this site to connect Google Drive.');
    }
    throw err;
  }
}

/**
 * Uploads a file directly to Google Drive using the Resumable Upload API.
 * Automatically makes the file readable by anyone with the link so clients can view the embedded preview.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<GoogleDriveUploadResult> {
  let token = cachedDriveAccessToken;
  if (!token) {
    token = await acquireDriveAccessToken();
  }

  // 1. Initiate Resumable Upload Session
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: 'Uploaded via CrestFlow Freelancer Portal'
  };

  let initResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': String(file.size)
      },
      body: JSON.stringify(metadata)
    }
  );

  // If token expired, re-authenticate and retry
  if (initResponse.status === 401 || initResponse.status === 403) {
    console.warn('Google Drive token expired. Re-authorizing...');
    token = await acquireDriveAccessToken(true);
    initResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'application/octet-stream',
          'X-Upload-Content-Length': String(file.size)
        },
        body: JSON.stringify(metadata)
      }
    );
  }

  if (!initResponse.ok) {
    const errText = await initResponse.text().catch(() => '');
    throw new Error(`Failed to initiate Google Drive upload session (${initResponse.status}): ${errText}`);
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive API did not return an upload Location URL.');
  }

  // 2. Upload file binary data with XMLHttpRequest for real-time progress tracking
  const uploadedFile = await new Promise<{ id: string; name: string; mimeType: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve(res);
        } catch (e) {
          reject(new Error('Failed to parse Google Drive upload response'));
        }
      } else {
        reject(new Error(`Drive upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred while uploading file to Google Drive.'));
    };

    xhr.send(file);
  });

  const fileId = uploadedFile.id;

  // 3. Set file permission to 'anyoneWithLink' so clients can view the embedded link
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Could not set public permissions on uploaded Drive file:', permErr);
  }

  return {
    fileId,
    name: uploadedFile.name || file.name,
    mimeType: uploadedFile.mimeType || file.type,
    webViewLink: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    directDownloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
  };
}
