import { Invoice, Client, UserProfile, InvoiceDeliverable } from '../types';
import { generateUpiQrCodeDataUrl } from './upiQr';
import { preprocessElementStylesForPdf, replaceUnsupportedColorsWithRgb } from './pdfColorEngine';

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
      console.warn('Print iframe trigger error:', err);
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
      console.warn('QR DataURL generation for offscreen PDF failed:', e);
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
        console.warn('Could not attach PDF hyperlinks:', linkErr);
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
