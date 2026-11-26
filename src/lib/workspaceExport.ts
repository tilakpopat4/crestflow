import { Client, Invoice, UserProfile, WorkItem } from '../types';
import { formatInvoiceNumber } from './invoiceUtils';

function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return [headerLine, ...bodyLines].join('\r\n');
}

function formatReadableDate(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatIsoDate(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '';
  return new Date(ts).toISOString();
}

export interface WorkspaceExportInput {
  profile?: Partial<UserProfile> | null;
  clients: Client[];
  workItems: WorkItem[];
  invoices: Invoice[];
}

/**
 * Generates a full workspace JSON backup without requiring an active entitlement.
 */
export function buildWorkspaceBackupJson(input: WorkspaceExportInput): string {
  const totalInvoicedInr = input.invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const paidInr = input.invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

  const safeProfile = input.profile
    ? {
        name: input.profile.name || '',
        email: input.profile.email || '',
        username: input.profile.username || '',
        professionalTitle: input.profile.professionalTitle || '',
        upiId: input.profile.upiId || '',
        phone: input.profile.phone || '',
      }
    : null;

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      currency: 'INR',
      summary: {
        clientsCount: input.clients.length,
        workItemsCount: input.workItems.length,
        invoicesCount: input.invoices.length,
        totalInvoicedInr,
        paidInr,
      },
      profile: safeProfile,
      clients: input.clients,
      workItems: input.workItems,
      invoices: input.invoices,
    },
    null,
    2,
  );
}

/**
 * Exports clients list as RFC-4180 CSV with INR rate columns and status.
 */
export function buildClientsCsv(clients: Client[]): string {
  const headers = [
    'Client ID',
    'Name',
    'Email',
    'Phone',
    'Billing Basis',
    'Default Rate',
    'Monthly Retainer',
    'Currency',
    'Status',
    'Created Date',
    'Created ISO',
  ];
  const rows = clients.map((c) => [
    c.id,
    c.name,
    c.email,
    c.phone,
    c.paymentBasis || 'per_reel',
    Number(c.defaultRate) || 0,
    Number(c.monthlyRetainerAmount) || 0,
    c.currency || 'INR',
    c.isClosed ? 'Closed' : 'Active',
    formatReadableDate(c.createdAt),
    formatIsoDate(c.createdAt),
  ]);
  return toCsv(headers, rows);
}

/**
 * Exports work items as CSV with client name, INR amounts, dates, and status.
 */
export function buildWorkItemsCsv(workItems: WorkItem[], clients: Client[]): string {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const headers = [
    'Work Item ID',
    'Date',
    'Date ISO',
    'Client Name',
    'Sub-Client',
    'Deliverable',
    'Quantity',
    'Rate (INR)',
    'Total (INR)',
    'Status',
    'Approval Status',
    'Invoice ID',
  ];
  const rows = workItems.map((w) => {
    const qty = Number(w.quantity) || 1;
    const rate = Number(w.rate) || 0;
    return [
      w.id,
      formatReadableDate(w.date),
      formatIsoDate(w.date),
      clientMap.get(w.clientId) || w.clientId,
      w.subClientName || '',
      w.description,
      qty,
      rate,
      qty * rate,
      w.status,
      w.approvalStatus || '',
      w.invoiceId || '',
    ];
  });
  return toCsv(headers, rows);
}

/**
 * Exports invoices as CSV with INR totals, dates, status, and client details.
 */
export function buildInvoicesCsv(invoices: Invoice[], clients: Client[]): string {
  const clientMap = new Map(clients.map((c) => [c.id, c.currency || 'INR']));
  const headers = [
    'Invoice ID',
    'Invoice Number',
    'Date',
    'Date ISO',
    'Client Name',
    'Client Email',
    'Currency',
    'Total Amount (INR)',
    'Status',
    'Paid Date',
    'Payee UPI ID',
  ];
  const rows = invoices.map((inv) => [
    inv.id,
    formatInvoiceNumber(inv, invoices),
    formatReadableDate(inv.date),
    formatIsoDate(inv.date),
    inv.clientName,
    inv.clientEmail || '',
    clientMap.get(inv.clientId) || 'INR',
    Number(inv.totalAmount) || 0,
    inv.status,
    formatReadableDate(inv.lastPaymentDate),
    inv.payeeUpiId || '',
  ]);
  return toCsv(headers, rows);
}

/**
 * Triggers a browser file download for exported JSON or CSV backup data.
 */
export function downloadExportFile(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
