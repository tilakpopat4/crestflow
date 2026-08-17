import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback to manual UUIDv4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Normalizes or extracts a playable/viewable video or post link from a work item or string.
 */
export function extractVideoUrl(item?: { videoUrl?: string; description?: string } | string | null): string | null {
  if (!item) return null;

  let rawUrl = '';
  if (typeof item === 'string') {
    rawUrl = item.trim();
  } else {
    if (item.videoUrl && item.videoUrl.trim()) {
      rawUrl = item.videoUrl.trim();
    } else if (item.description) {
      // Check if description contains a URL
      const urlMatch = item.description.match(/(https?:\/\/[^\s]+|(?:www\.|instagram\.com|youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com|vimeo\.com|fb\.watch)[^\s]+)/i);
      if (urlMatch) {
        rawUrl = urlMatch[0].trim();
      }
    }
  }

  if (!rawUrl) return null;

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = 'https://' + rawUrl;
  }

  return rawUrl;
}
export function getDriveDirectImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmedUrl = url.trim();
  
  if (trimmedUrl.includes('drive.google.com')) {
    let fileId = '';
    
    // Format 1: /file/d/FILE_ID/view
    const fileDMatch = trimmedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    } else {
      // Format 2: ?id=FILE_ID
      const idMatch = trimmedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        fileId = idMatch[1];
      }
    }
    
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  return trimmedUrl;
}
