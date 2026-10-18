import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Client, Reel, Invoice, WorkItem, UserProfile, InvoiceDeliverable } from '../types';
import { Plus, Trash2, Download, Receipt, FileCheck, Mail, Send, Copy, X, Check, MailCheck, CheckCircle2, AlertCircle, Loader2, FileText, Search, Calculator, Divide, Coins, History, Pencil, Printer, ListChecks, IndianRupee, Archive, Clock, Sparkles, Calendar, Users } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { User } from 'firebase/auth';
import { generateUUID } from '../lib/utils';
import { generateInvoiceEmailDetails } from '../lib/paymentUtils';
import Logo from './Logo';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import ReactDOMServer from 'react-dom/server';
import { sendEmailWithPdfAttachment, acquireGmailAccessToken } from '../lib/gmailService';
import PaymentDateModal from './PaymentDateModal';
import ScheduleInvoiceModal from './ScheduleInvoiceModal';
import { executeAutoInvoiceCheck, findDuplicateAutoInvoices } from '../lib/autoInvoiceService';
import { formatLocalDateToYMD } from '../lib/dateUtils';
import StatusBadge from './StatusBadge';

// Helper functions to parse and convert oklab/oklch/color() colors to standard rgb/rgba,
// which prevents crashes in html2canvas (used by html2pdf.js) under Tailwind CSS v4.
let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

function cssColorToRgb(colorStr: string): string {
  if (typeof window === 'undefined') return colorStr;
  try {
    if (!colorCanvas) {
      colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (colorCtx) {
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = '#000000';
      colorCtx.fillStyle = colorStr;
      colorCtx.fillRect(0, 0, 1, 1);
      const data = colorCtx.getImageData(0, 0, 1, 1).data;
      const alpha = +(data[3] / 255).toFixed(2);
      if (alpha === 1) {
        return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
      } else {
        return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
      }
    }
  } catch (e) {
    // fallback
  }
  return colorStr;
}

function oklabToRgb(l_val: number, a_val: number, b_val: number): { r: number, g: number, b: number } {
  const l = l_val + 0.3963377774 * a_val + 0.2158037573 * b_val;
  const m = l_val - 0.1055613458 * a_val - 0.0638541728 * b_val;
  const s = l_val - 0.0894841775 * a_val - 1.2914855480 * b_val;

  const l_3 = l * l * l;
  const m_3 = m * m * m;
  const s_3 = s * s * s;

  let r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  let g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  let b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const gamma = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const r_res = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
  const g_res = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
  const b_res = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);

  return { r: r_res, g: g_res, b: b_res };
}

function convertOklabStringToRgb(oklabStr: string): string {
  const match = oklabStr.match(/oklab\(([^)]+)\)/);
  if (!match) return oklabStr;

  const partsStr = match[1].trim();
  const parts = partsStr.split(/[\s,/]+/);
  if (parts.length < 3) return oklabStr;

  const parseVal = (str: string, base: number = 1) => {
    if (str.endsWith('%')) {
      return (parseFloat(str) / 100) * base;
    }
    return parseFloat(str);
  };

  let l_val = parseVal(parts[0], 1);
  if (l_val > 1 && !parts[0].endsWith('%')) {
    l_val = l_val / 100;
  }

  const a_val = parseVal(parts[1], 1);
  const b_val = parseVal(parts[2], 1);

  const alphaStr = parts[3];
  const alpha = alphaStr !== undefined ? parseVal(alphaStr, 1) : 1;

  const { r, g, b } = oklabToRgb(l_val, a_val, b_val);

  if (alpha === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

function oklchToRgb(l_val: number, c_val: number, h_val: number): { r: number, g: number, b: number } {
  // h_val is in degrees, convert to radians
  const h_rad = (h_val * Math.PI) / 180;
  const a = c_val * Math.cos(h_rad);
  const b = c_val * Math.sin(h_rad);

  const l = l_val + 0.3963377774 * a + 0.2158037573 * b;
  const m = l_val - 0.1055613458 * a - 0.0638541728 * b;
  const s = l_val - 0.0894841775 * a - 1.2914855480 * b;

  const l_3 = l * l * l;
  const m_3 = m * m * m;
  const s_3 = s * s * s;

  let r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  let g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  let b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const gamma = (c: number) => {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const r_val = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
  const g_val = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
  const b_val = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);

  return { r: r_val, g: g_val, b: b_val };
}

function convertOklchStringToRgb(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(([^)]+)\)/);
  if (!match) return oklchStr;

  const partsStr = match[1].trim();
  const parts = partsStr.split(/[\s,/]+/);
  if (parts.length < 3) return oklchStr;

  const parseVal = (str: string, base: number = 1) => {
    if (str.endsWith('%')) {
      return (parseFloat(str) / 100) * base;
    }
    return parseFloat(str);
  };

  let l_val = parseVal(parts[0], 1);
  if (l_val > 1 && !parts[0].endsWith('%')) {
    l_val = l_val / 100;
  }

  const c_val = parseVal(parts[1], 1);
  const h_val = parseVal(parts[2], 1);

  const alphaStr = parts[3];
  const alpha = alphaStr !== undefined ? parseVal(alphaStr, 1) : 1;

  const { r, g, b } = oklchToRgb(l_val, c_val, h_val);

  if (alpha === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

function replaceUnsupportedColorsWithRgb(str: string): string {
  if (typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color(')) return str;

  return str.replace(/(oklab|oklch|color)\([^)]+\)/g, (match) => {
    try {
      const converted = cssColorToRgb(match);
      if (converted && converted.startsWith('rgb')) {
        return converted;
      }
      if (match.startsWith('oklab')) {
        return convertOklabStringToRgb(match);
      }
      if (match.startsWith('oklch')) {
        return convertOklchStringToRgb(match);
      }
    } catch (e) {
      console.warn("Failed to parse/convert color:", match, e);
    }
    return match;
  });
}

function preprocessElementStylesForPdf(element: HTMLElement): () => void {
  const originalStyles = new Map<HTMLElement, string>();
  const colorProperties = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'boxShadow',
    'fill',
    'stroke'
  ];

  try {
    const elements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
    for (const el of elements) {
      if (!el.style) continue;
      const computed = window.getComputedStyle(el);
      let changed = false;
      for (const prop of colorProperties) {
        try {
          const val = computed[prop as any];
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
            const converted = replaceUnsupportedColorsWithRgb(val);
            if (converted && converted !== val) {
              if (!changed) {
                originalStyles.set(el, el.getAttribute('style') || '');
                changed = true;
              }
              el.style[prop as any] = converted;
            }
          }
        } catch (e) {
          // ignore individual property errors
        }
      }
    }
  } catch (err) {
    console.warn("Failed to preprocess oklab/oklch styles on elements:", err);
  }

  return () => {
    for (const [el, style] of originalStyles.entries()) {
      try {
        if (style) {
          el.setAttribute('style', style);
        } else {
          el.removeAttribute('style');
        }
      } catch (e) {
        // ignore restore errors
      }
    }
  };
}

export function buildUpiPaymentUri(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string = 'Invoice Payment'
): string {
  const cleanUpiId = upiId.trim().replace(/\s+/g, '');
  if (!cleanUpiId) return '';

  // Clean payee name and note (sanitize characters for clean URL encoding)
  const cleanName = payeeName.replace(/[^\w\s.-]/g, '').trim() || 'Payee';
  const cleanNote = transactionNote.replace(/#/g, 'INV-').replace(/[^\w\s.-]/g, '').trim() || 'Invoice Payment';

  // Format amount: include &am= if amount > 0
  let amountQuery = '';
  if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
    const formattedAmount = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
    amountQuery = `&am=${formattedAmount}`;
  }

  // NPCI canonical UPI URI string format: upi://pay?pa=<UPI_ID>&pn=<NAME>&tn=<NOTE>&am=<AMOUNT>&cu=INR
  return `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanName)}&tn=${encodeURIComponent(cleanNote)}${amountQuery}&cu=INR`;
}

export function generateUpiQrCodeSvg(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string = 'Invoice Payment',
  size: number = 110
): string {
  const upiUri = buildUpiPaymentUri(upiId, payeeName, amount, transactionNote);
  if (!upiUri) return '';

  try {
    return ReactDOMServer.renderToString(
      React.createElement(QRCodeSVG, {
        value: upiUri,
        size: size,
        level: 'M',
        includeMargin: true,
        bgColor: '#ffffff',
        fgColor: '#000000'
      })
    );
  } catch (err) {
    console.warn("Failed to generate QRCodeSVG string:", err);
    return '';
  }
}

export async function generateUpiQrCodeDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string = 'Invoice Payment'
): Promise<{ pngDataUrl: string; canvas: HTMLCanvasElement | null }> {
  const upiUri = buildUpiPaymentUri(upiId, payeeName, amount, transactionNote);
  if (!upiUri) return { pngDataUrl: '', canvas: null };

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      canvas.style.width = '110px';
      canvas.style.height = '110px';
      canvas.style.display = 'block';

      const qrLib = (QRCode as any).toCanvas ? QRCode : (QRCode as any).default;
      if (qrLib && typeof qrLib.toCanvas === 'function') {
        qrLib.toCanvas(
          canvas,
          upiUri,
          {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
          },
          (err: any) => {
            if (!err) {
              const pngDataUrl = canvas.toDataURL('image/png');
              if (pngDataUrl && pngDataUrl.length > 100) {
                return resolve({ pngDataUrl, canvas });
              }
            }
            tryToDataUrlFallback();
          }
        );
        return;
      }
    } catch (e) {
      console.warn("toCanvas attempt failed:", e);
    }

    tryToDataUrlFallback();

    function tryToDataUrlFallback() {
      try {
        const qrLib = (QRCode as any).toDataURL ? QRCode : (QRCode as any).default;
        if (qrLib && typeof qrLib.toDataURL === 'function') {
          qrLib.toDataURL(
            upiUri,
            {
              width: 300,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#ffffff' }
            },
            (err: any, url: string) => {
              if (!err && url && url.length > 100) {
                resolve({ pngDataUrl: url, canvas: null });
              } else {
                resolve({ pngDataUrl: '', canvas: null });
              }
            }
          );
          return;
        }
      } catch (e) {
        console.warn("toDataURL fallback failed:", e);
      }
      resolve({ pngDataUrl: '', canvas: null });
    }
  });
}

