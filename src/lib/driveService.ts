import {
  setDriveAccessToken,
  getDriveAccessToken,
  hasPersistedDriveConnection,
  checkDriveConnectionStatus,
  fetchServerDriveToken,
  acquireDriveAccessToken,
  disconnectGoogleDrive,
  DriveConnectionStatus,
} from './driveAuth';
import { getOrCreateWorkLogsFolder, clearWorkLogsFolderCache } from './driveFolder';

export {
  setDriveAccessToken,
  getDriveAccessToken,
  hasPersistedDriveConnection,
  checkDriveConnectionStatus,
  fetchServerDriveToken,
  acquireDriveAccessToken,
  disconnectGoogleDrive,
  getOrCreateWorkLogsFolder,
  clearWorkLogsFolderCache,
};
export type { DriveConnectionStatus };

export interface GoogleDriveUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  embedUrl: string;
  directDownloadUrl: string;
  thumbnailUrl: string;
  folderId?: string;
}

export interface MultiUploadProgress {
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  currentFilePercent: number;
  overallPercent: number;
}

/**
 * Extracts Google Drive file ID from various link formats.
 */
export function extractDriveFileId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  const dMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

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
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
}

/**
 * Returns a high-resolution thumbnail image URL for a Google Drive file.
 */
export function getDriveThumbnailUrl(url: string | undefined | null, width = 800): string | null {
  const fileId = extractDriveFileId(url);
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w${width}` : null;
}

/**
 * Initiates a Google Drive Resumable Upload session.
 */
async function initiateResumableUpload(file: File, token: string, folderId?: string): Promise<Response> {
  const metadata: Record<string, any> = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: 'Uploaded via CrestFlow Freelancer Portal',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  return fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': String(file.size),
      },
      body: JSON.stringify(metadata),
    }
  );
}

/**
 * Uploads a single file to Google Drive under the "Work Logs" folder.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  onProgress?: (percent: number) => void,
  targetFolderId?: string
): Promise<GoogleDriveUploadResult> {
  let token = await acquireDriveAccessToken();

  // Resolve dedicated "Work Logs" folder if none provided
  let folderId = targetFolderId;
  if (!folderId) {
    try {
      folderId = await getOrCreateWorkLogsFolder(token);
    } catch (folderErr) {
      console.warn('Could not auto-create Work Logs folder, uploading to root:', folderErr);
    }
  }

  let initResponse = await initiateResumableUpload(file, token, folderId);

  if (initResponse.status === 401) {
    console.warn('Google Drive token expired. Refreshing silently...');
    const silentRefreshed = await fetchServerDriveToken(true);
    token = silentRefreshed || (await acquireDriveAccessToken(true));
    if (!folderId) {
      folderId = await getOrCreateWorkLogsFolder(token).catch(() => undefined);
    }
    initResponse = await initiateResumableUpload(file, token, folderId);
  }

  if (!initResponse.ok) {
    const errText = await initResponse.text().catch(() => '');
    let cleanMessage = `Failed to initiate Google Drive upload session (${initResponse.status})`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) cleanMessage = parsed.error.message;
    } catch {
      if (errText) cleanMessage += `: ${errText}`;
    }
    throw new Error(cleanMessage);
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive API did not return an upload Location URL.');
  }

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
        } catch {
          reject(new Error('Failed to parse Google Drive upload response'));
        }
      } else {
        reject(new Error(`Drive upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error occurred while uploading file to Google Drive.'));
    xhr.send(file);
  });

  const fileId = uploadedFile.id;

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
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
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    folderId,
  };
}

/**
 * Uploads multiple files sequentially to Google Drive under the dedicated "Work Logs" folder.
 */
export async function uploadMultipleFilesToGoogleDrive(
  files: File[],
  onProgress?: (progress: MultiUploadProgress) => void
): Promise<GoogleDriveUploadResult[]> {
  if (files.length === 0) return [];

  let token = await acquireDriveAccessToken();
  let folderId: string | undefined;
  try {
    folderId = await getOrCreateWorkLogsFolder(token);
  } catch (folderErr) {
    console.warn('Could not create Work Logs folder, uploading to root:', folderErr);
  }

  const results: GoogleDriveUploadResult[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const result = await uploadFileToGoogleDrive(
      file,
      (percent) => {
        if (onProgress) {
          const overall = Math.round(((i + percent / 100) / total) * 100);
          onProgress({
            currentFileIndex: i,
            totalFiles: total,
            currentFileName: file.name,
            currentFilePercent: percent,
            overallPercent: overall,
          });
        }
      },
      folderId
    );
    results.push(result);
  }

  return results;
}
