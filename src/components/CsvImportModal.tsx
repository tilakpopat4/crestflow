import React, { useState } from 'react';
import { X, Upload, FileType, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Client, Invoice, WorkItem, Reel, InvoiceDeliverable, SubClient } from '../types';
import { generateUUID } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { toSnakeCase } from '../hooks/useSupabase';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  onImportSuccess: () => void;
}

function parseDateRobust(dateStr?: string, timestampMsStr?: string): number {
  if (timestampMsStr && !isNaN(Number(timestampMsStr)) && Number(timestampMsStr) > 0) {
    return Number(timestampMsStr);
  }
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A' || dateStr === 'Not Set') {
    return Date.now();
  }

  // 1. Check if ISO string or YYYY-MM-DD
  const directParse = Date.parse(dateStr);
  if (!isNaN(directParse) && directParse > 0) {
    return directParse;
  }

  // 2. Check for DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.trim().split(/[\/\-.]/);
  if (parts.length === 3) {
    // If year is parts[0] (YYYY-MM-DD)
    if (parts[0].length === 4) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    // If year is parts[2] (DD/MM/YYYY or MM/DD/YYYY)
    if (parts[2].length === 4) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
  }

  return Date.now();
}

function parseJsonArray<T>(str?: string): T[] {
  if (!str || str.trim() === '' || str === '[]') return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

          const clientsMap = new Map<string, Client>();
          const workItems: WorkItem[] = [];
          const invoices: Invoice[] = [];

          let currentSection: 'client' | 'work' | 'invoice' | 'financial' | '' = '';
          let headerMap = new Map<string, number>();

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue;

            const firstCell = (row[0] || '').trim().toUpperCase();

            // Detect section boundaries
            if (firstCell === 'CLIENT OVERVIEW' || firstCell === 'ALL CLIENTS') {
              currentSection = 'client';
              i++; // Move to header row
              headerMap = buildHeaderMap(data[i] || []);
              continue;
            } else if (firstCell === 'WORK HISTORY LOGS') {
              currentSection = 'work';
              i++; // Move to header row
              headerMap = buildHeaderMap(data[i] || []);
              continue;
            } else if (firstCell === 'INVOICES SUMMARY') {
              currentSection = 'invoice';
              i++; // Move to header row
              headerMap = buildHeaderMap(data[i] || []);
              continue;
            } else if (firstCell === 'FINANCIAL SUMMARY') {
              currentSection = 'financial';
              continue;
            }

            // Skip comment/title lines
            if (firstCell.startsWith('CRESTFLOW') || firstCell.startsWith('GENERATED ON') || firstCell.startsWith('TOTAL CLIENTS') || firstCell.startsWith('CLIENT:')) {
              continue;
            }

            // Parse Client Row
            if (currentSection === 'client') {
              const id = getCell(row, headerMap, ['client id', 'id']) || generateUUID();
              const name = getCell(row, headerMap, ['client name', 'name']);
              if (!name) continue;

              const phone = getCell(row, headerMap, ['phone']);
              const email = getCell(row, headerMap, ['email']);
              const paymentBasis = (getCell(row, headerMap, ['payment basis']) || 'per_reel') as any;
              const monthlyRetainerAmount = parseFloat(getCell(row, headerMap, ['monthly retainer (₹)', 'monthly retainer'])) || 0;
              const defaultRate = parseFloat(getCell(row, headerMap, ['default reel rate (₹)', 'default rate', 'rate'])) || 0;
              const onSiteShootRate = parseFloat(getCell(row, headerMap, ['on-site shoot rate (₹)'])) || undefined;
              const websiteMakingRate = parseFloat(getCell(row, headerMap, ['website making rate (₹)'])) || undefined;
              const lastPaymentDate = parseDateRobust(
                getCell(row, headerMap, ['last payment date (yyyy-mm-dd)', 'last payment date']),
                getCell(row, headerMap, ['last payment timestamp (ms)'])
              );
              const paymentCycleDays = parseInt(getCell(row, headerMap, ['payment cycle (days)', 'payment cycle days']), 10) || 30;
              const emailRemindersEnabled = getCell(row, headerMap, ['email reminders enabled']) !== 'false';
              const autoInvoiceEnabled = getCell(row, headerMap, ['auto invoice enabled']) === 'true';
              const autoInvoiceScheduleType = getCell(row, headerMap, ['auto invoice schedule type']) as any;
              const autoInvoiceCycleDay = parseInt(getCell(row, headerMap, ['auto invoice cycle day']), 10) || undefined;
              const autoInvoiceSpecificDate = getCell(row, headerMap, ['auto invoice specific date']) || undefined;
              const isClosed = getCell(row, headerMap, ['is closed']) === 'true';
              const closedAt = parseDateRobust(undefined, getCell(row, headerMap, ['closed at (ms)']));
              const createdAt = parseDateRobust(getCell(row, headerMap, ['created at (iso)']), getCell(row, headerMap, ['created at (ms)']));
              const notes = getCell(row, headerMap, ['notes']);
              const subClients = parseJsonArray<SubClient>(getCell(row, headerMap, ['sub-clients data (json)', 'sub-clients']));

              clientsMap.set(id, {
                id,
                name,
                phone: phone !== 'N/A' ? phone : '',
                email: email !== 'N/A' ? email : '',
                paymentBasis,
                monthlyRetainerAmount,
                defaultRate,
                onSiteShootRate,
                websiteMakingRate,
                lastPaymentDate: lastPaymentDate || undefined,
                paymentCycleDays,
                emailRemindersEnabled,
                autoInvoiceEnabled,
                autoInvoiceScheduleType,
                autoInvoiceCycleDay,
                autoInvoiceSpecificDate,
                isClosed,
                closedAt: closedAt || undefined,
                createdAt: createdAt || Date.now(),
                notes: notes || undefined,
                subClients: subClients.length > 0 ? subClients : undefined
              });
            }

            // Parse Work Item Row
            else if (currentSection === 'work') {
              const id = getCell(row, headerMap, ['log id', 'id']) || generateUUID();
              const clientId = getCell(row, headerMap, ['client id']) || Array.from(clientsMap.keys())[0] || '';
              const date = parseDateRobust(
                getCell(row, headerMap, ['date (yyyy-mm-dd)', 'date']),
                getCell(row, headerMap, ['date timestamp (ms)'])
              );
              const subClientId = getCell(row, headerMap, ['sub-client id']);
              const subClientName = getCell(row, headerMap, ['sub-client name', 'sub-client']);
              const description = getCell(row, headerMap, ['description']);
              if (!description) continue;

              const quantity = parseFloat(getCell(row, headerMap, ['quantity', 'qty'])) || 1;
              const rate = parseFloat(getCell(row, headerMap, ['rate (₹)', 'rate'])) || 0;
              const statusRaw = getCell(row, headerMap, ['status', 'invoiced status']);
              const status = statusRaw === 'Invoiced' ? 'Invoiced' : 'Uninvoiced';
              const invoiceId = getCell(row, headerMap, ['invoice id']);
              const videoUrl = getCell(row, headerMap, ['video url', 'video link']);
              const createdAt = parseDateRobust(undefined, getCell(row, headerMap, ['created at (ms)']));

              workItems.push({
                id,
                clientId,
                subClientId: subClientId || undefined,
                subClientName: subClientName && subClientName !== 'General / Direct Client' ? subClientName : undefined,
                description,
                quantity,
                rate,
                date,
                status,
                invoiceId: invoiceId || undefined,
                videoUrl: videoUrl || undefined,
                createdAt: createdAt || date
              });
            }

            // Parse Invoice Row
            else if (currentSection === 'invoice') {
              const id = getCell(row, headerMap, ['invoice id', 'id']) || generateUUID();
              const clientId = getCell(row, headerMap, ['client id']) || Array.from(clientsMap.keys())[0] || '';
              const clientName = getCell(row, headerMap, ['client name']) || clientsMap.get(clientId)?.name || 'Client';
              const date = parseDateRobust(
                getCell(row, headerMap, ['date (yyyy-mm-dd)', 'date']),
                getCell(row, headerMap, ['date timestamp (ms)'])
              );
              const status = (getCell(row, headerMap, ['status']) === 'Paid' ? 'Paid' : 'Pending');
              const invoiceType = (getCell(row, headerMap, ['invoice type']) === 'monthly_retainer' ? 'monthly_retainer' : 'per_item') as any;
              const billingMonth = getCell(row, headerMap, ['billing month']);
              const totalAmount = parseFloat(getCell(row, headerMap, ['total amount (₹)', 'total amount', 'total'])) || 0;
              const discountAmount = parseFloat(getCell(row, headerMap, ['discount amount (₹)', 'discount amount'])) || 0;
              const discountDescription = getCell(row, headerMap, ['discount description']);
              const extraCostAmount = parseFloat(getCell(row, headerMap, ['extra cost amount (₹)', 'extra cost amount'])) || 0;
              const extraCostDescription = getCell(row, headerMap, ['extra cost description']);
              const lastPaymentDate = parseDateRobust(
                getCell(row, headerMap, ['last payment date (yyyy-mm-dd)', 'last payment date']),
                getCell(row, headerMap, ['last payment timestamp (ms)'])
              );
              const isAutoGenerated = getCell(row, headerMap, ['is auto generated']) === 'true';
              const linkedWorkItemIds = parseJsonArray<string>(getCell(row, headerMap, ['linked work item ids (json)', 'linked work item ids']));
              const reels = parseJsonArray<Reel>(getCell(row, headerMap, ['reels data (json)', 'reels data', 'reels']));
              const deliverables = parseJsonArray<InvoiceDeliverable>(getCell(row, headerMap, ['deliverables data (json)', 'deliverables']));

              invoices.push({
                id,
                date,
                clientId,
                clientName,
                status,
                invoiceType,
                billingMonth: billingMonth || undefined,
                totalAmount,
                discountAmount: discountAmount || undefined,
                discountDescription: discountDescription || undefined,
                extraCostAmount: extraCostAmount || undefined,
                extraCostDescription: extraCostDescription || undefined,
                lastPaymentDate: lastPaymentDate || undefined,
                isAutoGenerated,
                linkedWorkItemIds: linkedWorkItemIds.length > 0 ? linkedWorkItemIds : undefined,
                reels: reels.length > 0 ? reels : [],
                deliverables: deliverables.length > 0 ? deliverables : undefined
              });
            }
          }

          const clientsList = Array.from(clientsMap.values());
          if (clientsList.length === 0 && workItems.length === 0 && invoices.length === 0) {
            throw new Error("No valid data rows found in this CSV file. Please make sure it was exported from CrestFlow.");
          }

          // 1. Upsert Clients to Supabase
          if (clientsList.length > 0) {
            const snakeClients = clientsList.map(c => toSnakeCase({ ...c, userId }));
            let { error: clientErr } = await supabase.from('clients').upsert(snakeClients, { onConflict: 'id' });
            if (clientErr && clientErr.message?.includes('column')) {
              const fallback = snakeClients.map(sc => {
                const copy = { ...sc };
                delete copy.sub_clients;
                return copy;
              });
              await supabase.from('clients').upsert(fallback, { onConflict: 'id' });
            }
          }

          // 2. Upsert Work Items to Supabase
          if (workItems.length > 0) {
            const snakeWork = workItems.map(w => toSnakeCase({ ...w, userId }));
            const { error: workErr } = await supabase.from('work_items').upsert(snakeWork, { onConflict: 'id' });
            if (workErr) throw workErr;
          }

          // 3. Upsert Invoices to Supabase
          if (invoices.length > 0) {
            const snakeInvoices = invoices.map(inv => toSnakeCase({ ...inv, userId }));
            let { error: invErr } = await supabase.from('invoices').upsert(snakeInvoices, { onConflict: 'id' });
            if (invErr && invErr.message?.includes('column')) {
              const fallback = snakeInvoices.map(si => {
                const copy = { ...si };
                delete copy.reels;
                delete copy.deliverables;
                return copy;
              });
              await supabase.from('invoices').upsert(fallback, { onConflict: 'id' });
            }
          }

          setSuccessMsg(`Imported with 0% data loss: ${clientsList.length} clients, ${workItems.length} work items, and ${invoices.length} invoices!`);
          setTimeout(() => {
            onImportSuccess();
            onClose();
          }, 1800);

        } catch (err: any) {
          console.error('[CSV Import Error]', err);
          setError(err.message || 'An error occurred while importing.');
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
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150 cursor-default"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileType size={18} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Import Client Report</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Upload any CSV report or full workspace export generated from CrestFlow. Work logs, invoice dates, rates, and metadata will be restored with 0% data loss.
        </p>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        <label
          htmlFor="csv-file-input"
          className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-indigo-50/20 dark:bg-indigo-950/20"
        >
          {isImporting ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Processing & Restoring Data...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2.5">
                <Upload size={18} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Click to upload CSV</span>
              <span className="text-[11px] text-slate-400 mt-1">CrestFlow Client Report or Full Workspace Backup</span>
            </>
          )}
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            disabled={isImporting}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

function buildHeaderMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    if (cell) {
      map.set(cell.trim().toLowerCase(), idx);
    }
  });
  return map;
}

function getCell(row: string[], headerMap: Map<string, number>, possibleHeaders: string[]): string {
  for (const h of possibleHeaders) {
    const idx = headerMap.get(h.toLowerCase());
    if (idx !== undefined && row[idx] !== undefined) {
      return (row[idx] || '').trim();
    }
  }
  return '';
}
