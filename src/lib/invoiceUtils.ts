import { Invoice } from '../types';

/**
 * Formats an invoice number in CF-00001 format
 * e.g., CF-00001, CF-00002, etc.
 */
export function formatInvoiceNumber(
  invoice?: { id?: string; invoiceNumber?: string; date?: number },
  allInvoices?: { id: string; date?: number; invoiceNumber?: string }[]
): string {
  if (!invoice) return 'CF-00001';

  // 1. If explicit invoiceNumber already matching CF-00001 format
  if (invoice.invoiceNumber && /^CF-\d{5}$/i.test(invoice.invoiceNumber.trim())) {
    return invoice.invoiceNumber.trim().toUpperCase();
  }

  // 2. If id already matches CF-00001 format
  if (invoice.id && /^CF-\d{5}$/i.test(invoice.id.trim())) {
    return invoice.id.trim().toUpperCase();
  }

  // 3. If part of a list of invoices, map sequentially by creation/billing date
  if (allInvoices && allInvoices.length > 0 && invoice.id) {
    const sorted = [...allInvoices].sort((a, b) => (a.date || 0) - (b.date || 0));
    const idx = sorted.findIndex(i => i.id === invoice.id);
    if (idx !== -1) {
      return `CF-${String(idx + 1).padStart(5, '0')}`;
    }
  }

  // 4. If invoice has an invoiceNumber with digits (e.g. "1" or "INV-00001")
  if (invoice.invoiceNumber) {
    const digits = invoice.invoiceNumber.replace(/\D/g, '');
    if (digits) {
      return `CF-${digits.slice(-5).padStart(5, '0')}`;
    }
  }

  // 5. If invoice.id has numbers
  if (invoice.id) {
    const digits = invoice.id.replace(/\D/g, '');
    if (digits.length >= 1 && digits.length <= 5) {
      return `CF-${digits.padStart(5, '0')}`;
    }
    // Deterministic hash to 5-digit number
    let hash = 0;
    for (let i = 0; i < invoice.id.length; i++) {
      hash = ((hash << 5) - hash) + invoice.id.charCodeAt(i);
      hash |= 0;
    }
    const num = (Math.abs(hash) % 99999) + 1;
    return `CF-${String(num).padStart(5, '0')}`;
  }

  return 'CF-00001';
}

/**
 * Computes the next CF-00001 invoice number for a new invoice
 */
export function getNextInvoiceNumber(invoices: { id: string; date?: number; invoiceNumber?: string }[]): string {
  let maxNum = 0;
  for (const inv of invoices) {
    const candidate = inv.invoiceNumber || inv.id;
    if (candidate) {
      const match = candidate.match(/CF-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }
  }
  const nextNum = Math.max(maxNum + 1, invoices.length + 1);
  return `CF-${String(nextNum).padStart(5, '0')}`;
}
