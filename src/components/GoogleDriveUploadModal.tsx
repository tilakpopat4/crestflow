import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, CheckCircle2, AlertCircle, Loader2, Video, File, ExternalLink, Copy, Check, Play, FolderPlus, KeyRound, Globe } from 'lucide-react';
import { uploadFileToGoogleDrive, GoogleDriveUploadResult, getDriveAccessToken, acquireDriveAccessToken } from '../lib/driveService';
import { Client, WorkItem } from '../types';
import { generateUUID } from '../lib/utils';

interface GoogleDriveUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  defaultClientId?: string;
  onWorkItemCreated?: (workItem: WorkItem) => void;
  onLinkGenerated?: (driveResult: GoogleDriveUploadResult) => void;
}

export default function GoogleDriveUploadModal({
  isOpen,
  onClose,
  clients,
  defaultClientId,
  onWorkItemCreated,
  onLinkGenerated
}: GoogleDriveUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState<string>(defaultClientId || (clients[0]?.id || ''));
  const [description, setDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<GoogleDriveUploadResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [hasConnectedDrive, setHasConnectedDrive] = useState(() => !!getDriveAccessToken());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasConnectedDrive(!!getDriveAccessToken());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setUploadResult(null);
    setUploadProgress(0);
    if (!description.trim()) {
      // Auto-set clean description from filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setDescription(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleConnectDrive = async () => {
    setIsAuthorizing(true);
    setError(null);
    try {
      await acquireDriveAccessToken(true);
      setHasConnectedDrive(true);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to authorize Google Drive.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a video or file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const result = await uploadFileToGoogleDrive(selectedFile, (percent) => {
        setUploadProgress(percent);
      });

      setHasConnectedDrive(true);
      setUploadResult(result);

      if (onLinkGenerated) {
        onLinkGenerated(result);
      }

      // If client selected and callback provided, create work item directly
      if (onWorkItemCreated && clientId) {
        const clientObj = clients.find(c => c.id === clientId);
        const itemRate = Number(rate) || (clientObj ? clientObj.defaultRate : 0);
        const newWork: WorkItem = {
          id: generateUUID(),
          clientId: clientId,
          description: description.trim() || selectedFile.name,
          videoUrl: result.webViewLink,
          quantity: Number(quantity) || 1,
          rate: itemRate,
          date: Date.now(),
          status: 'Uninvoiced'
        };
        onWorkItemCreated(newWork);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Upload to Google Drive failed. Please verify your Google account permissions.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    if (uploadResult?.webViewLink) {
      navigator.clipboard.writeText(uploadResult.webViewLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const isPopupBlockedError = error && (error.toLowerCase().includes('popup') || error.toLowerCase().includes('blocked'));
  const isApiDisabledError = error && (
    error.includes('Google Drive API has not been used') ||
    error.includes('SERVICE_DISABLED') ||
    error.includes('drive.googleapis.com') ||
    error.includes('console.developers.google.com')
  );
  const activationUrl = "https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=960977935987";

  return (
    <div
      id="drive-upload-modal-overlay"
      onClick={() => { if (!isUploading) onClose(); }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        id="drive-upload-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden cursor-default flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shrink-0">
              <UploadCloud size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Upload Directly to Google Drive
                </h3>
                {hasConnectedDrive && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={11} /> Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload deliverable video & embed directly in client portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* API Disabled in Google Cloud Assistance UI */}
          {isApiDisabledError ? (
            <div className="bg-amber-50/95 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4.5 space-y-3.5 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={18} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                    Google Drive API Needs 1-Click Activation
                  </div>
                  <p className="text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed">
                    Google Cloud requires the <strong>Google Drive API</strong> to be turned on once for project <strong>960977935987</strong> (CrestFlow).
                  </p>
                  <ol className="list-decimal list-inside text-xs text-amber-900 dark:text-amber-200 space-y-1 pl-1 font-medium">
                    <li>
                      Click the blue button below to open Google Cloud Console.
                    </li>
                    <li>
                      Click the blue <strong>"ENABLE"</strong> button on the page.
                    </li>
                    <li>
                      Return to this modal and click <strong>"Retry Upload"</strong>!
                    </li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-amber-200/80 dark:border-amber-800/70">
                <a
                  href={activationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Enable Google Drive API</span>
                </a>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={isUploading}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  <span>Retry Upload</span>
                </button>
              </div>
            </div>
          ) : isPopupBlockedError ? (
            <div className="bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4.5 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle size={18} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    Google Popup Blocked by Browser
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Your browser prevented the Google Drive sign-in popup from opening. Follow these 2 steps:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-amber-900/90 dark:text-amber-200 space-y-1 pl-1 font-medium">
                    <li>
                      Look at the <strong>far right of your browser's address (URL) bar</strong> and click the <strong>Pop-up blocked icon (🚫)</strong>.
                    </li>
                    <li>
                      Select <strong>"Always allow pop-ups and redirects for this site"</strong> and click <strong>Done</strong>.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-amber-200/70 dark:border-amber-800/60">
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  disabled={isAuthorizing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isAuthorizing ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  <span>Authorize Google Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          ) : null}

          {/* Connect Drive prompt if not connected */}
          {!hasConnectedDrive && !uploadResult && !isPopupBlockedError && (
            <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3.5 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <KeyRound size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Google Drive Permission</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">1-click authorization to upload deliverables directly</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isAuthorizing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {isAuthorizing ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                <span>Connect</span>
              </button>
            </div>
          )}

          {/* Success card if uploaded */}
          {uploadResult && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div className="font-bold text-sm">Upload Successful to Google Drive!</div>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                File is uploaded and permissions are set to anyone with link. Clients can now stream and view the embedded video directly on the portal!
              </p>

              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-3">
                <div className="truncate text-xs font-mono text-slate-700 dark:text-slate-300">
                  {uploadResult.webViewLink}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={uploadResult.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={13} /> Open in Drive
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {!uploadResult && (
            <>
              {/* Drop / Select File Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*,.pdf,.zip,.rar"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Video size={24} />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatBytes(selectedFile.size)} • Click to change file
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-2xs">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Click to select a video / file
                      </span>{' '}
                      <span className="text-xs text-slate-500">or drag and drop here</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports MP4, MOV, MKV, ProRes, Images, and Documents
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar during Upload */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin text-indigo-600" /> Uploading to Google Drive...
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Form Details */}
              <div className="space-y-3.5 text-left">
                {clients.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Associate with Client (for work log)
                    </label>
                    <select
                      value={clientId}
                      onChange={(e) => {
                        setClientId(e.target.value);
                        const cl = clients.find(c => c.id === e.target.value);
                        if (cl && !rate) setRate(String(cl.defaultRate));
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="">None (Just generate link)</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Deliverable Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Real Estate Tour Final Cut"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                {clientId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="Optional"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Uploading to Drive ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      <span>Upload & Embed to Drive</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
