import { useState } from 'react';
import { auth } from '../firebase';
import { HeroConfig } from '../lib/heroConfig';

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_POSTER_BYTES = 5 * 1024 * 1024;

interface UseAdminLandingMediaProps {
  draft: HeroConfig;
  setDraft: React.Dispatch<React.SetStateAction<HeroConfig>>;
}

/**
 * Hook managing landing page video & poster uploads to Cloudflare R2,
 * first-frame capture, deletion, and upload progress tracking.
 */
export function useAdminLandingMedia({ draft, setDraft }: UseAdminLandingMediaProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [isCapturingPoster, setIsCapturingPoster] = useState(false);

  const handleUploadVideo = (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setStatusMessage(null);

    const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
    const isWebm = file.type === 'video/webm' || file.name.toLowerCase().endsWith('.webm');
    if (!isMp4 && !isWebm) {
      setErrorMessage('Invalid file format. Only MP4 (H.264) and WebM videos are accepted.');
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setErrorMessage(`Video exceeds the 25 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setUploading(true);
    setProgress(0);

    auth.currentUser?.getIdToken().then((token) => {
      if (!token) {
        setErrorMessage('Authentication required. Please sign in as an admin.');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/landing-media/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setDraft((prev) => ({
              ...prev,
              backgroundType: 'video',
              backgroundVideoUrl: data.videoUrl || '/api/media/landing-video',
              posterUrl: data.posterUrl || prev.posterUrl,
              videoEnabled: true,
              fileSize: data.fileSize || file.size,
              mimeType: isWebm ? 'video/webm' : 'video/mp4',
            }));
            setStatusMessage(`Video uploaded successfully (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
            setLastFailedFile(null);
          } catch {
            setErrorMessage('Received invalid response from media server.');
          }
        } else {
          let errText = 'Upload failed. The previous video remains active.';
          try {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson?.error) errText = `${errJson.error} The previous video remains active.`;
          } catch {}
          setErrorMessage(errText);
          setLastFailedFile(file);
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setErrorMessage('Network error during video upload. The previous video remains active.');
        setLastFailedFile(file);
      };

      xhr.send(formData);
    }).catch((err) => {
      setUploading(false);
      setErrorMessage(err?.message || 'Failed to authorize video upload.');
      setLastFailedFile(file);
    });
  };

  const handleUploadPoster = async (file: File) => {
    if (!file) return;
    if (file.size > MAX_POSTER_BYTES) {
      setErrorMessage('Poster image exceeds the 5 MB limit.');
      return;
    }
    const token = await auth.currentUser?.getIdToken();
    if (!token) return setErrorMessage('Authentication required.');

    const formData = new FormData();
    formData.append('poster', file);

    try {
      const res = await fetch('/api/admin/landing-media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload poster.');
      setDraft((prev) => ({ ...prev, posterUrl: data.posterUrl || '/api/media/landing-poster' }));
      setStatusMessage('Poster frame uploaded and saved.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload poster image.');
    }
  };

  const handleExtractFirstFrame = async () => {
    const videoUrl = draft.backgroundVideoUrl || '/api/media/landing-video';
    if (!videoUrl) return;
    setIsCapturingPoster(true);
    setErrorMessage(null);

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0.1;

    video.addEventListener('seeked', async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async (blob) => {
            if (!blob) throw new Error('Could not generate poster frame.');
            const file = new File([blob], 'poster.jpg', { type: 'image/jpeg' });
            await handleUploadPoster(file);
            setIsCapturingPoster(false);
          }, 'image/jpeg', 0.85);
        }
      } catch (err: any) {
        setIsCapturingPoster(false);
        setErrorMessage(err?.message || 'Failed to extract video frame.');
      }
    }, { once: true });

    video.addEventListener('error', () => {
      setIsCapturingPoster(false);
      setErrorMessage('Could not load video to extract frame. Try uploading a poster image directly.');
    }, { once: true });

    video.load();
  };

  const handleRemoveMedia = async () => {
    if (!window.confirm('Remove the custom video background and revert to default surface?')) return;
    const token = await auth.currentUser?.getIdToken();
    if (!token) return setErrorMessage('Authentication required.');

    try {
      const res = await fetch('/api/admin/landing-media', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete media from storage.');
      setDraft((prev) => ({
        ...prev,
        backgroundType: 'color',
        backgroundVideoUrl: '',
        posterUrl: '',
        videoEnabled: false,
        fileSize: 0,
      }));
      setStatusMessage('Custom background video removed.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove media.');
    }
  };

  return {
    uploading,
    progress,
    statusMessage,
    errorMessage,
    lastFailedFile,
    isCapturingPoster,
    handleUploadVideo,
    handleUploadPoster,
    handleExtractFirstFrame,
    handleRemoveMedia,
  };
}
