import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud } from 'lucide-react';
import {
  GoogleDriveUploadResult,
  MultiUploadProgress,
  uploadMultipleFilesToGoogleDrive,
  hasPersistedDriveConnection,
  checkDriveConnectionStatus,
  fetchServerDriveToken,
  acquireDriveAccessToken,
  disconnectGoogleDrive,
} from '../lib/driveService';
import { Client, WorkItem } from '../types';
import { generateUUID } from '../lib/utils';
import { DriveDropZone } from './drive/DriveDropZone';
import { DriveSuccessCard } from './drive/DriveSuccessCard';
import { DriveApiHelpCard } from './drive/DriveApiHelpCard';
import { DriveUploadProgress } from './drive/DriveUploadProgress';
import { DriveConnectionBanner } from './drive/DriveConnectionBanner';
import { DriveWorkItemFields } from './drive/DriveWorkItemFields';

interface GoogleDriveUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  defaultClientId?: string;
  onWorkItemCreated?: (workItem: WorkItem) => void;
  onWorkItemsCreated?: (workItems: WorkItem[]) => void;
  onLinkGenerated?: (driveResult: GoogleDriveUploadResult) => void;
  onLinksGenerated?: (driveResults: GoogleDriveUploadResult[]) => void;
}

export default function GoogleDriveUploadModal({
  isOpen,
  onClose,
  clients,
  defaultClientId,
  onWorkItemCreated,
  onWorkItemsCreated,
  onLinkGenerated,
  onLinksGenerated,
}: GoogleDriveUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [clientId, setClientId] = useState<string>(defaultClientId || (clients[0]?.id || ''));
  const [description, setDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<MultiUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<GoogleDriveUploadResult[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [hasConnectedDrive, setHasConnectedDrive] = useState(() => hasPersistedDriveConnection());
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setUploadResults(null);
      setUploadProgress(null);
      setError(null);
      setDescription('');
      return;
    }
    let cancelled = false;
    const localConnected = hasPersistedDriveConnection();
    setHasConnectedDrive(localConnected);
    setIsCheckingConnection(!localConnected);

    checkDriveConnectionStatus()
      .then((status) => {
        if (cancelled) return;
        setHasConnectedDrive(status.connected);
        setConnectedEmail(status.email);
        if (status.connected) void fetchServerDriveToken(false);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingConnection(false);
      });

    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesAdded = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (!arr.length) return;
    setSelectedFiles((prev) => [...prev, ...arr]);
    setError(null);
    setUploadResults(null);
    if (!description.trim() && arr[0]) {
      const cleanName = arr[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setDescription(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleConnectDrive = async () => {
    setIsAuthorizing(true);
    setError(null);
    try {
      await acquireDriveAccessToken(true);
      setHasConnectedDrive(true);
      const status = await checkDriveConnectionStatus();
      setConnectedEmail(status.email);
    } catch (err: any) {
      setError(err?.message || 'Failed to authorize Google Drive.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDisconnectDrive = async () => {
    setIsDisconnecting(true);
    setError(null);
    try {
      await disconnectGoogleDrive();
      setHasConnectedDrive(false);
      setConnectedEmail(null);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFiles.length) {
      setError('Please choose at least one file to upload.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      const results = await uploadMultipleFilesToGoogleDrive(selectedFiles, setUploadProgress);
      setHasConnectedDrive(true);
      setUploadResults(results);

      const willCreateWorkItems = Boolean(clientId && (onWorkItemsCreated || onWorkItemCreated));
      if (!willCreateWorkItems) {
        if (onLinksGenerated) onLinksGenerated(results);
        if (onLinkGenerated && results[0]) onLinkGenerated(results[0]);
      } else {
        const clientObj = clients.find((c) => c.id === clientId);
        const isMonthly = clientObj?.paymentBasis === 'monthly_retainer' || Boolean(clientObj?.monthlyRetainerAmount && clientObj.monthlyRetainerAmount > 0);
        const itemRate = isMonthly ? 0 : (Number(rate) || (clientObj ? clientObj.defaultRate : 0));

        const createdItems: WorkItem[] = results.map((res, i) => ({
          id: generateUUID(),
          clientId,
          description: selectedFiles.length === 1
            ? (description.trim() || res.name)
            : (description.trim() ? `${description.trim()} (${i + 1})` : res.name),
          videoUrl: res.webViewLink,
          quantity: Number(quantity) || 1,
          rate: itemRate,
          date: Date.now(),
          status: 'Uninvoiced',
          createdAt: Date.now(),
        }));

        if (onWorkItemsCreated) onWorkItemsCreated(createdItems);
        else if (onWorkItemCreated) createdItems.forEach((itm) => onWorkItemCreated(itm));
      }
    } catch (err: any) {
      setError(err?.message || 'Upload to Google Drive failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const isPopupBlocked = Boolean(error && error.toLowerCase().includes('popup'));
  const isApiDisabled = Boolean(error && (error.includes('Google Drive API has not been used') || error.includes('SERVICE_DISABLED')));

  return (
    <div
      onClick={() => { if (!isUploading) onClose(); }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#131318] border border-[#2A2A33] text-[#F7F7F8] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden cursor-default flex flex-col max-h-[92vh]"
      >
        <div className="p-4 sm:p-5 border-b border-[#2A2A33] flex items-center justify-between gap-3 bg-[#131318]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-[#F7F7F8] flex items-center justify-center shrink-0">
              <UploadCloud size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[#F7F7F8]">Upload to Google Drive</h3>
                {hasConnectedDrive && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#2DD4A0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4A0] shrink-0" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA]">Saves to dedicated "Work Logs" folder automatically</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isUploading} className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] transition-colors disabled:opacity-50 cursor-pointer border-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <DriveApiHelpCard
              error={error} isApiDisabledError={isApiDisabled} isPopupBlockedError={isPopupBlocked}
              isUploading={isUploading} isAuthorizing={isAuthorizing}
              onRetryUpload={handleStartUpload} onConnectDrive={handleConnectDrive} onDismiss={() => setError(null)}
            />
          )}

          <DriveConnectionBanner
            isCheckingConnection={isCheckingConnection} hasConnectedDrive={hasConnectedDrive}
            hasUploadResults={Boolean(uploadResults)} hasError={Boolean(error)}
            isAuthorizing={isAuthorizing} isDisconnecting={isDisconnecting} isUploading={isUploading}
            connectedEmail={connectedEmail} onConnect={handleConnectDrive} onDisconnect={handleDisconnectDrive}
          />

          {uploadResults ? (
            <DriveSuccessCard results={uploadResults} onClose={onClose} />
          ) : (
            <>
              <DriveDropZone
                fileInputRef={fileInputRef}
                selectedFiles={selectedFiles}
                isDragging={isDragging}
                isUploading={isUploading}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                }}
                onFilesAdded={handleFilesAdded}
                onRemoveFile={(idx) => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
              />

              {isUploading && <DriveUploadProgress progress={uploadProgress} />}

              <DriveWorkItemFields
                clients={clients}
                clientId={clientId}
                description={description}
                quantity={quantity}
                rate={rate}
                fileCount={selectedFiles.length}
                onClientChange={(id) => {
                  setClientId(id);
                  const cl = clients.find((c) => c.id === id);
                  if (cl && !rate) {
                    const isMonthly = cl.paymentBasis === 'monthly_retainer' || Boolean(cl.monthlyRetainerAmount && cl.monthlyRetainerAmount > 0);
                    setRate(isMonthly ? '0' : String(cl.defaultRate));
                  }
                }}
                onDescriptionChange={setDescription}
                onQuantityChange={setQuantity}
                onRateChange={setRate}
              />

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#2A2A33]">
                <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-[#F7F7F8] transition-colors cursor-pointer border-0 bg-transparent">
                  Cancel
                </button>
                <button
                  type="button" onClick={handleStartUpload} disabled={isUploading || selectedFiles.length === 0}
                  className="px-5 py-2.5 bg-[#E0002B] hover:bg-[#FF2D4A] text-[#F7F7F8] rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border-0 disabled:opacity-50"
                >
                  <UploadCloud size={15} />
                  <span>
                    {isUploading ? 'Uploading...' : selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Files to "Work Logs"` : 'Upload to "Work Logs"'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