export function renderDocumentHtml(params: {
  invoice: Invoice;
  client?: Client;
  profile: UserProfile | null;
  dateFrom?: string;
  dateTo?: string;
  qrDataUrl?: string;
  customUpiId?: string;
  hideFinance?: boolean;
  deliverables?: InvoiceDeliverable[];
}): string {
  const invoiceNo = params.invoice.id.length > 8
    ? `INV-${params.invoice.id.substring(0, 8).toUpperCase()}`
    : params.invoice.id.toUpperCase();

  const issueDateStr = new Date(params.invoice.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const billingPeriodStr = params.dateFrom && params.dateTo
    ? `${new Date(params.dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(params.dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : issueDateStr;

  const lastPaymentStr = params.invoice.lastPaymentDate
    ? new Date(params.invoice.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (params.client?.lastPaymentDate
      ? new Date(params.client.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A (First Cycle)');

  const senderName = params.profile?.name || 'Tilak Popat';
  const senderTitle = params.profile?.professionalTitle || params.profile?.servicesDescription || 'Freelance Video Editor';
  const senderPhone = params.profile?.phone || '+91 78749 03810';
  const upiId = (params.customUpiId && params.customUpiId.trim())
    || (params.profile?.upiId && params.profile.upiId !== 'Not specified' ? params.profile.upiId.trim() : '')
    || 'tilakpopat2007-1@okaxis';

  const reels = params.invoice.reels || [];
  const subtotal = reels.reduce((s, r) => s + (r.quantity * r.rate), 0);
  const discount = params.invoice.discountAmount || 0;
  const extraCost = params.invoice.extraCostAmount || 0;
  const grandTotal = Math.max(0, params.invoice.totalAmount);

  const isMonthlyRetainer = params.invoice.invoiceType === 'monthly_retainer';

  const deliverablesList: InvoiceDeliverable[] = (params.deliverables && params.deliverables.length > 0)
    ? params.deliverables
    : (params.invoice.deliverables && params.invoice.deliverables.length > 0)
    ? params.invoice.deliverables
    : (reels.length > 0 && reels.some(r => r.workItemId))
    ? reels.map(r => ({
        id: r.workItemId,
        title: r.title,
        quantity: r.quantity,
        videoUrl: r.videoUrl,
        date: (r as any).date || params.invoice.date
      }))
    : [];

  const totalDeliverablesCount = isMonthlyRetainer
    ? (deliverablesList.reduce((s, d) => s + (d.quantity || 1), 0) || 1)
    : reels.reduce((s, r) => s + (r.quantity || 1), 0);

  const isWorkSummary = !!params.hideFinance;
  const baseRetainerAmount = isMonthlyRetainer
    ? (reels[0]?.rate || params.invoice.totalAmount)
    : subtotal;

  const clientName = params.client?.name || params.invoice.clientName || 'Client';
  const clientPhone = params.client?.phone;
  const clientEmail = params.client?.email;

  // Determine items to paginate
  const allItems: any[] = isWorkSummary
    ? (deliverablesList.length > 0 ? deliverablesList : reels)
    : (isMonthlyRetainer ? (deliverablesList.length > 0 ? deliverablesList : [{ id: '1', title: reels[0]?.title || 'Monthly Video Editing & Creative Retainer', quantity: 1, date: params.invoice.date }]) : (reels.length > 0 ? reels : [{ id: '1', title: 'Video Editing / Content Creation Services', quantity: 1, rate: grandTotal }]));

  const singlePageLimit = isWorkSummary ? 15 : 12;

  const pagesData: any[][] = [];
  if (allItems.length <= singlePageLimit) {
    pagesData.push(allItems);
  } else if (allItems.length <= 24) {
    // 2 pages: distribute evenly across both pages for balanced layout
    const page1Count = Math.ceil(allItems.length / 2);
    pagesData.push(allItems.slice(0, page1Count));
    pagesData.push(allItems.slice(page1Count));
  } else {
    // 3+ pages:
    const page1Limit = isWorkSummary ? 18 : 15;
    const subsequentLimit = isWorkSummary ? 20 : 16;
    pagesData.push(allItems.slice(0, page1Limit));
    let remaining = allItems.slice(page1Limit);
    while (remaining.length > 0) {
      pagesData.push(remaining.slice(0, subsequentLimit));
      remaining = remaining.slice(subsequentLimit);
    }
  }

  const totalPages = pagesData.length;

  const pagesHtml = pagesData.map((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === totalPages - 1;
    const itemOffset = pagesData.slice(0, pageIdx).reduce((acc, p) => acc + p.length, 0);

    // Header HTML
    const pageHeaderHtml = isFirstPage
      ? `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 1.5px solid #0f172a; width: 100%; box-sizing: border-box;">
          <div style="display: flex; align-items: center; gap: 12px; max-width: 62%;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;">
              <rect width="512" height="512" rx="112" fill="#4f46e5" />
              <g>
                <rect x="116" y="186" width="280" height="190" rx="28" fill="#ffffff" />
                <path d="M126 146 L186 106 H386 L326 146 Z" fill="#e0e7ff" />
                <path d="M146 146 h220 v20 H146 z" fill="#ffffff" />
                <path d="M190 106 L170 146" stroke="#4338ca" stroke-width="8" stroke-linecap="round" />
                <path d="M250 106 L230 146" stroke="#4338ca" stroke-width="8" stroke-linecap="round" />
                <path d="M310 106 L290 146" stroke="#4338ca" stroke-width="8" stroke-linecap="round" />
                <circle cx="256" cy="281" r="44" fill="#4f46e5" />
                <polygon points="246,261 278,281 246,301" fill="#ffffff" />
              </g>
            </svg>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px; line-height: 1.2;">
                ${senderName}
              </div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 2px;">
                ${senderTitle}
              </div>
              ${senderPhone ? `<div style="font-size: 10.5px; color: #64748b; margin-top: 2px; font-weight: 500;">Direct: <span style="color: #334155; font-weight: 600;">${senderPhone}</span></div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; line-height: 1;">
              ${isWorkSummary ? 'WORK SUMMARY' : 'INVOICE'}
            </div>
            <div style="display: inline-block; background: #f1f5f9; border-radius: 4px; padding: 2.5px 7px; margin-top: 5px;">
              <span style="font-size: 11px; font-family: monospace; font-weight: 700; color: #334155;">#${isWorkSummary ? `WRK-${params.invoice.id.substring(0, 8).toUpperCase()}` : invoiceNo}</span>
            </div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">
              Issue Date: <span style="font-weight: 600; color: #0f172a;">${issueDateStr}</span>
            </div>
          </div>
        </div>
      `
      : `
        <div style="border-bottom: 1.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
          <div>
            <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${senderName}</span>
            <span style="font-size: 10.5px; color: #64748b; margin-left: 8px; font-family: monospace; font-weight: 600;">#${isWorkSummary ? `WRK-${params.invoice.id.substring(0, 8).toUpperCase()}` : invoiceNo} (Cont.)</span>
          </div>
          <div style="font-size: 10px; font-weight: 600; color: #64748b;">
            Page ${pageIdx + 1} of ${totalPages}
          </div>
        </div>
      `;

    // Overview Section (Page 1 only) - Structured, clean metadata card
    const pageOverviewHtml = isFirstPage
      ? `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 12px; margin-bottom: 12px; width: 100%; box-sizing: border-box; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div style="width: 50%;">
            <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 3px;">
              ${isWorkSummary ? 'PREPARED FOR' : 'BILLED TO'}
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
              ${clientName}
            </div>
            ${clientPhone ? `<div style="font-size: 10.5px; color: #475569; line-height: 1.35;">Ph: ${clientPhone}</div>` : ''}
            ${clientEmail ? `<div style="font-size: 10.5px; color: #475569; line-height: 1.35;">Email: ${clientEmail}</div>` : ''}
          </div>

          <div style="width: 48%; text-align: right;">
            <table style="margin-left: auto; font-size: 10.5px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="color: #64748b; padding: 1.5px 8px 1.5px 0; font-weight: 500; text-align: right;">${isWorkSummary ? 'Work Period:' : 'Billing Period:'}</td>
                <td style="font-weight: 600; color: #0f172a; padding: 1.5px 0; text-align: right;">${billingPeriodStr}</td>
              </tr>
              ${isWorkSummary ? `
              <tr>
                <td style="color: #64748b; padding: 1.5px 8px 1.5px 0; font-weight: 500; text-align: right;">Total Deliverables:</td>
                <td style="font-weight: 700; color: #0f172a; padding: 1.5px 0; text-align: right;">${totalDeliverablesCount} Items</td>
              </tr>
              ` : `
              <tr>
                <td style="color: #64748b; padding: 1.5px 8px 1.5px 0; font-weight: 500; text-align: right;">Payment Terms:</td>
                <td style="font-weight: 600; color: #0f172a; padding: 1.5px 0; text-align: right;">Due on Receipt</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 1.5px 8px 1.5px 0; font-weight: 500; text-align: right;">Settlement:</td>
                <td style="font-weight: 500; color: #475569; padding: 1.5px 0; text-align: right;">UPI / Bank Transfer</td>
              </tr>
              `}
            </table>
          </div>
        </div>
      `
      : '';

    // Table rows
    let tableRowsHtml = '';
    if (isWorkSummary) {
      tableRowsHtml = pageItems.map((item, idx) => {
        const itemIdx = itemOffset + idx;
        const subClientTag = item.subClientName
          ? `<span style="font-size: 9.5px; color: #64748b; font-weight: 500; margin-left: 6px;">(${item.subClientName})</span>`
          : '';
        const videoLink = item.videoUrl
          ? `<div style="margin-top: 1.5px;"><a href="${item.videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; text-underline-offset: 2px; font-size: 10px; font-weight: 500; display: inline-flex; align-items: center; gap: 2px;">View Asset &nearr;</a></div>`
          : '';
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; font-family: monospace;">${String(itemIdx + 1).padStart(2, '0')}</td>
            <td style="padding: 6px 10px; font-size: 11px; color: #0f172a; line-height: 1.35;">
              <span style="font-weight: 600;">${item.title || 'Creative Deliverable'}</span>${subClientTag}
              ${videoLink}
            </td>
            <td style="padding: 6px 8px; font-size: 10.5px; color: #334155; text-align: center; font-weight: 600;">${item.quantity || 1}</td>
          </tr>
        `;
      }).join('');
    } else if (isMonthlyRetainer) {
      tableRowsHtml = pageItems.map((d, idx) => {
        const itemIdx = itemOffset + idx;
        const dateStr = d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
        const subClientTag = d.subClientName
          ? `<span style="font-size: 9.5px; color: #64748b; font-weight: 500; margin-left: 6px;">(${d.subClientName})</span>`
          : '';
        const videoLink = d.videoUrl
          ? `<div style="margin-top: 1.5px;"><a href="${d.videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; text-underline-offset: 2px; font-size: 10px; font-weight: 500; display: inline-flex; align-items: center; gap: 2px;">View Asset &nearr;</a></div>`
          : '';
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; font-family: monospace;">${String(itemIdx + 1).padStart(2, '0')}</td>
            <td style="padding: 6px 8px; font-size: 10px; color: #64748b; text-align: left; white-space: nowrap;">${dateStr}</td>
            <td style="padding: 6px 10px; font-size: 11px; color: #0f172a; line-height: 1.35;">
              <span style="font-weight: 600;">${d.title || 'Creative Deliverable'}</span>${subClientTag}
              ${videoLink}
            </td>
            <td style="padding: 6px 8px; font-size: 10.5px; color: #334155; text-align: center; font-weight: 600;">${d.quantity || 1}</td>
          </tr>
        `;
      }).join('');
    } else {
      tableRowsHtml = pageItems.map((r, idx) => {
        const itemIdx = itemOffset + idx;
        const subClientTag = r.subClientName
          ? `<span style="font-size: 9.5px; color: #64748b; font-weight: 500; margin-left: 6px;">(${r.subClientName})</span>`
          : '';
        const videoLink = r.videoUrl
          ? `<div style="margin-top: 1.5px;"><a href="${r.videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; text-underline-offset: 2px; font-size: 10px; font-weight: 500; display: inline-flex; align-items: center; gap: 2px;">View Asset &nearr;</a></div>`
          : '';
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; font-family: monospace;">${String(itemIdx + 1).padStart(2, '0')}</td>
            <td style="padding: 6px 10px; font-size: 11px; color: #0f172a; line-height: 1.35;">
              <span style="font-weight: 600;">${r.title || 'Creative Service'}</span>${subClientTag}
              ${videoLink}
            </td>
            <td style="padding: 6px 8px; font-size: 10.5px; color: #334155; text-align: center; font-weight: 600;">${r.quantity}</td>
            <td style="padding: 6px 8px; font-size: 10.5px; color: #475569; text-align: right; font-variant-numeric: tabular-nums;">₹${(r.rate || 0).toLocaleString('en-IN')}</td>
            <td style="padding: 6px 8px; font-size: 11px; color: #0f172a; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums;">₹${((r.quantity || 1) * (r.rate || 0)).toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('');
    }

    // Table Header HTML - Professional hairline typography
    const tableHeaderHtml = isWorkSummary
      ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; box-sizing: border-box;">
          <thead>
            <tr style="border-top: 1.5px solid #0f172a; border-bottom: 1px solid #cbd5e1; background: #f8fafc;">
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: center; width: 32px;">#</th>
              <th style="padding: 6px 10px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: left;">Deliverable Description</th>
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: center; width: 44px;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      `
      : isMonthlyRetainer
      ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; box-sizing: border-box;">
          <thead>
            <tr style="border-top: 1.5px solid #0f172a; border-bottom: 1px solid #cbd5e1; background: #f8fafc;">
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: center; width: 32px;">#</th>
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: left; width: 72px;">Date</th>
              <th style="padding: 6px 10px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: left;">Deliverable Description</th>
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: center; width: 44px;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      `
      : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; box-sizing: border-box;">
          <thead>
            <tr style="border-top: 1.5px solid #0f172a; border-bottom: 1px solid #cbd5e1; background: #f8fafc;">
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: center; width: 32px;">#</th>
              <th style="padding: 6px 10px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: left;">Item Description / Service</th>
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: center; width: 44px;">Qty</th>
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: right; width: 80px;">Rate</th>
              <th style="padding: 6px 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; text-align: right; width: 90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      `;

    // Bottom section HTML
    let bottomSectionHtml = '';
    if (isLastPage) {
      if (isWorkSummary) {
        bottomSectionHtml = `
          <div style="border-top: 1.5px solid #0f172a; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-start; width: 100%; box-sizing: border-box;">
            <div style="width: 65%;">
              <div style="font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 3px;">
                CONFIRMATION & DELIVERY VERIFICATION
              </div>
              <p style="font-size: 10px; color: #64748b; line-height: 1.45; margin: 0;">
                This statement documents completion and official handoff of the creative deliverables listed above for the billing period (${billingPeriodStr}).
              </p>
            </div>
            <div style="width: 30%; text-align: right;">
              <div style="font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b;">
                ISSUED BY
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                ${senderName}
              </div>
            </div>
          </div>
        `;
      } else {
        bottomSectionHtml = `
          <div style="border-top: 1.5px solid #0f172a; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-start; width: 100%; box-sizing: border-box;">
            <!-- Left: Payment Instructions & QR -->
            <div style="width: 58%;">
              <div style="font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 6px;">
                PAYMENT SETTLEMENT DETAILS
              </div>
              <div style="display: flex; gap: 10px; align-items: flex-start; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
                <!-- Table of payment credentials -->
                <div style="flex: 1;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 10px; line-height: 1.4;">
                    <tr>
                      <td style="color: #64748b; font-weight: 500; width: 75px; padding: 1px 0;">Method:</td>
                      <td style="font-weight: 600; color: #0f172a; padding: 1px 0;">UPI / Instant Transfer</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500; padding: 1px 0;">UPI ID:</td>
                      <td style="font-family: monospace; font-weight: 700; color: #0f172a; padding: 1px 0;">${upiId}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500; padding: 1px 0;">Beneficiary:</td>
                      <td style="font-weight: 600; color: #0f172a; padding: 1px 0;">${senderName}</td>
                    </tr>
                    ${params.profile?.accountNumber ? `
                    <tr>
                      <td style="color: #64748b; font-weight: 500; padding: 1px 0;">Bank Account:</td>
                      <td style="font-family: monospace; font-weight: 600; color: #0f172a; padding: 1px 0;">${params.profile.accountNumber}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500; padding: 1px 0;">IFSC Code:</td>
                      <td style="font-weight: 600; color: #0f172a; padding: 1px 0;">${params.profile.ifscCode || ''} ${params.profile.bankName ? `(${params.profile.bankName})` : ''}</td>
                    </tr>
                    ` : ''}
                  </table>
                  <div style="font-size: 9px; color: #64748b; font-style: italic; margin-top: 5px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                    Please remit payment within 7 days. Thank you for your partnership.
                  </div>
                </div>

                <!-- QR code box -->
                <div style="width: 80px; text-align: center; flex-shrink: 0;">
                  <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px; background: #ffffff; display: inline-block;">
                    <div id="pdf-qr-wrapper" style="width: 72px; height: 72px; margin: 0 auto; background: #ffffff;">
                      ${params.qrDataUrl ? `<img src="${params.qrDataUrl}" style="width: 72px; height: 72px; border-radius: 2px; display: block; margin: 0;" alt="Scan to Pay" />` : '<div style="width: 72px; height: 72px; line-height: 72px; font-size: 8px; color: #94a3b8; text-align: center;">Scan to Pay</div>'}
                    </div>
                    <div style="font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; margin-top: 2px; text-align: center;">
                      Scan via UPI
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Totals statement -->
            <div style="width: 38%;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                <tr>
                  <td style="padding: 2.5px 0; color: #64748b; font-weight: 500;">
                    ${isMonthlyRetainer ? 'Monthly Retainer Fee' : 'Subtotal'}
                  </td>
                  <td style="padding: 2.5px 0; text-align: right; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">
                    ₹${baseRetainerAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
                ${isMonthlyRetainer ? `
                <tr>
                  <td colspan="2" style="padding-bottom: 4px; font-size: 9px; color: #64748b; line-height: 1.25;">
                    Covers all ${deliverablesList.length} deliverable(s) listed in this billing period
                  </td>
                </tr>
                ` : ''}
                ${extraCost > 0 ? `
                <tr>
                  <td style="padding: 2.5px 0; color: #0f172a; font-weight: 500;">
                    Extra Expenses (${params.invoice.extraCostDescription || 'Additional'})
                  </td>
                  <td style="padding: 2.5px 0; text-align: right; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">
                    +₹${extraCost.toLocaleString('en-IN')}
                  </td>
                </tr>
                ` : ''}
                ${discount > 0 ? `
                <tr>
                  <td style="padding: 2.5px 0; color: #dc2626; font-weight: 500;">
                    Deduction (${params.invoice.discountDescription || 'Discount'})
                  </td>
                  <td style="padding: 2.5px 0; text-align: right; font-weight: 600; color: #dc2626; font-variant-numeric: tabular-nums;">
                    -₹${discount.toLocaleString('en-IN')}
                  </td>
                </tr>
                ` : ''}
                <tr style="border-top: 1.5px solid #0f172a;">
                  <td style="padding-top: 6px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #0f172a;">
                    TOTAL AMOUNT DUE
                  </td>
                  <td style="padding-top: 6px; text-align: right; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; font-variant-numeric: tabular-nums;">
                    ₹${grandTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              </table>
            </div>
          </div>
        `;
      }
    } else {
      bottomSectionHtml = `
        <div style="padding: 6px 12px; border-top: 1px dashed #cbd5e1; text-align: right; font-size: 10px; font-weight: 600; color: #64748b; margin-bottom: 6px;">
          Continued on Page ${pageIdx + 2} of ${totalPages} &rarr;
        </div>
      `;
    }

    const pageFooterBar = `
      <div style="margin-top: 10px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 8.5px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
        <span>${isWorkSummary ? 'Official Creative Delivery Statement' : 'Official Electronic Invoice Statement'} • CrestFlow</span>
        <span>Issued on ${issueDateStr}${totalPages > 1 ? ` • Page ${pageIdx + 1} of ${totalPages}` : ''}</span>
      </div>
    `;

    return `
      <div class="pdf-page" style="width: 794px; min-height: 1123px; max-height: 1123px; padding: 28px 34px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; position: relative;">
        <!-- Top Section -->
        <div style="width: 100%;">
          ${pageHeaderHtml}
          ${pageOverviewHtml}
          ${tableHeaderHtml}
        </div>

        <!-- Bottom Section -->
        <div style="width: 100%; margin-top: auto;">
          ${bottomSectionHtml}
          ${pageFooterBar}
        </div>
      </div>
    `;
  }).join('');

  return pagesHtml;
}

export function printDocumentHtml(htmlContent: string, documentTitle: string = 'Invoice') {
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Inter, system-ui, -apple-system, sans-serif;
            color: #0f172a;
          }
          .pdf-page {
            width: 210mm !important;
            height: 296.5mm !important;
            min-height: 296.5mm !important;
            max-height: 296.5mm !important;
            padding: 24px 30px !important;
            box-sizing: border-box !important;
            page-break-after: always;
            break-after: page;
            background: #ffffff;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
          }
          .pdf-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (err) {
      console.warn("Print iframe trigger error:", err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 2000);
    }
  };

  const images = Array.from(doc.images || []);
  if (images.length === 0) {
    setTimeout(triggerPrint, 350);
  } else {
    let loaded = 0;
    const checkAllLoaded = () => {
      loaded++;
      if (loaded >= images.length) {
        setTimeout(triggerPrint, 200);
      }
    };
    images.forEach(img => {
      if (img.complete) {
        checkAllLoaded();
      } else {
        img.onload = checkAllLoaded;
        img.onerror = checkAllLoaded;
      }
    });
    setTimeout(triggerPrint, 1500);
  }
}

export async function generateOffscreenPdfBlob(params: {
  invoice: Invoice;
  client?: Client;
  profile: UserProfile | null;
  dateFrom?: string;
  dateTo?: string;
  qrCodeUrl?: string;
  customUpiId?: string;
  hideFinance?: boolean;
  deliverables?: InvoiceDeliverable[];
}): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0px';
  container.style.top = '0px';
  container.style.zIndex = '999999';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';
  container.style.padding = '0px';
  container.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';

  const senderName = params.profile?.name || 'Tilak Popat';
  const upiId = (params.customUpiId && params.customUpiId.trim())
    || (params.profile?.upiId && params.profile.upiId !== 'Not specified' ? params.profile.upiId.trim() : '')
    || 'tilakpopat2007-1@okaxis';

  const grandTotal = Math.max(0, params.invoice.totalAmount);
  const invShortId = params.invoice.id ? params.invoice.id.substring(0, 8) : 'INV';
  const transactionNote = `Payment for Invoice #${invShortId}`;

  let qrDataUrl = '';
  if (upiId && !params.hideFinance) {
    try {
      const res = await generateUpiQrCodeDataUrl(upiId, senderName, grandTotal, transactionNote);
      if (res && res.pngDataUrl) {
        qrDataUrl = res.pngDataUrl;
      }
    } catch (e) {
      console.warn("QR DataURL generation for offscreen PDF failed:", e);
    }
  }

  container.innerHTML = renderDocumentHtml({
    ...params,
    qrDataUrl
  });

  document.body.appendChild(container);

  // Ensure all images (if any) and fonts are fully decoded and rendered
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        } else if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
      } catch (err) {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
      }
    })
  );

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore
    }
  }

  // Pause to allow DOM repaint
  await new Promise(r => setTimeout(r, 200));

  const restoreStyles = preprocessElementStylesForPdf(container);

  // Helper: patch all stylesheets in the cloned document to remove oklch/oklab/color() functions
  function patchClonedDocumentStylesheets(clonedDoc: Document) {
    try {
      const sheets = Array.from(clonedDoc.styleSheets);
      for (const sheet of sheets) {
        let rules: CSSRuleList | null = null;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          try {
            if (rule instanceof CSSStyleRule || rule instanceof CSSKeyframeRule) {
              const style = (rule as any).style as CSSStyleDeclaration;
              if (!style) continue;
              for (let j = 0; j < style.length; j++) {
                const prop = style[j];
                const val = style.getPropertyValue(prop);
                if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
                  const converted = replaceUnsupportedColorsWithRgb(val);
                  if (converted !== val) {
                    style.setProperty(prop, converted, style.getPropertyPriority(prop));
                  }
                }
              }
            } else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule || (rule as any).cssRules) {
              const innerRules = (rule as any).cssRules as CSSRuleList;
              if (innerRules) {
                for (let k = 0; k < innerRules.length; k++) {
                  const inner = innerRules[k];
                  const style = (inner as any).style as CSSStyleDeclaration;
                  if (!style) continue;
                  for (let j = 0; j < style.length; j++) {
                    const prop = style[j];
                    const val = style.getPropertyValue(prop);
                    if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
                      const converted = replaceUnsupportedColorsWithRgb(val);
                      if (converted !== val) {
                        style.setProperty(prop, converted, style.getPropertyPriority(prop));
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Some rules may throw (e.g. cross-origin), skip
          }
        }
      }
    } catch (err) {
      console.warn('patchClonedDocumentStylesheets failed:', err);
    }
  }

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));
    const elementsToRender = pageElements.length > 0 ? pageElements : [container];

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    for (let i = 0; i < elementsToRender.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const el = elementsToRender[i];
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
        logging: false,
        onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
          patchClonedDocumentStylesheets(clonedDoc);
          preprocessElementStylesForPdf(clonedElement);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // Add interactive clickable hyperlinks for all <a> tags on this page
      try {
        const elRect = el.getBoundingClientRect();
        const scaleX = pdfWidth / (el.offsetWidth || 794);
        const scaleY = pdfHeight / (el.offsetHeight || 1123);
        const linkElements = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href]'));

        for (const a of linkElements) {
          const href = a.getAttribute('href');
          if (!href || href === '#' || href.startsWith('javascript:')) continue;
          const rect = a.getBoundingClientRect();
          const x = (rect.left - elRect.left) * scaleX;
          const y = (rect.top - elRect.top) * scaleY;
          const w = rect.width * scaleX;
          const h = rect.height * scaleY;

          if (w > 0 && h > 0 && typeof (pdf as any).link === 'function') {
            (pdf as any).link(x, y, w, h, { url: href });
          }
        }
      } catch (linkErr) {
        console.warn("Could not attach PDF hyperlinks:", linkErr);
      }
    }

    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } finally {
    restoreStyles();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

interface InvoiceTabProps {
  user: User | null;
  profile: UserProfile | null;
  initialSearchQuery?: string;
  onNavigateToClients?: () => void;
}

export default function InvoiceTab({ user, profile, initialSearchQuery = '', onNavigateToClients }: InvoiceTabProps) {
  const { data: clients, loading: clientsLoading, addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices, addOrUpdateItem: addInvoice, removeItem: deleteInvoice } = useFirestore<Invoice>('invoices', user?.uid);
  const { data: workItems, addOrUpdateItem: updateWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);

  const [showClosed, setShowClosed] = useState(false);
  const closedClientIds = useMemo(() => new Set(clients.filter(c => c.isClosed).map(c => c.id)), [clients]);
  const closedClientNames = useMemo(() => new Set(clients.filter(c => c.isClosed).map(c => c.name.toLowerCase())), [clients]);

  const activeInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const isClosed = closedClientIds.has(inv.clientId) || closedClientNames.has(inv.clientName.toLowerCase());
      return !isClosed;
    });
  }, [invoices, closedClientIds, closedClientNames]);

  const displayedInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const isClosed = closedClientIds.has(inv.clientId) || closedClientNames.has(inv.clientName.toLowerCase());
      if (!showClosed && isClosed) return false;
      return true;
    });
  }, [invoices, closedClientIds, closedClientNames, showClosed]);

  const totalEarnedTillToday = activeInvoices
    .filter(inv => inv.status === 'Paid')
    .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  const pendingAmount = activeInvoices
    .filter(inv => inv.status === 'Pending')
    .reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);

  const totalInvoicedAmount = activeInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const paidInvoicesCount = activeInvoices.filter(inv => inv.status === 'Paid').length;

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>(initialSearchQuery);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setInvoiceSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-01`;
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  });
  const [reels, setReels] = useState<Reel[]>([]);
  const [linkedWorkItemIds, setLinkedWorkItemIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [discountDescription, setDiscountDescription] = useState<string>('');
  const [extraCostAmount, setExtraCostAmount] = useState<string>('');
  const [extraCostDescription, setExtraCostDescription] = useState<string>('');
  const [directGrandTotalInput, setDirectGrandTotalInput] = useState<string>('');
  const [customUpiId, setCustomUpiId] = useState<string>('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [previewMode, setPreviewMode] = useState<'standard' | 'work-only'>('standard');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [invoiceBillingMode, setInvoiceBillingMode] = useState<'per_reel' | 'monthly_retainer'>('per_reel');
  const [monthlyRetainerInput, setMonthlyRetainerInput] = useState<string>('');
  const [monthlyServiceDescription, setMonthlyServiceDescription] = useState<string>('');
  const [emailModalData, setEmailModalData] = useState<{
    isOpen: boolean;
    clientName: string;
    clientEmail: string;
    subject: string;
    body: string;
    mailtoLink: string;
    monthCycleStr: string;
    invoiceNo: string;
    totalAmount: number;
    pdfBlob?: Blob;
    pdfFilename?: string;
    invoiceObj?: Invoice;
    clientObj?: Client;
    gmailStatus?: { sending: boolean; success?: boolean; error?: string; messageId?: string };
  } | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null, isOpen: boolean }>({ invoiceId: null, isOpen: false });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const effectiveReels = useMemo<Reel[]>(() => {
    if (invoiceBillingMode === 'monthly_retainer') {
      const fixedRate = Number(monthlyRetainerInput) || 0;
      const monthStr = dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const desc = monthlyServiceDescription.trim() || `Monthly Video Editing & Content Creation Retainer (${monthStr})`;
      return [{
        id: reels[0]?.id || 'monthly-retainer-item',
        title: desc,
        quantity: 1,
        rate: fixedRate
      }];
    }
    return reels;
  }, [invoiceBillingMode, monthlyRetainerInput, monthlyServiceDescription, dateFrom, reels]);

  const currentBillingDeliverables = useMemo<InvoiceDeliverable[]>(() => {
    if (!selectedClientId) return [];
    const logs = workItems.filter(w => {
      if (w.clientId !== selectedClientId) return false;
      if (linkedWorkItemIds.length > 0) {
        return linkedWorkItemIds.includes(w.id);
      }
      if (w.status !== 'Uninvoiced') return false;
      const dStr = formatLocalDateToYMD(new Date(w.date));
      return dStr >= dateFrom && dStr <= dateTo;
    });
    logs.sort((a, b) => (a.date - b.date) || (a.createdAt - b.createdAt));
    return logs.map(w => ({
      id: w.id,
      title: w.description,
      quantity: w.quantity || 1,
      videoUrl: w.videoUrl,
      date: w.date
    }));
  }, [selectedClientId, workItems, linkedWorkItemIds, dateFrom, dateTo]);

  const activeSchedulesCount = useMemo(() => {
    return clients.filter(c => !c.isClosed && c.autoInvoiceEnabled).length;
  }, [clients]);

  // Automated 6:00 AM Auto-Invoice Engine (runs background check during session)
  const autoInvoiceRef = useRef({
    clients,
    workItems,
    invoices,
    addInvoice,
    updateWorkItem,
    updateClient
  });
  autoInvoiceRef.current = {
    clients,
    workItems,
    invoices,
    addInvoice,
    updateWorkItem,
    updateClient
  };

  useEffect(() => {
    if (!user?.uid) return;

    const checkAndRunAutoInvoices = () => {
      const data = autoInvoiceRef.current;
      if (!data.clients || data.clients.length === 0) return;
      executeAutoInvoiceCheck(data).catch(err => {
        console.warn("[Auto-Invoice Engine] Background check error:", err);
      });
    };

    const initialTimer = setTimeout(checkAndRunAutoInvoices, 2000);
    const intervalId = setInterval(checkAndRunAutoInvoices, 60000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [user?.uid]);

  // Duplicate auto-generated invoice detection and clean-up
  const duplicateGroups = useMemo(() => findDuplicateAutoInvoices(invoices), [invoices]);
  const totalDuplicateCount = useMemo(() => {
    return duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);
  }, [duplicateGroups]);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  const handleCleanUpDuplicates = async () => {
    if (totalDuplicateCount === 0 || isCleaningDuplicates) return;
    const clientNames = Array.from(new Set(duplicateGroups.map(g => g.clientName))).join(', ');
    if (!window.confirm(`Clean up ${totalDuplicateCount} duplicate scheduled invoice(s) for ${clientNames}?\n\nThe first original invoice will be kept, and all redundant duplicates created will be safely deleted.`)) {
      return;
    }

    setIsCleaningDuplicates(true);
    try {
      let deleted = 0;
      for (const group of duplicateGroups) {
        for (const dup of group.duplicates) {
          await deleteInvoice(dup.id);
          deleted++;
        }
      }
      alert(`Cleaned up ${deleted} duplicate invoice(s) successfully.`);
    } catch (err) {
      console.error("Failed to clean up duplicates:", err);
      alert("An error occurred while cleaning up duplicates.");
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    if (!window.confirm(`Delete Invoice #${inv.id.substring(0, 8).toUpperCase()} for ${inv.clientName}?`)) {
      return;
    }

    try {
      await deleteInvoice(invoiceId);
      // If work items were linked to this invoice, revert them to 'Uninvoiced'
      if (inv.linkedWorkItemIds && inv.linkedWorkItemIds.length > 0) {
        for (const wId of inv.linkedWorkItemIds) {
          const w = workItems.find(item => item.id === wId);
          if (w && w.invoiceId === invoiceId) {
            await updateWorkItem({
              ...w,
              status: 'Uninvoiced',
              invoiceId: undefined
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      alert("Failed to delete invoice. Please try again.");
    }
  };

  // Dynamic preview scaling to fit any screen perfectly with zero overlapping & no content truncation
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const invoiceCaptureRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.75);
  const [actualCaptureHeight, setActualCaptureHeight] = useState<number>(1123);
  const [isZoomMode, setIsZoomMode] = useState<boolean>(false);

  useEffect(() => {
    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const containerWidth = previewContainerRef.current.clientWidth;
      // Responsive padding: 24px on mobile phones, 48px on tablets and desktop
      const padding = window.innerWidth < 640 ? 24 : 48;
      const availableWidth = Math.max(160, containerWidth - padding);
      const a4Width = 794; // 210mm in px at 96 DPI
      const computedScale = Math.min(1, Math.max(0.2, availableWidth / a4Width));
      setPreviewScale(computedScale);

      if (invoiceCaptureRef.current) {
        setActualCaptureHeight(Math.max(1123, invoiceCaptureRef.current.offsetHeight));
      }
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      ro.observe(previewContainerRef.current);
    }
    if (invoiceCaptureRef.current) {
      ro.observe(invoiceCaptureRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const toggleInvoiceStatus = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setPaymentModalState({ invoiceId: id, isOpen: true });
    }
  };

  const handleConfirmPaymentDate = async (invoiceId: string, timestamp: number | null) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) {
      const nextStatus = timestamp ? 'Paid' : 'Pending';
      const pDate = timestamp || undefined;
      // Update invoice
      await addInvoice({
        ...inv,
        status: nextStatus,
        lastPaymentDate: pDate
      });

      // Update client's lastPaymentDate for cycle logic
      if (nextStatus === 'Paid') {
        const clientObj = clients.find(c => c.id === inv.clientId || c.name === inv.clientName);
        if (clientObj && clientObj.id) {
          await updateClient({ ...clientObj, lastPaymentDate: pDate || Date.now() });
        }
      }
    }
    setPaymentModalState({ invoiceId: null, isOpen: false });
  };

  useEffect(() => {
    if (selectedClientId && dateFrom && dateTo) {
      // Find uninvoiced work items for this client in the selected date span
      const uninvoicedWork = workItems.filter(w => {
        if (w.clientId !== selectedClientId) return false;
        if (w.status !== 'Uninvoiced') return false;

        const workDate = new Date(w.date);
        const yyyy = workDate.getFullYear();
        const mm = String(workDate.getMonth() + 1).padStart(2, '0');
        const dd = String(workDate.getDate()).padStart(2, '0');
        const workDateStr = `${yyyy}-${mm}-${dd}`;

        return workDateStr >= dateFrom && workDateStr <= dateTo;
      });

      // Sort work log in ascending chronological order (earliest date first)
      uninvoicedWork.sort((a, b) => (a.date - b.date) || (a.createdAt - b.createdAt));

      if (uninvoicedWork.length > 0) {
        setReels(uninvoicedWork.map(w => ({
          id: generateUUID(),
          title: w.description,
          quantity: w.quantity,
          rate: w.rate,
          videoUrl: w.videoUrl,
          subClientId: w.subClientId,
          subClientName: w.subClientName,
          workItemId: w.id
        })));
        setLinkedWorkItemIds(uninvoicedWork.map(w => w.id));
      } else {
        setReels([{ id: generateUUID(), title: '', quantity: 1, rate: selectedClient ? selectedClient.defaultRate : 0 }]);
        setLinkedWorkItemIds([]);
      }
    }
  }, [selectedClientId, dateFrom, dateTo, workItems]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedClientId(newId);
    const clientObj = clients.find(c => c.id === newId);
    if (clientObj) {
      if (clientObj.paymentBasis === 'monthly_retainer' || (clientObj.monthlyRetainerAmount && clientObj.monthlyRetainerAmount > 0)) {
        setInvoiceBillingMode('monthly_retainer');
        setMonthlyRetainerInput(String(clientObj.monthlyRetainerAmount || clientObj.defaultRate || ''));
        const monthStr = dateFrom ? new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        setMonthlyServiceDescription(`Monthly Video Editing & Content Creation Retainer (${monthStr})`);
      } else {
        setInvoiceBillingMode('per_reel');
      }
    }
  };

  const addItem = (defaultTitle: string, defaultRate: number) => {
    setReels([
      ...reels,
      { id: generateUUID(), title: defaultTitle, quantity: 1, rate: defaultRate }
    ]);
  };

  const updateReel = (id: string, field: keyof Reel, value: string | number) => {
    setReels(reels.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeReel = (id: string) => {
    if (reels.length > 1) {
      setReels(reels.filter(r => r.id !== id));
    }
  };

  const handleApplyDirectGrandTotal = () => {
    const targetVal = Number(directGrandTotalInput);
    if (isNaN(targetVal) || directGrandTotalInput.trim() === '') {
      alert("Please enter a valid amount for the Grand Total.");
      return;
    }
    if (targetVal < 0) {
      alert("Grand total cannot be negative.");
      return;
    }

    const discount = Number(discountAmount) || 0;
    const extraCost = Number(extraCostAmount) || 0;
    const targetSubtotal = targetVal + discount - extraCost;

    if (reels.length === 0) {
      setReels([{ id: generateUUID(), title: 'Video Editing Services', quantity: 1, rate: Math.round(targetSubtotal) }]);
      return;
    }

    const n = reels.length;
    // Divide targetSubtotal cleanly into whole integer rupees across all reels
    const totalRupees = Math.round(targetSubtotal);
    const baseRupees = Math.floor(totalRupees / n);
    let remainingRupees = totalRupees - (baseRupees * n);

    const newReels = reels.map((reel, idx) => {
      const itemRupees = baseRupees + (idx < remainingRupees ? 1 : 0);
      const qty = reel.quantity > 0 ? reel.quantity : 1;
      const computedRate = Math.round(itemRupees / qty);
      return {
        ...reel,
        rate: computedRate
      };
    });

    setReels(newReels);
  };

  const roundToNearestHundred = (amount: number): number => {
    if (amount <= 0) return 0;
    // Standard hundred rounding: >150 -> 200, <150 -> 100
    const rounded = Math.round(amount / 100) * 100;
    return rounded === 0 && amount > 0 ? 100 : rounded;
  };

  const handleRoundFigures = () => {
    if (reels.length === 0) return;

    const newReels = reels.map(reel => {
      const qty = reel.quantity > 0 ? reel.quantity : 1;
      const currentLineTotal = reel.quantity * reel.rate;
      const roundedLineTotal = roundToNearestHundred(currentLineTotal);
      const newRate = Math.max(1, Math.round(roundedLineTotal / qty));
      return {
        ...reel,
        rate: newRate
      };
    });

    setReels(newReels);

    const newSubtotal = newReels.reduce((sum, r) => sum + (r.quantity * r.rate), 0);
    const discount = Number(discountAmount) || 0;
    const extraCost = Number(extraCostAmount) || 0;
    const newGrandTotal = Math.max(0, newSubtotal - discount + extraCost);
    setDirectGrandTotalInput(newGrandTotal.toString());
  };

  const calculateTotal = () => {
    if (invoiceBillingMode === 'monthly_retainer') {
      return Number(monthlyRetainerInput) || 0;
    }
    return reels.reduce((sum, reel) => sum + (reel.quantity * reel.rate), 0);
  };

  const total = calculateTotal();
  const discount = Number(discountAmount) || 0;
  const extraCost = Number(extraCostAmount) || 0;
  const grandTotal = Math.max(0, total - discount + extraCost);

  useEffect(() => {
    if (profile?.upiId && profile.upiId !== 'Not specified') {
      setCustomUpiId(profile.upiId);
    } else if (!customUpiId) {
      setCustomUpiId('tilakpopat2007-1@okaxis');
    }
  }, [profile]);

  const payeeName = profile?.name || user?.displayName || 'Tilak Popat';
  const activeUpi = customUpiId.trim() || (profile?.upiId && profile.upiId !== 'Not specified' ? profile.upiId : 'tilakpopat2007-1@okaxis');
  const activeUpiUri = buildUpiPaymentUri(activeUpi, payeeName, grandTotal, 'Invoice Payment');

  const handleEditInvoice = (inv: Invoice) => {
    setSelectedClientId(inv.clientId);
    setReels(inv.reels.map(r => ({ ...r, id: generateUUID() })));
    if (inv.invoiceType === 'monthly_retainer' || (inv.reels.length === 1 && (inv.reels[0].title.toLowerCase().includes('retainer') || inv.reels[0].title.toLowerCase().includes('monthly')))) {
      setInvoiceBillingMode('monthly_retainer');
      setMonthlyRetainerInput(String(inv.reels[0]?.rate || inv.totalAmount));
      setMonthlyServiceDescription(inv.reels[0]?.title || '');
    } else {
      setInvoiceBillingMode('per_reel');
    }
    if (inv.discountAmount !== undefined) {
      setDiscountAmount(inv.discountAmount.toString());
    } else {
      setDiscountAmount('');
    }
    setDiscountDescription(inv.discountDescription || '');

    if (inv.extraCostAmount !== undefined) {
      setExtraCostAmount(inv.extraCostAmount.toString());
    } else {
      setExtraCostAmount('');
    }
    setExtraCostDescription(inv.extraCostDescription || '');
    setDirectGrandTotalInput(inv.totalAmount.toString());
    setEditingInvoiceId(inv.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRedownloadPdf = async (inv: Invoice) => {
    const clientObj = clients.find(c => c.id === inv.clientId) || {
      id: inv.clientId,
      name: inv.clientName,
      email: '',
      phone: '',
      defaultRate: 0,
      createdAt: 0
    };
    setDownloadingPdfId(inv.id);
    try {
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: inv,
        client: clientObj,
        profile,
        customUpiId,
        deliverables: inv.deliverables
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const invNo = inv.id.length > 8 ? `INV-${inv.id.substring(0, 8).toUpperCase()}` : inv.id;
      a.download = `${invNo}_${inv.clientName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error re-downloading PDF:", e);
      alert("Failed to generate PDF download. Please try again.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handlePrintDocument = async (inv?: Invoice, clientObj?: Client, hideFinanceOverride?: boolean) => {
    const isWorkSummary = hideFinanceOverride !== undefined ? hideFinanceOverride : previewMode === 'work-only';
    const targetClient = clientObj || selectedClient;
    const targetInvoice: Invoice = inv || {
      id: generateUUID(),
      date: Date.now(),
      clientId: targetClient?.id || '',
      clientName: targetClient?.name || 'Client',
      reels: [...effectiveReels],
      totalAmount: grandTotal,
      status: 'Pending',
      invoiceType: invoiceBillingMode,
      ...(discount > 0 ? {
        discountAmount: discount,
        discountDescription: discountDescription.trim() || 'Discount'
      } : {}),
      ...(extraCost > 0 ? {
        extraCostAmount: extraCost,
        extraCostDescription: extraCostDescription.trim() || 'Extra Expenses'
      } : {})
    };

    if (!targetClient && !inv) {
      alert("Please select a client first.");
      return;
    }

    if (!inv && effectiveReels.length === 0) {
      alert("No work items found to print.");
      return;
    }

    const effectiveDeliverables = (inv?.deliverables && inv.deliverables.length > 0)
      ? inv.deliverables
      : currentBillingDeliverables;

    let qrDataUrl = '';
    const senderName = profile?.name || 'Tilak Popat';
    const upiId = (customUpiId && customUpiId.trim())
      || (profile?.upiId && profile.upiId !== 'Not specified' ? profile.upiId.trim() : '')
      || 'tilakpopat2007-1@okaxis';

    if (!isWorkSummary && upiId) {
      try {
        const invShortId = targetInvoice.id ? targetInvoice.id.substring(0, 8) : 'INV';
        const res = await generateUpiQrCodeDataUrl(upiId, senderName, targetInvoice.totalAmount, `Payment for Invoice #${invShortId}`);
        if (res && res.pngDataUrl) {
          qrDataUrl = res.pngDataUrl;
        }
      } catch (e) {
        console.warn("QR code generation for print failed:", e);
      }
    }

    const htmlContent = renderDocumentHtml({
      invoice: targetInvoice,
      client: targetClient,
      profile,
      dateFrom,
      dateTo,
      qrDataUrl,
      customUpiId,
      hideFinance: isWorkSummary,
      deliverables: effectiveDeliverables
    });

    const clientNameStr = (targetClient?.name || targetInvoice.clientName || 'Client').replace(/\s+/g, '_');
    const docPrefix = isWorkSummary ? 'Work_Summary' : 'Invoice';
    const printDocTitle = `${docPrefix}_${clientNameStr}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}`;

    printDocumentHtml(htmlContent, printDocTitle);
  };

  const handlePrintWorkSummary = (inv?: Invoice, clientObj?: Client) => {
    handlePrintDocument(inv, clientObj, true);
  };

  const handleDownloadWorkSummaryPdf = async (inv?: Invoice, clientObj?: Client) => {
    const targetClient = clientObj || selectedClient;
    const targetInvoice: Invoice = inv || {
      id: generateUUID(),
      date: Date.now(),
      clientId: targetClient?.id || '',
      clientName: targetClient?.name || 'Client',
      reels: [...effectiveReels],
      totalAmount: grandTotal,
      status: 'Pending',
      invoiceType: invoiceBillingMode
    };

    if (!targetClient && !inv) {
      alert("Please select a client first.");
      return;
    }

    if (!inv && effectiveReels.length === 0) {
      alert("No work items found to download.");
      return;
    }

    const effectiveDeliverables = (inv?.deliverables && inv.deliverables.length > 0)
      ? inv.deliverables
      : currentBillingDeliverables;

    setIsGeneratingSummary(true);
    try {
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: targetInvoice,
        client: targetClient,
        profile,
        dateFrom,
        dateTo,
        hideFinance: true,
        deliverables: effectiveDeliverables
      });

      const clientNameStr = (targetClient?.name || targetInvoice.clientName || 'Client').replace(/\s+/g, '_');
      const filename = `Work_Summary_${clientNameStr}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (e: any) {
      console.error("Error generating work summary PDF:", e);
      alert("Failed to generate Work Summary PDF: " + (e?.message || String(e)));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedClient) {
      alert("Please select a client first.");
      return;
    }

    const targetReels = invoiceBillingMode === 'monthly_retainer' ? effectiveReels : reels;

    if (targetReels.some(r => !r.title.trim())) {
      alert("Please provide a title for the invoice items.");
      return;
    }

    if (invoiceBillingMode === 'monthly_retainer' && (!monthlyRetainerInput || Number(monthlyRetainerInput) <= 0)) {
      alert("Please enter a valid monthly retainer amount.");
      return;
    }

    setIsGenerating(true);

    try {
      const deliverablesSnapshot: InvoiceDeliverable[] = currentBillingDeliverables.map(d => ({
        id: d.id,
        title: d.title,
        quantity: d.quantity,
        videoUrl: d.videoUrl,
        date: d.date
      }));

      const newInvoice: Invoice = {
        id: generateUUID(),
        date: Date.now(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        reels: [...targetReels],
        totalAmount: grandTotal,
        status: 'Pending',
        invoiceType: invoiceBillingMode,
        billingMonth: new Date(dateFrom).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        linkedWorkItemIds: [...linkedWorkItemIds],
        deliverables: invoiceBillingMode === 'monthly_retainer' ? deliverablesSnapshot : undefined,
        ...(selectedClient.lastPaymentDate ? { lastPaymentDate: selectedClient.lastPaymentDate } : {}),
        ...(discount > 0 ? {
          discountAmount: discount,
          discountDescription: discountDescription.trim() || 'Discount/Deduction'
        } : {}),
        ...(extraCost > 0 ? {
          extraCostAmount: extraCost,
          extraCostDescription: extraCostDescription.trim() || 'Extra Expenses'
        } : {})
      };

      const filename = `Invoice_${selectedClient.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;

      // 1. Generate crisp, unscaled offscreen PDF blob
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: newInvoice,
        client: selectedClient,
        profile,
        dateFrom,
        dateTo,
        customUpiId,
        deliverables: invoiceBillingMode === 'monthly_retainer' ? deliverablesSnapshot : undefined
      });

      // 2. Trigger browser download
      try {
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.warn("Blob download fallback:", e);
      }

      // 3. Save invoice to cloud storage
      await addInvoice(newInvoice);

      // 4. Mark linked work items as invoiced
      for (const workId of linkedWorkItemIds) {
        const workItem = workItems.find(w => w.id === workId);
        if (workItem) {
          await updateWorkItem({ ...workItem, status: 'Invoiced', invoiceId: newInvoice.id });
        }
      }

      // 5. Clear form selection
      setReels([{ id: generateUUID(), title: '', quantity: 1, rate: selectedClient.defaultRate }]);
      setLinkedWorkItemIds([]);
      setDiscountAmount('');
      setDiscountDescription('');
      setExtraCostAmount('');
      setExtraCostDescription('');

      // 6. Generate email details for this specific invoice
      const emailDetails = generateInvoiceEmailDetails(selectedClient, newInvoice, profile, dateFrom, dateTo);
      const targetClientEmail = selectedClient.email ? selectedClient.email.trim() : '';
      let initialGmailStatus: { sending: boolean; success?: boolean; error?: string; messageId?: string } = { sending: false };

      if (targetClientEmail) {
        initialGmailStatus = { sending: true };
        sendEmailWithPdfAttachment({
          to: targetClientEmail,
          subject: emailDetails.subject,
          bodyText: emailDetails.body,
          pdfBlob: pdfBlob,
          pdfFilename: filename
        }).then(res => {
          if (res.success) {
            setEmailModalData(prev => prev ? {
              ...prev,
              gmailStatus: { sending: false, success: true, messageId: res.id }
            } : null);
          } else {
            setEmailModalData(prev => prev ? {
              ...prev,
              gmailStatus: { sending: false, success: false, error: res.error }
            } : null);
          }
        });
      }

      setEmailModalData({
        isOpen: true,
        clientName: selectedClient.name,
        clientEmail: targetClientEmail,
        subject: emailDetails.subject,
        body: emailDetails.body,
        mailtoLink: emailDetails.mailtoLink,
        monthCycleStr: emailDetails.monthCycleStr,
        invoiceNo: emailDetails.invoiceNo,
        totalAmount: grandTotal,
        pdfBlob: pdfBlob,
        pdfFilename: filename,
        invoiceObj: newInvoice,
        clientObj: selectedClient,
        gmailStatus: initialGmailStatus
      });

    } catch (err: any) {
      console.error("PDF generation / save error:", err);
      alert("An error occurred while generating or saving the PDF: " + (err?.message || String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendGmailManual = async () => {
    if (!emailModalData) return;
    const recipient = emailModalData.clientEmail.trim();
    if (!recipient) {
      alert("Please enter a recipient email address.");
      return;
    }

    setIsSendingGmail(true);
    setEmailModalData(prev => prev ? { ...prev, gmailStatus: { sending: true } } : null);

    try {
      let currentPdfBlob = emailModalData.pdfBlob;
      if (!currentPdfBlob && emailModalData.invoiceObj) {
        currentPdfBlob = await generateOffscreenPdfBlob({
          invoice: emailModalData.invoiceObj,
          client: emailModalData.clientObj,
          profile,
          deliverables: emailModalData.invoiceObj.deliverables
        });
      }

      const token = await acquireGmailAccessToken();
      const res = await sendEmailWithPdfAttachment({
        to: recipient,
        subject: emailModalData.subject,
        bodyText: emailModalData.body,
        pdfBlob: currentPdfBlob,
        pdfFilename: emailModalData.pdfFilename || `Invoice_${emailModalData.invoiceNo}.pdf`,
        accessToken: token
      });

      if (res.success) {
        setEmailModalData(prev => prev ? {
          ...prev,
          pdfBlob: currentPdfBlob,
          gmailStatus: { sending: false, success: true, messageId: res.id }
        } : null);
      } else {
        setEmailModalData(prev => prev ? {
          ...prev,
          gmailStatus: { sending: false, success: false, error: res.error }
        } : null);
      }
    } catch (err: any) {
      console.error("Gmail manual send error:", err);
      setEmailModalData(prev => prev ? {
        ...prev,
        gmailStatus: { sending: false, success: false, error: err?.message || String(err) }
      } : null);
    } finally {
      setIsSendingGmail(false);
    }
  };

  if (clientsLoading) {
    return <div className="p-8 max-w-[1600px] mx-auto text-center py-20"><div className="animate-pulse flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div></div></div>;
  }

  const effectiveScale = isZoomMode ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.9 : 1) : previewScale;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Invoice Generator</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Create and export client invoices.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            title="Schedule automatic morning 6:00 AM invoice generation for clients"
          >
            <Clock size={16} className="text-indigo-200" />
            <span>Schedule Auto-Invoice</span>
            {activeSchedulesCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/20 text-white">
                {activeSchedulesCount} Active
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Column - Form */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={18} className="text-indigo-500" />
                Invoice Details
              </h3>
              {editingInvoiceId && (
                <button
                  type="button"
                  onClick={() => setEditingInvoiceId(null)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Exit edit mode and reset"
                >
                  <Pencil size={11} /> Editing Mode <X size={12} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Client *</label>
                <select
                  className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 outline-none transition-colors focus:border-indigo-500"
                  value={selectedClientId}
                  onChange={handleClientChange}
                >
                  <option value="" disabled>-- Choose a saved client --</option>
                  {clients.filter(c => !c.isClosed || c.id === selectedClientId).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.isClosed ? ' (Closed)' : ''}{c.autoInvoiceEnabled ? ' (⏰ 6 AM Auto)' : ''}
                    </option>
                  ))}
                </select>
                {selectedClient?.autoInvoiceEnabled && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                      Auto-invoicing active at 6:00 AM
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="font-bold underline hover:text-indigo-900 dark:hover:text-indigo-200 cursor-pointer"
                    >
                      Edit Schedule
                    </button>
                  </div>
                )}
                {clients.length === 0 && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-3">
                    <span>No clients available. Add a client first to generate an invoice.</span>
                    {onNavigateToClients && (
                      <button
                        type="button"
                        onClick={onNavigateToClients}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        Add Client
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date From *</label>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 outline-none transition-colors focus:border-indigo-500"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date To *</label>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-slate-50 outline-none transition-colors focus:border-indigo-500"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            {/* Billing Mode Switcher */}
            {selectedClient?.paymentBasis === 'monthly_retainer' ? (
              <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Monthly Retainer Client
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Single flat retainer fee per billing cycle.
                    </span>
                  </div>
                </div>
                {selectedClient?.monthlyRetainerAmount && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
                    ₹{selectedClient.monthlyRetainerAmount.toLocaleString('en-IN')}/mo
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-6 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setInvoiceBillingMode('per_reel')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    invoiceBillingMode === 'per_reel'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Per Reel / Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceBillingMode('monthly_retainer');
                    if (!monthlyRetainerInput && selectedClient?.monthlyRetainerAmount) {
                      setMonthlyRetainerInput(String(selectedClient.monthlyRetainerAmount));
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    invoiceBillingMode === 'monthly_retainer'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Monthly Retainer</span>
                </button>
              </div>
            )}

            {invoiceBillingMode === 'monthly_retainer' ? (
              /* Monthly Retainer Section */
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Monthly Retainer Mode
                    </span>
                  </div>
                  {selectedClient?.monthlyRetainerAmount && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
                      Default: ₹{selectedClient.monthlyRetainerAmount.toLocaleString('en-IN')}/mo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2">
                  <div className="md:col-span-8">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Service / Retainer Description
                    </label>
                    <input
                      type="text"
                      value={monthlyServiceDescription}
                      onChange={(e) => setMonthlyServiceDescription(e.target.value)}
                      placeholder="e.g. Monthly Video Production & Editing Retainer"
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fixed Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={monthlyRetainerInput}
                        onChange={(e) => setMonthlyRetainerInput(e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full pl-7 pr-3 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Included Deliverables List (Rates Hidden) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Included Work Deliverables ({currentBillingDeliverables.length})
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Rates hidden • Included in retainer
                    </span>
                  </div>
                  {currentBillingDeliverables.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-1.5 px-2.5 font-semibold w-8 text-center">#</th>
                            <th className="py-1.5 px-2 font-semibold w-24">Date</th>
                            <th className="py-1.5 px-2 font-semibold">Deliverable Description</th>
                            <th className="py-1.5 px-2 font-semibold text-center w-12">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {currentBillingDeliverables.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="py-1.5 px-2.5 text-center text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                              <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">
                                {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                              </td>
                              <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                                <div>{item.title}</div>
                                {item.videoUrl && (
                                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 underline truncate block max-w-xs">
                                    {item.videoUrl}
                                  </a>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                                {item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                      No uninvoiced deliverables in this date span.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Per-Item Line Items */
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Line Items</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => addItem('', selectedClient ? selectedClient.defaultRate : 0)}
                      className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold underline hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Reel
                    </button>
                    <button
                      onClick={() => addItem('On Site Shoot', selectedClient?.onSiteShootRate || 0)}
                      className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold underline hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add On Site Shoot
                    </button>
                    <button
                      onClick={() => addItem('Website Making', selectedClient?.websiteMakingRate || 0)}
                      className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold underline hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Website
                    </button>
                  </div>
                </div>

                {/* Quick Set Direct Grand Total */}
                <div className="mb-5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator size={15} className="text-indigo-600 dark:text-indigo-400" />
                        Direct Grand Total Split
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Enter target grand total to divide equally across all {reels.length} item{reels.length === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 10000"
                          value={directGrandTotalInput}
                          onChange={(e) => setDirectGrandTotalInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyDirectGrandTotal();
                            }
                          }}
                          className="w-full pl-7 pr-2 py-1.5 text-sm font-semibold border border-indigo-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                        <button
                          type="button"
                          onClick={handleApplyDirectGrandTotal}
                          className="w-full sm:w-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Divide grand total into clean whole numbers equally"
                        >
                          <Divide size={13} className="shrink-0" />
                          <span className="truncate">Split Equally</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRoundFigures}
                          className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Round prices to nearest hundred (>150 rounds to 200, <150 rounds to 100)"
                        >
                          <Coins size={13} className="shrink-0" />
                          <span className="truncate">Round Figures</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {reels.map((reel, index) => (
                    <div key={reel.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-100 dark:border-slate-700/60 relative group">
                      {reels.length > 1 && (
                        <button
                          onClick={() => removeReel(reel.id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={reel.title}
                            onChange={(e) => updateReel(reel.id, 'title', e.target.value)}
                            placeholder="e.g. Wedding Highlight Reel"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-12">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Content / Video URL (Optional)</label>
                          <input
                            type="url"
                            value={reel.videoUrl || ''}
                            onChange={(e) => updateReel(reel.id, 'videoUrl', e.target.value)}
                            placeholder="e.g. https://instagram.com/reel/... or drive link"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={reel.quantity}
                            onChange={(e) => updateReel(reel.id, 'quantity', Number(e.target.value))}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-6 md:col-span-4">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={reel.rate}
                            onChange={(e) => updateReel(reel.id, 'rate', Number(e.target.value))}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-4 flex flex-col justify-end">
                          <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium text-right text-slate-900 dark:text-slate-100 bg-slate-100/50 dark:bg-slate-900/50">
                            ₹{(reel.quantity * reel.rate).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Adjustments Fields */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Adjustments (Optional)</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Extra Cost Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Stock footage, Travel"
                    value={extraCostDescription}
                    onChange={(e) => setExtraCostDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Extra Cost Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={extraCostAmount}
                    onChange={(e) => setExtraCostAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Deduction Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Early payment discount"
                    value={discountDescription}
                    onChange={(e) => setDiscountDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Deduction Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white outline-none transition-colors focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details (Optional) */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payment & Settlement (UPI)</h4>
                <span className="text-[11px] text-slate-400">Included on Invoice</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">UPI ID for Payment QR</label>
                <input
                  type="text"
                  placeholder="e.g. username@bank"
                  value={customUpiId}
                  onChange={(e) => setCustomUpiId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none transition-colors focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>{invoiceBillingMode === 'monthly_retainer' ? 'Monthly Retainer' : 'Subtotal'}</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              {extraCost > 0 && (
                <div className="flex justify-between items-center text-sm text-slate-700 font-medium">
                  <span>Extra Cost ({extraCostDescription.trim() || 'Additional Expenses'})</span>
                  <span>+₹{extraCost.toLocaleString('en-IN')}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between items-center text-sm text-rose-500 font-medium">
                  <span>Deduction ({discountDescription.trim() || 'Discount'})</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Grand Total</span>
                  <button
                    type="button"
                    onClick={handleRoundFigures}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                    title="Round item prices to nearest hundred (>150 -> 200, <150 -> 100)"
                  >
                    <Coins size={12} />
                    Round Figures
                  </button>
                </div>
                <span className="text-2xl font-bold text-slate-900">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !selectedClient}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Full Invoice...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download PDF Invoice
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintDocument(undefined, undefined, false)}
                  disabled={!selectedClient || effectiveReels.length === 0}
                  className="flex justify-center items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  title="Print official invoice statement"
                >
                  <Printer size={14} className="text-slate-400" />
                  Print Invoice
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintWorkSummary()}
                  disabled={!selectedClient || effectiveReels.length === 0}
                  className="flex justify-center items-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:bg-slate-100 text-slate-700 dark:text-slate-200 disabled:text-slate-400 px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
                  title="Print work deliverables list without financial details"
                >
                  <ListChecks size={14} className="text-slate-600 dark:text-slate-300" />
                  Print Summary
                </button>
              </div>
            </div>
          </div>


        </div>

        {/* Right Column - A4 Preview Wrapper */}
        <div 
          ref={previewContainerRef}
          className="xl:col-span-7 bg-slate-200 dark:bg-slate-900/80 p-3 sm:p-5 md:p-6 rounded-xl flex flex-col items-center shadow-inner min-h-[400px] border border-slate-300 dark:border-slate-800 relative w-full overflow-x-auto touch-pan-x touch-pan-y scrollbar-thin"
        >
          
          {/* Preview Mode Switcher & Quick Print Header */}
          <div className="w-full max-w-[210mm] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Preview:</span>
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewMode('standard')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'standard'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Receipt size={13} /> Full Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('work-only')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewMode === 'work-only'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ListChecks size={13} /> Deliverables
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsZoomMode(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    !isZoomMode
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Fit to screen width"
                >
                  Fit ({Math.round(previewScale * 100)}%)
                </button>
                <button
                  type="button"
                  onClick={() => setIsZoomMode(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isZoomMode
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Actual size with horizontal and vertical scroll"
                >
                  100% Zoom
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePrintDocument()}
                disabled={!selectedClient || effectiveReels.length === 0}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                title={previewMode === 'work-only' ? 'Print Work Summary' : 'Print Invoice'}
              >
                <Printer size={13} className="text-slate-400" /> {previewMode === 'work-only' ? 'Print Summary' : 'Print Invoice'}
              </button>
            </div>
          </div>

          {/* Scaled A4 Preview Box that takes dynamic measured dimensions and prevents truncation */}
          <div 
            className="w-full flex justify-center items-start transition-all duration-200 ease-out py-1"
            style={{
              height: `${Math.round(actualCaptureHeight * effectiveScale)}px`,
              minHeight: `${Math.round(actualCaptureHeight * effectiveScale)}px`
            }}
          >
            <div
              style={{
                width: `${Math.round(794 * effectiveScale)}px`,
                height: `${Math.round(actualCaptureHeight * effectiveScale)}px`,
                position: 'relative',
                overflow: 'visible'
              }}
              className="shadow-2xl rounded-sm shrink-0"
            >
              {/* The actual A4 element captured for live preview */}
              <div
                ref={invoiceCaptureRef}
                id="invoice-preview-capture"
                className="bg-white relative flex flex-col justify-between"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '16mm 18mm',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
              <div>
                {/* Top Accent Strip & Header */}
                <div className="flex justify-between items-start border-b-1.5 border-slate-900 pb-5 mb-6">
                  {/* Left Branding */}
                  <div className="w-2/3 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Logo className="w-9 h-9 rounded-lg shrink-0 shadow-2xs" />
                      <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                          {profile?.name || user?.displayName || 'Video Production Studio'}
                        </h1>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                          {profile?.professionalTitle || profile?.servicesDescription || 'Professional Video Editing & Content Creation'}
                        </p>
                      </div>
                    </div>
                    {profile?.phone && (
                      <p className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">Direct:</span>
                        <span className="text-slate-700 font-medium">{profile.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Right Invoice / Work Summary Title */}
                  <div className="w-1/3 text-right flex flex-col items-end">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-wider uppercase">
                      {previewMode === 'work-only' ? 'WORK SUMMARY' : 'INVOICE'}
                    </h2>
                    <div className="inline-block bg-slate-100 rounded px-2.5 py-0.5 mt-1.5">
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        #{previewMode === 'work-only' ? 'WRK' : 'INV'}-{String(invoices.length + 1).padStart(4, '0')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1.5">
                      Issue Date: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Billed To / Prepared For & Summary Overview */}
                <div className="grid grid-cols-2 gap-6 p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-6">
                  {/* Client Info */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                      {previewMode === 'work-only' ? 'Prepared For' : 'Billed To'}
                    </span>
                    {selectedClient ? (
                      <div>
                        <p className="font-bold text-sm text-slate-900">{selectedClient.name}</p>
                        {selectedClient.phone && (
                          <p className="text-xs text-slate-600 font-medium mt-0.5">Ph: {selectedClient.phone}</p>
                        )}
                        {selectedClient.email && (
                          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">Email: {selectedClient.email}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Select a client to preview {previewMode === 'work-only' ? 'work details' : 'invoice details'}
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  <div className="text-right flex flex-col justify-center">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-end gap-3 items-center">
                        <span className="text-slate-500 font-medium">{previewMode === 'work-only' ? 'Work Period:' : 'Billing Period:'}</span>
                        <span className="font-semibold text-slate-900">
                          {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {previewMode === 'work-only' ? (
                        <div className="flex justify-end gap-3 items-center">
                          <span className="text-slate-500 font-medium">Total Deliverables:</span>
                          <span className="font-bold text-slate-900">
                            {effectiveReels.reduce((s, r) => s + (r.quantity || 1), 0)} Item(s)
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end gap-3 items-center">
                            <span className="text-slate-500 font-medium">Payment Terms:</span>
                            <span className="font-semibold text-slate-900">Due on Receipt</span>
                          </div>
                          <div className="flex justify-end gap-3 items-center">
                            <span className="text-slate-500 font-medium">Settlement:</span>
                            <span className="font-medium text-slate-700">UPI / Bank Transfer</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-t-1.5 border-b border-slate-900 bg-slate-50/70 text-slate-700">
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 w-10 text-center">#</th>
                        {invoiceBillingMode === 'monthly_retainer' && (
                          <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 w-20 text-left">Date</th>
                        )}
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500">
                          {previewMode === 'work-only' || invoiceBillingMode === 'monthly_retainer' ? 'Deliverable Description' : 'Item Description / Service'}
                        </th>
                        <th className={`py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-center ${previewMode === 'work-only' || invoiceBillingMode === 'monthly_retainer' ? 'w-16' : 'w-14'}`}>
                          Qty
                        </th>
                        {previewMode !== 'work-only' && invoiceBillingMode !== 'monthly_retainer' && (
                          <>
                            <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right w-24">Rate</th>
                            <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-slate-500 text-right w-28">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceBillingMode === 'monthly_retainer' ? (
                        currentBillingDeliverables.length > 0 ? (
                          currentBillingDeliverables.map((d, idx) => (
                            <tr key={d.id || idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-3 text-xs font-mono font-medium text-slate-400 text-center">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                                {d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">
                                <div>{d.title || <span className="text-slate-400 italic font-normal">Deliverable...</span>}</div>
                                {d.videoUrl && (
                                  <div className="mt-0.5">
                                    <a
                                      href={d.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                                      title={d.videoUrl}
                                    >
                                      <span>View Deliverable</span>
                                      <span className="text-[10px]">↗</span>
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-center font-medium text-slate-700">
                                {d.quantity || 1}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-xs font-mono font-medium text-slate-400 text-center">01</td>
                            <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">
                              <div>{monthlyServiceDescription || 'Monthly Video Editing & Creative Retainer'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-center font-medium text-slate-700">
                              1 Month
                            </td>
                          </tr>
                        )
                      ) : (
                        effectiveReels.map((reel, idx) => (
                          <tr key={reel.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-xs font-mono font-medium text-slate-400 text-center">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">
                              <div>
                                {reel.title || <span className="text-slate-400 italic font-normal">Item description...</span>}
                                {reel.subClientName && (
                                  <span className="text-[11px] font-normal text-slate-500 ml-1.5">({reel.subClientName})</span>
                                )}
                              </div>
                              {reel.videoUrl && (
                                <div className="mt-0.5">
                                  <a
                                    href={reel.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
                                    title={reel.videoUrl}
                                  >
                                    <span>View Deliverable</span>
                                    <span className="text-[10px]">↗</span>
                                  </a>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-center font-medium text-slate-700">
                              {reel.quantity}
                            </td>
                            {previewMode !== 'work-only' && (
                              <>
                                <td className="py-2.5 px-3 text-xs text-right font-normal text-slate-600 tabular-nums">
                                  ₹{reel.rate.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-right font-semibold text-slate-900 tabular-nums">
                                  ₹{(reel.quantity * reel.rate).toLocaleString('en-IN')}
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {invoiceBillingMode === 'monthly_retainer' && previewMode !== 'work-only' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 flex justify-between items-center text-xs avoid-break">
                    <div>
                      <span className="font-semibold text-slate-900 block">Monthly Retainer Package</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Fixed monthly fee covering all creative deliverables across this billing cycle.
                      </p>
                    </div>
                    <span className="text-slate-600 font-medium">
                      {currentBillingDeliverables.length} Deliverable(s) Included
                    </span>
                  </div>
                )}

                {/* Totals Section (For Full Invoice) OR Deliverables Summary (For Work Summary) */}
                {previewMode === 'work-only' ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-6 flex justify-between items-center text-xs avoid-break">
                    <div>
                      <span className="font-semibold text-slate-900 block">Deliverables Summary</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Completed for <strong className="text-slate-800">{selectedClient?.name || 'Client'}</strong> ({dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${new Date(dateTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Current Cycle'})
                      </p>
                    </div>
                    <span className="text-slate-700 font-semibold">
                      Completed ({invoiceBillingMode === 'monthly_retainer' ? currentBillingDeliverables.length : effectiveReels.reduce((s, r) => s + (r.quantity || 1), 0)} items)
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-end mb-6 avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="w-72 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center py-1 text-slate-600">
                        <span className="font-medium text-slate-500">
                          {invoiceBillingMode === 'monthly_retainer' ? 'Monthly Retainer Fee' : 'Subtotal'}
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                      </div>

                      {extraCost > 0 && (
                        <div className="flex justify-between items-center py-1 text-slate-700">
                          <span className="font-medium text-slate-600">
                            Extra Cost {extraCostDescription ? `(${extraCostDescription})` : ''}
                          </span>
                          <span className="font-semibold tabular-nums">+₹{extraCost.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between items-center py-1 text-red-600">
                          <span className="font-medium">
                            Deduction {discountDescription ? `(${discountDescription})` : ''}
                          </span>
                          <span className="font-semibold tabular-nums">-₹{discount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-baseline pt-2.5 border-t-1.5 border-slate-900 mt-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 block">Total Due</span>
                          <span className="text-[10px] text-slate-500 font-normal">Due on Receipt</span>
                        </div>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">₹{grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Details & QR Code (Full Invoice) OR Verification Statement (Work Summary) */}
              <div className="border-t-1.5 border-slate-900 pt-5 mt-6 avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {previewMode === 'work-only' ? (
                  <div className="flex justify-between items-start gap-6">
                    <div className="w-2/3 space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                        Verification & Delivery Confirmation
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        This statement confirms completion and official delivery of the listed creative deliverables for the specified date period.
                      </p>
                    </div>
                    <div className="w-1/3 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prepared By</span>
                      <span className="font-bold text-slate-900 text-sm">{profile?.name || user?.displayName || 'Video Editor'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-5 items-start">
                    <div className="col-span-8">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                        Payment Settlement Details
                      </span>
                      <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs text-slate-800">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Method</span>
                            <span className="font-medium text-slate-900">UPI / Instant Bank Transfer</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">UPI ID</span>
                            <span className="font-mono font-semibold text-slate-900">{activeUpi}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Payee Beneficiary</span>
                            <span className="font-medium text-slate-900">{profile?.name || user?.displayName || 'Video Editor'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Terms</span>
                            <span className="font-medium text-slate-800">Due Upon Receipt (Net 7)</span>
                          </div>
                          {profile?.accountNumber && (
                            <>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Bank Account No</span>
                                <span className="font-mono font-semibold text-slate-900">{profile.accountNumber}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase block">IFSC / Bank</span>
                                <span className="font-semibold text-slate-900">{profile.ifscCode || ''} {profile.bankName ? `(${profile.bankName})` : ''}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/60 mt-2">
                          Please process payment within 7 days of receiving this invoice.
                        </p>
                      </div>
                    </div>

                    {/* Right Column: QR Code */}
                    <div className="col-span-4 flex flex-col items-center justify-center">
                      <div className="bg-white p-2.5 border border-slate-200 rounded-lg flex flex-col items-center shadow-2xs">
                        {activeUpiUri ? (
                          <div className="p-0.5 bg-white rounded flex items-center justify-center">
                            <QRCodeSVG
                              value={activeUpiUri}
                              size={88}
                              level="M"
                              includeMargin={false}
                              bgColor="#ffffff"
                              fgColor="#0f172a"
                              className="w-[88px] h-[88px] block"
                            />
                          </div>
                        ) : (
                          <div className="w-[88px] h-[88px] bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 font-medium">
                            Scan to Pay
                          </div>
                        )}
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1.5">
                          Scan via UPI
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Signature & Verification Note */}
                <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>{previewMode === 'work-only' ? 'Official Work Delivery Summary • CrestFlow' : 'Official Electronic Invoice Statement • CrestFlow'}</span>
                  <span>Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Invoice History & Email Actions Section */}
      <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Receipt size={20} className="text-indigo-600 dark:text-indigo-400" />
              Invoice History & Email Dispatch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              View generated cycle invoices and resend email notifications with itemized work details.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Local Invoice Search Bar */}
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Filter invoices or client..."
                className="w-full bg-slate-50 dark:bg-slate-900 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {invoiceSearchQuery && (
                <button
                  onClick={() => setInvoiceSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {closedClientIds.size > 0 && (
              <button
                type="button"
                onClick={() => setShowClosed(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  showClosed
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={showClosed ? "Hide invoices of closed clients" : "Show invoices of closed clients"}
              >
                <Archive size={12} />
                {showClosed ? 'Hide Closed' : `Show Closed (${closedClientIds.size})`}
              </button>
            )}

            <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded shrink-0">
              {displayedInvoices.length} Invoices
            </span>
          </div>
        </div>

        {displayedInvoices.length === 0 ? (
          <div className="py-12 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-500 dark:text-slate-400 space-y-3 max-w-md mx-auto my-4 bg-white dark:bg-slate-800 shadow-xs">
            <Receipt className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No invoices generated yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {clients.length === 0
                  ? "Add a client first, then create invoices with payment QR codes and breakdown."
                  : "Choose a client in the generator above and click 'Download PDF Invoice'."}
              </p>
            </div>
            {clients.length === 0 && onNavigateToClients && (
              <button
                type="button"
                onClick={onNavigateToClients}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Users size={13} /> Add First Client
              </button>
            )}
          </div>
        ) : (
          <>
            {totalDuplicateCount > 0 && (
              <div className="mb-4 p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{totalDuplicateCount} duplicate scheduled invoice(s)</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    detected for {Array.from(new Set(duplicateGroups.map(g => g.clientName))).join(', ')}
                  </span>
                </div>
                <button
                  onClick={handleCleanUpDuplicates}
                  disabled={isCleaningDuplicates}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors cursor-pointer border-none disabled:opacity-50 self-start sm:self-auto shrink-0"
                  title="Keep the original first invoice and safely remove duplicates"
                >
                  {isCleaningDuplicates ? 'Cleaning up...' : `Clean Up ${totalDuplicateCount} Duplicate(s)`}
                </button>
              </div>
            )}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">Invoice No / Date</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Items / Summary</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Email Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                {displayedInvoices
                  .filter(inv => {
                    if (!invoiceSearchQuery.trim()) return true;
                    const q = invoiceSearchQuery.toLowerCase().trim();
                    const invNo = inv.id.substring(0, 8).toLowerCase();
                    const itemsText = inv.reels ? inv.reels.map(r => r.title).join(' ').toLowerCase() : '';
                    return inv.clientName.toLowerCase().includes(q) ||
                      invNo.includes(q) ||
                      itemsText.includes(q);
                  })
                  .slice()
                  .sort((a, b) => b.date - a.date)
                  .map((inv) => {
                    const clientObj = clients.find(c => c.id === inv.clientId) || {
                      id: inv.clientId,
                      name: inv.clientName,
                      email: '',
                      phone: '',
                      defaultRate: 0,
                      createdAt: 0
                    };

                    const emailDetails = generateInvoiceEmailDetails(clientObj, inv, profile);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span>#{inv.id.substring(0, 8).toUpperCase()}</span>
                            {inv.isAutoGenerated && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                title="Auto-generated on scheduled date at 6:00 AM"
                              >
                                <Sparkles size={10} className="text-indigo-500" />
                                Auto 6 AM
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-900 dark:text-slate-100">
                          <div>{inv.clientName}</div>
                          {clientObj.email && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">{clientObj.email}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {inv.invoiceType === 'monthly_retainer' ? '1 Retainer' : `${inv.reels.length} item(s)`}
                            </span>
                            {inv.invoiceType === 'monthly_retainer' && (
                              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                                Monthly Retainer
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">
                            {inv.reels.map(r => r.title).join(', ')}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-center">
                          <StatusBadge
                            status={inv.status}
                            onClick={() => toggleInvoiceStatus(inv.id)}
                            title={`Click to mark as ${inv.status === 'Paid' ? 'Pending' : 'Paid & update last payment date'}`}
                          />
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditInvoice(inv)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-slate-500 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Load invoice into generator to edit"
                            >
                              <Pencil size={13} /> Edit
                            </button>

                            <button
                              onClick={() => handleRedownloadPdf(inv)}
                              disabled={downloadingPdfId === inv.id}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Re-download PDF Invoice file"
                            >
                              {downloadingPdfId === inv.id ? (
                                <Loader2 size={13} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Download size={13} className="text-slate-600 dark:text-slate-300" />
                              )}
                              PDF
                            </button>

                            <button
                              onClick={() => handlePrintDocument(inv, clientObj, false)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Print official invoice statement"
                            >
                              <Printer size={13} className="text-slate-600 dark:text-slate-300" />
                              Print
                            </button>

                            <button
                              onClick={async () => {
                                const pdfFilename = `Invoice_${clientObj.name.replace(/\s+/g, '_')}_${inv.id.substring(0, 8)}.pdf`;
                                let pdfBlob: Blob | undefined = undefined;
                                try {
                                  pdfBlob = await generateOffscreenPdfBlob({
                                    invoice: inv,
                                    client: clientObj,
                                    profile,
                                    deliverables: inv.deliverables
                                  });
                                } catch (e) {
                                  console.warn("Could not pre-generate PDF blob for history invoice:", e);
                                }

                                setEmailModalData({
                                  isOpen: true,
                                  clientName: inv.clientName,
                                  clientEmail: clientObj.email || '',
                                  subject: emailDetails.subject,
                                  body: emailDetails.body,
                                  mailtoLink: emailDetails.mailtoLink,
                                  monthCycleStr: emailDetails.monthCycleStr,
                                  invoiceNo: inv.id.substring(0, 8).toUpperCase(),
                                  totalAmount: inv.totalAmount,
                                  pdfFilename: pdfFilename,
                                  pdfBlob: pdfBlob,
                                  invoiceObj: inv,
                                  clientObj: clientObj,
                                  gmailStatus: { sending: false }
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                              title="Send Invoice PDF via Gmail"
                            >
                              <Mail size={13} /> Send via Gmail
                            </button>

                            <a
                              href={emailDetails.mailtoLink}
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                              title="Open Default Mail App"
                            >
                              <Send size={13} />
                            </a>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`Subject: ${emailDetails.subject}\n\n${emailDetails.body}`);
                                alert(`Invoice email details for ${inv.clientName} copied to clipboard!`);
                              }}
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Copy Email Text to Clipboard"
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs transition-colors cursor-pointer border-none bg-transparent"
                              title="Delete Invoice"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              {invoices.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <td colSpan={3} className="p-3.5 text-right font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Earned (Paid Invoices):
                    </td>
                    <td className="p-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      ₹{totalEarnedTillToday.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="p-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      {paidInvoicesCount} Paid ({invoices.length} total)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

        {/* Last Bar: Total Earned Till Today */}
        <div className="mt-6 bg-slate-900 text-white rounded-xl p-5 md:p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
              <IndianRupee size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-md">
                  Lifetime Revenue
                </span>
                <span className="text-xs text-slate-400">Paid Invoices Till Today</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white">
                Total Earned Till Today:{' '}
                <span className="text-indigo-400">₹{totalEarnedTillToday.toLocaleString('en-IN')}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Paid Invoices</span>
              <span className="text-base font-bold text-white">
                {paidInvoicesCount} <span className="text-xs font-normal text-slate-400">of {invoices.length}</span>
              </span>
            </div>
            {pendingAmount > 0 && (
              <div className="text-left md:text-right border-l border-slate-800 pl-4 sm:pl-6">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pending Clearance</span>
                <span className="text-base font-bold text-white">
                  ₹{pendingAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="text-left md:text-right border-l border-slate-800 pl-4 sm:pl-6">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Invoiced</span>
              <span className="text-base font-bold text-white">
                ₹{totalInvoicedAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Email Sent / Prepared Modal */}
      {emailModalData && emailModalData.isOpen && (
        <div
          onClick={() => setEmailModalData(null)}
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                  <MailCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Invoice Email & Gmail Delivery for {emailModalData.clientName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cycle: <span className="font-semibold text-slate-700">{emailModalData.monthCycleStr}</span> • Amount: <span className="font-bold text-slate-900">₹{emailModalData.totalAmount.toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEmailModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Gmail Live Status Banner */}
            {emailModalData.gmailStatus?.sending ? (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5 font-medium">
                <Loader2 size={16} className="animate-spin text-indigo-600 shrink-0" />
                <span>Sending Invoice PDF directly to <strong>{emailModalData.clientEmail || 'client'}</strong> via Gmail API...</span>
              </div>
            ) : emailModalData.gmailStatus?.success ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="text-indigo-600 w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">Invoice PDF successfully sent via Gmail!</p>
                    <p className="text-[11px] text-slate-600">Delivered to <strong>{emailModalData.clientEmail}</strong> with PDF attached.</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-medium px-2 py-0.5 rounded">Gmail API</span>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" /> Gmail Automatic Delivery Status:
                  </p>
                  {emailModalData.gmailStatus?.error && (
                    <span className="text-[10px] text-red-600 font-mono font-semibold max-w-xs truncate" title={emailModalData.gmailStatus.error}>
                      {emailModalData.gmailStatus.error}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {emailModalData.clientEmail
                    ? "Click 'Send Invoice PDF via Gmail' below to authorize Gmail and send the attached PDF directly to your client."
                    : "Please enter your client's email address below, then click 'Send Invoice PDF via Gmail'."}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Client Email Address *</label>
                  <input
                    type="email"
                    value={emailModalData.clientEmail}
                    onChange={e => setEmailModalData({ ...emailModalData, clientEmail: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                {emailModalData.pdfFilename && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Attached Document</span>
                      <span className="text-[11px] text-slate-500 font-medium">Included in Gmail Send</span>
                    </label>
                    <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono text-slate-700 h-[38px]">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <FileText size={14} className="text-rose-500 shrink-0" />
                        <span className="truncate">{emailModalData.pdfFilename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {emailModalData.pdfBlob && (
                          <button
                            type="button"
                            onClick={() => {
                              if (emailModalData.pdfBlob) {
                                const url = URL.createObjectURL(emailModalData.pdfBlob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = emailModalData.pdfFilename || 'Invoice.pdf';
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-sans text-[11px] font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Download Invoice PDF file"
                          >
                            <Download size={12} className="text-indigo-600" /> Save PDF
                          </button>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded">
                          PDF
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Subject</label>
                <input
                  type="text"
                  value={emailModalData.subject}
                  onChange={e => setEmailModalData({ ...emailModalData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Email Message Body</label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${emailModalData.subject}\n\n${emailModalData.body}`);
                      alert("Invoice email content copied to clipboard!");
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Copy size={12} /> Copy Text
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={emailModalData.body}
                  onChange={e => setEmailModalData({ ...emailModalData, body: e.target.value })}
                  className="w-full p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Target: <strong className="text-slate-700">{emailModalData.clientEmail || 'No email entered'}</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEmailModalData(null)}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>

                <a
                  href={emailModalData.mailtoLink}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Open Default Mail App"
                >
                  <Send size={15} />
                </a>

                <button
                  type="button"
                  onClick={handleSendGmailManual}
                  disabled={isSendingGmail || emailModalData.gmailStatus?.sending}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  {isSendingGmail || emailModalData.gmailStatus?.sending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending via Gmail...
                    </>
                  ) : (
                    <>
                      <Mail size={14} />
                      Send Invoice PDF via Gmail
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const modalInv = invoices.find(i => i.id === paymentModalState.invoiceId);
        return (
          <PaymentDateModal
            isOpen={paymentModalState.isOpen}
            onClose={() => setPaymentModalState({ invoiceId: null, isOpen: false })}
            onConfirm={(timestamp) => handleConfirmPaymentDate(paymentModalState.invoiceId!, timestamp)}
            onUnmark={() => handleConfirmPaymentDate(paymentModalState.invoiceId!, null)}
            defaultDate={modalInv?.lastPaymentDate}
            isAlreadyPaid={modalInv?.status === 'Paid'}
            invoiceNumber={paymentModalState.invoiceId?.substring(0, 8).toUpperCase()}
          />
        );
      })()}

      <ScheduleInvoiceModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        clients={clients}
        workItems={workItems}
        invoices={invoices}
        initialClientId={selectedClientId || undefined}
        onUpdateClient={updateClient}
        onAddInvoice={addInvoice}
        onUpdateWorkItem={updateWorkItem}
      />
    </div>
  );
}
