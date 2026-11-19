
import React, { useState } from 'react';
import { X, Upload, FileType, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Client, Invoice, WorkItem } from '../types';
import { generateUUID } from '../lib/utils';
import { db } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { sanitizePayload } from '../hooks/useFirestore';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  onImportSuccess: () => void;
}

export default function CsvImportModal({ isOpen, onClose, userId, onImportSuccess }: CsvImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsImporting(true);
    setError(null);
    setSuccessMsg(null);

    const { default: Papa } = await import('papaparse');

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const data = results.data as string[][];

          let client: Client | null = null;
          const workItems: WorkItem[] = [];
          const invoices: Invoice[] = [];

          let currentSection = '';

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row.length === 0 || row.every(cell => !cell)) continue;

            // Detect sections
            if (row[0] === 'CLIENT OVERVIEW') {
              currentSection = 'client';
              i += 1; // skip header row
              continue;
            } else if (row[0] === 'WORK HISTORY LOGS') {
              currentSection = 'work';
              i += 1; // skip header row
              continue;
            } else if (row[0] === 'INVOICES SUMMARY') {
              currentSection = 'invoice';
              i += 1; // skip header row
              continue;
            } else if (row[0] === 'FINANCIAL SUMMARY') {
              currentSection = 'financial';
              continue;
            }

            // Parse based on section
            if (currentSection === 'client') {
              // Format: Client ID | Client Name | Phone | Email | Default Reel Rate (₹) | Last Payment Date
              const id = row[0] || generateUUID();
              const name = row[1];
              const phone = row[2];
              const email = row[3] !== 'N/A' ? row[3] : '';
              const defaultRate = parseInt(row[4], 10) || 0;

              if (name) {
                client = {
                  id,
                  name,
                  phone,
                  email,
                  defaultRate,
                  createdAt: Date.now()
                };
              }
            } else if (currentSection === 'work' && client) {
              // Format: Log ID | Date | Sub-Client | Description | Quantity | Rate (₹) | Total | Status | Video Link
              const logId = row[0] || generateUUID();
              const dateParts = (row[1] || '').split('-');
              const dateTimestamp = dateParts.length === 3
                ? new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).getTime()
                : Date.now();

              const description = row[3];
              const quantity = parseInt(row[4], 10) || 1;
              const rate = parseInt(row[5], 10) || 0;
              const status = row[7] === 'Invoiced' ? 'Invoiced' : 'Uninvoiced';
              const videoUrl = row[8] || '';

              if (description) {
                workItems.push({
                  id: logId,
                  clientId: client.id,
                  description,
                  quantity,
                  rate,
                  date: dateTimestamp,
                  status,
                  videoUrl,
                  createdAt: Date.now()
                });
              }
            } else if (currentSection === 'invoice' && client) {
              // Format: Invoice ID | Date | Status | Items/Reels Count | Total Amount (₹)
              const invId = row[0] || generateUUID();
              const dateParts = (row[1] || '').split('-');
              const dateTimestamp = dateParts.length === 3
                ? new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).getTime()
                : Date.now();
              const status = row[2] === 'Paid' ? 'Paid' : 'Pending';
              const totalAmount = parseInt(row[4], 10) || 0;

              if (row[0]) {
                invoices.push({
                  id: invId,
                  clientId: client.id,
                  clientName: client.name,
                  date: dateTimestamp,
                  status,
                  totalAmount,
                  reels: [], // We omit reels in export summary
                });
              }
            }
          }

          if (!client) {
            throw new Error("Could not find valid Client Data in the CSV. Make sure it matches the export format.");
          }

          // Batch Write to Firestore
          const batch = writeBatch(db);

          const clientRef = doc(db, 'clients', client.id);
          batch.set(clientRef, sanitizePayload({ ...client, userId }));

          workItems.forEach(item => {
            const ref = doc(db, 'workItems', item.id);
            batch.set(ref, sanitizePayload({ ...item, userId }));
          });

          invoices.forEach(inv => {
            const ref = doc(db, 'invoices', inv.id);
            batch.set(ref, sanitizePayload({ ...inv, userId }));
          });

          await batch.commit();

          setSuccessMsg(`Successfully imported ${client.name} with ${workItems.length} work logs and ${invoices.length} invoices!`);
          setTimeout(() => {
            onImportSuccess();
            onClose();
          }, 2000);

        } catch (err: any) {
          console.error(err);
          setError(err.message || "An error occurred while importing.");
        } finally {
          setIsImporting(false);
        }
      },
      error: (err) => {
        setError(err.message);
        setIsImporting(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 select-none">
      <div className="bg-surface-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-surface-400 text-text-primary animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-5 border-b border-surface-400/80">
          <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
            <FileType size={18} className="text-accent" />
            Import Client Report
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer border-0 bg-transparent" disabled={isImporting}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Upload a CSV report generated from this app to restore the client, their work history, and invoice records.
          </p>

          {error && (
            <div className="p-3 bg-surface-800 text-accent border border-accent/40 text-xs font-medium rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-surface-800 text-text-primary border border-surface-400 text-xs font-medium rounded-lg flex items-start gap-2">
              <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
              {successMsg}
            </div>
          )}

          <label className="block">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
              ${isImporting ? 'border-surface-400 bg-surface-800 opacity-75 cursor-not-allowed' : 'border-surface-400 bg-surface-800 hover:border-surface-300'}`}
            >
              {isImporting ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="text-accent animate-spin" />
                  <span className="text-xs font-semibold text-text-secondary">Processing file...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-11 h-11 bg-surface-700 border border-surface-400 rounded-xl shadow-xs flex items-center justify-center">
                    <Upload size={18} className="text-accent" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary block">Click to upload CSV</span>
                    <span className="text-[11px] text-text-muted">Must be a Client Work History export</span>
                  </div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isImporting}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
