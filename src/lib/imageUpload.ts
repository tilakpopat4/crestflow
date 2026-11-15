/**
 * Utility to process, resize, and compress user-uploaded profile pictures.
 * Direct file uploads without requiring third-party image hosting links.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  sizeBytes: number;
}

/**
 * Reads an image File from device, crops it to a center square,
 * and compresses it to a lightweight JPEG data URL.
 */
export async function processProfileImage(
  file: File,
  targetSize: number = 160,
  quality: number = 0.82
): Promise<ProcessedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (PNG, JPG, or WEBP).');
  }

  // 10MB client guard
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size exceeds 10MB limit. Please select a smaller photo.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image file.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Canvas 2D context is unavailable.'));
          }

          // Center-crop square math
          const { naturalWidth: w, naturalHeight: h } = img;
          const minDim = Math.min(w, h);
          const sx = (w - minDim) / 2;
          const sy = (h - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            dataUrl,
            sizeBytes: Math.round((dataUrl.length * 3) / 4),
          });
        } catch (err: any) {
          reject(new Error(err?.message || 'Error processing image canvas.'));
        }
      };
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
