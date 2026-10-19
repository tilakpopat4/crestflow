import { Invoice, Client, UserProfile, InvoiceDeliverable } from '../types';
import { generateUpiQrCodeDataUrl } from './upiQr';
import { preprocessElementStylesForPdf, replaceUnsupportedColorsWithRgb } from './pdfColorEngine';
import { formatInvoiceNumber } from './invoiceUtils';

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
  const invoiceNo = formatInvoiceNumber(params.invoice);

  const issueDateStr = new Date(params.invoice.date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const lastPaymentStr = params.invoice.lastPaymentDate
    ? new Date(params.invoice.lastPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : (params.client?.lastPaymentDate
      ? new Date(params.client.lastPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—');

  const senderName = params.profile?.name || 'Tilak Popat';
  const senderTitle = params.profile?.professionalTitle || params.profile?.servicesDescription || 'Video Editor';
  const senderEmail = params.profile?.email || 'you@example.com';
  const senderPhone = params.profile?.phone || '+91 00000 00000';
  const upiId = (params.customUpiId && params.customUpiId.trim())
    || (params.profile?.upiId && params.profile.upiId !== 'Not specified' ? params.profile.upiId.trim() : '')
    || 'tilakpopat2007-1@okaxis';

  const reels = params.invoice.reels || [];
  const discount = params.invoice.discountAmount || 0;
  const extraCost = params.invoice.extraCostAmount || 0;
  const grandTotal = Math.max(0, params.invoice.totalAmount);

  const isMonthlyRetainer = params.invoice.invoiceType === 'monthly_retainer';
  const invoiceTypeLabel = isMonthlyRetainer ? 'fixed' : 'per_item';
  const subtotal = isMonthlyRetainer
    ? Math.max(0, grandTotal + discount - extraCost)
    : reels.reduce((s, r) => s + (r.quantity * r.rate), 0);

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
        date: (r as any).date || params.invoice.date,
        subClientName: r.subClientName
      }))
    : [];

  const isWorkSummary = !!params.hideFinance;
  const clientName = params.client?.name || params.invoice.clientName || 'Client Name';
  const clientSubOrProject = (params.client as any)?.company || deliverablesList.find(d => d.subClientName)?.subClientName || reels.find(r => r.subClientName)?.subClientName || '';
  const clientContact = `${params.client?.email || ''}${params.client?.email && params.client?.phone ? ' | ' : ''}${params.client?.phone || ''}` || 'client@example.com';

  const allItems: any[] = isWorkSummary
    ? (deliverablesList.length > 0 ? deliverablesList : reels)
    : (isMonthlyRetainer
        ? (deliverablesList.length > 0
            ? deliverablesList
            : (reels.length > 0 && (reels.length > 1 || !reels[0]?.title?.toLowerCase().includes('retainer'))
                ? reels
                : [{ id: '1', title: reels[0]?.title || 'Monthly Video Editing & Creative Retainer', quantity: 1, rate: grandTotal, date: params.invoice.date }]))
        : (reels.length > 0 ? reels : [{ id: '1', title: 'Video Editing / Content Creation Services', quantity: 1, rate: grandTotal, date: params.invoice.date }]));

  const singlePageLimit = isWorkSummary ? 14 : 10;
  const pagesData: any[][] = [];
  if (allItems.length <= singlePageLimit) {
    pagesData.push(allItems);
  } else if (allItems.length <= 20) {
    const page1Count = Math.ceil(allItems.length / 2);
    pagesData.push(allItems.slice(0, page1Count));
    pagesData.push(allItems.slice(page1Count));
  } else {
    const page1Limit = isWorkSummary ? 15 : 11;
    const subsequentLimit = isWorkSummary ? 18 : 14;
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

    // Top Header Section
    const pageHeaderHtml = isFirstPage ? `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; box-sizing: border-box;">
          <!-- Left: Business / Freelancer Name & Contact -->
          <div style="max-width: 58%;">
            <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 21px; font-weight: 700; color: #1e293b; letter-spacing: -0.2px; line-height: 1.25;">
              ${senderName}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 400;">
              ${senderTitle}
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">
              ${senderEmail} | ${senderPhone}
            </div>
          </div>

          <!-- Right: INVOICE Title & Metadata -->
          <div style="text-align: right; min-width: 190px;">
            <div style="font-family: Georgia, 'Playfair Display', serif; font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: 2px; text-transform: uppercase; line-height: 1;">
              ${isWorkSummary ? 'WORK SUMMARY' : 'INVOICE'}
            </div>
            <div style="font-size: 11.5px; color: #1e293b; margin-top: 8px; font-weight: 600;">
              Invoice No: <span style="font-weight: 700;">${invoiceNo}</span>
            </div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">
              Date: <span style="color: #0f172a; font-weight: 500;">${issueDateStr}</span>
            </div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 3px;">
              Status: <span style="font-weight: 700; color: #1e293b; text-transform: uppercase;">${params.invoice.status ? params.invoice.status.toUpperCase() : 'PENDING'}</span>
            </div>
          </div>
        </div>

        <!-- Full-width divider -->
        <div style="border-bottom: 1px solid #cbd5e1; margin-top: 18px; margin-bottom: 18px; width: 100%;"></div>

        <!-- BILL TO & DETAILS (Two-Column Section) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
          <!-- BILL TO -->
          <div style="width: 52%;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
              B I L L &nbsp; T O
            </div>
            <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
              ${clientName}
            </div>
            ${clientSubOrProject ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">${clientSubOrProject}</div>` : ''}
            <div style="font-size: 11px; color: #64748b;">
              ${clientContact}
            </div>
          </div>

          <!-- DETAILS -->
          <div style="width: 44%; text-align: right;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
              D E T A I L S
            </div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 3px;">
              Invoice type: <span style="font-weight: 500; color: #0f172a;">${invoiceTypeLabel}</span>
            </div>
            <div style="font-size: 12px; color: #475569;">
              Last payment: <span style="font-weight: 500; color: #0f172a;">${lastPaymentStr}</span>
            </div>
          </div>
        </div>
      </div>
    ` : `
      <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
        <div>
          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${senderName}</span>
          <span style="font-size: 11px; color: #64748b; margin-left: 10px; font-weight: 600;">${invoiceNo} (Continued)</span>
        </div>
        <div style="font-size: 10.5px; font-weight: 600; color: #64748b;">
          Page ${pageIdx + 1} of ${totalPages}
        </div>
      </div>
    `;

    // Table rows
    const count = pageItems.length;

    // Dynamically calculate sizing based on number of items so work logs cover most of the page with minimal empty gap
    let rowPaddingY = 10;
    let titleFontSize = '12.5px';
    let titleLineHeight = '1.3';
    let subtitleFontSize = '11px';
    let subtitleMarginTop = '3px';
    let cellFontSize = '12px';
    let numberFontSize = '11.5px';

    if (count === 1) {
      rowPaddingY = 38;
      titleFontSize = '15.5px';
      titleLineHeight = '1.45';
      subtitleFontSize = '13px';
      subtitleMarginTop = '6px';
      cellFontSize = '14px';
      numberFontSize = '13px';
    } else if (count === 2) {
      rowPaddingY = 28;
      titleFontSize = '14.5px';
      titleLineHeight = '1.4';
      subtitleFontSize = '12px';
      subtitleMarginTop = '5px';
      cellFontSize = '13.5px';
      numberFontSize = '12.5px';
    } else if (count === 3) {
      rowPaddingY = 22;
      titleFontSize = '14px';
      titleLineHeight = '1.35';
      subtitleFontSize = '11.5px';
      subtitleMarginTop = '4px';
      cellFontSize = '13px';
      numberFontSize = '12px';
    } else if (count === 4) {
      rowPaddingY = 18;
      titleFontSize = '13.5px';
      titleLineHeight = '1.35';
      subtitleFontSize = '11px';
      subtitleMarginTop = '3px';
      cellFontSize = '12.5px';
      numberFontSize = '11.5px';
    } else if (count <= 6) {
      rowPaddingY = 14;
      titleFontSize = '13px';
      titleLineHeight = '1.3';
      subtitleFontSize = '11px';
      subtitleMarginTop = '3px';
      cellFontSize = '12px';
      numberFontSize = '11.5px';
    } else if (count <= 8) {
      rowPaddingY = 11;
      titleFontSize = '12.5px';
      titleLineHeight = '1.3';
      subtitleFontSize = '10.5px';
      subtitleMarginTop = '2px';
      cellFontSize = '12px';
      numberFontSize = '11px';
    } else if (count <= 11) {
      rowPaddingY = 8;
      titleFontSize = '12px';
      titleLineHeight = '1.25';
      subtitleFontSize = '10px';
      subtitleMarginTop = '2px';
      cellFontSize = '11.5px';
      numberFontSize = '10.5px';
    } else {
      rowPaddingY = 6;
      titleFontSize = '11px';
      titleLineHeight = '1.2';
      subtitleFontSize = '9.5px';
      subtitleMarginTop = '1px';
      cellFontSize = '11px';
      numberFontSize = '10px';
    }

    let tableRowsHtml = '';
    if (isWorkSummary) {
      tableRowsHtml = pageItems.map((item, idx) => {
        const itemIdx = itemOffset + idx;
        const itemDateStr = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : issueDateStr;
        const subOrProject = item.subClientName || clientSubOrProject;
        const subtitle = subOrProject ? `${subOrProject} · ${itemDateStr}` : itemDateStr;
        const videoLink = item.videoUrl
          ? `<a href="${item.videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; margin-left: 6px; font-size: ${subtitleFontSize};">View Asset &nearr;</a>`
          : '';
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: ${rowPaddingY}px 8px; font-size: ${numberFontSize}; color: #64748b; vertical-align: middle; width: 34px;">${itemIdx + 1}</td>
            <td style="padding: ${rowPaddingY}px 10px; vertical-align: middle;">
              <div style="font-size: ${titleFontSize}; font-weight: 700; color: #0f172a; line-height: ${titleLineHeight};">${item.title || 'Creative Deliverable'}</div>
              <div style="font-size: ${subtitleFontSize}; color: #64748b; margin-top: ${subtitleMarginTop};">
                ${subtitle} ${videoLink}
              </div>
            </td>
            <td style="padding: ${rowPaddingY}px 8px; font-size: ${cellFontSize}; color: #334155; text-align: center; vertical-align: middle; width: 50px;">${item.quantity || 1}</td>
          </tr>
        `;
      }).join('');
    } else {
      tableRowsHtml = pageItems.map((item, idx) => {
        const itemIdx = itemOffset + idx;
        const itemDateStr = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : issueDateStr;
        const subOrProject = item.subClientName || clientSubOrProject;
        const subtitle = subOrProject ? `${subOrProject} · ${itemDateStr}` : itemDateStr;
        const videoLink = item.videoUrl
          ? `<a href="${item.videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; margin-left: 6px; font-size: ${subtitleFontSize};">View Asset &nearr;</a>`
          : '';
        const itemRate = Number(item.rate) || 0;
        const itemQty = Number(item.quantity) || 1;
        const itemAmount = itemQty * itemRate;

        // When in monthly retainer mode and listing work log deliverables, items are covered under the retainer
        const isRetainerDeliverable = isMonthlyRetainer && (deliverablesList.length > 0 || (reels.length > 0 && !item.title?.toLowerCase().includes('retainer')));

        const rateDisplay = isRetainerDeliverable
          ? `<span style="color: #64748b; font-size: ${subtitleFontSize}; font-weight: 500;">Included</span>`
          : `₹ ${itemRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const amountDisplay = isRetainerDeliverable
          ? `<span style="color: #64748b; font-size: ${subtitleFontSize}; font-weight: 500;">Included</span>`
          : `₹ ${itemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: ${rowPaddingY}px 8px; font-size: ${numberFontSize}; color: #64748b; vertical-align: middle; width: 34px;">${itemIdx + 1}</td>
            <td style="padding: ${rowPaddingY}px 10px; vertical-align: middle;">
              <div style="font-size: ${titleFontSize}; font-weight: 700; color: #0f172a; line-height: ${titleLineHeight};">${item.title || 'Creative Service / Deliverable'}</div>
              <div style="font-size: ${subtitleFontSize}; color: #64748b; margin-top: ${subtitleMarginTop};">
                ${subtitle} ${videoLink}
              </div>
            </td>
            <td style="padding: ${rowPaddingY}px 8px; font-size: ${cellFontSize}; color: #334155; text-align: center; vertical-align: middle; width: 50px;">${itemQty}</td>
            <td style="padding: ${rowPaddingY}px 8px; font-size: ${cellFontSize}; color: #334155; text-align: right; vertical-align: middle; width: 90px; font-variant-numeric: tabular-nums;">${rateDisplay}</td>
            <td style="padding: ${rowPaddingY}px 8px; font-size: ${cellFontSize}; font-weight: 700; color: #0f172a; text-align: right; vertical-align: middle; width: 100px; font-variant-numeric: tabular-nums;">${amountDisplay}</td>
          </tr>
        `;
      }).join('');
    }

    // Table Header HTML
    const tableHeaderHtml = isWorkSummary ? `
      <table style="width: 100%; height: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 6px; box-sizing: border-box;">
        <thead>
          <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background: #f8fafc; height: 32px;">
            <th style="padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: left; width: 34px;">#</th>
            <th style="padding: 7px 10px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: left;">DESCRIPTION</th>
            <th style="padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: center; width: 50px;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    ` : `
      <table style="width: 100%; height: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 6px; box-sizing: border-box;">
        <thead>
          <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background: #f8fafc; height: 32px;">
            <th style="padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: left; width: 34px;">#</th>
            <th style="padding: 7px 10px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: left;">DESCRIPTION</th>
            <th style="padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: center; width: 50px;">QTY</th>
            <th style="padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: right; width: 90px;">RATE</th>
            <th style="padding: 7px 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; text-align: right; width: 100px;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    `;

    // Totals + Payment Section (Last Page only)
    let bottomSectionHtml = '';
    if (isLastPage) {
      if (isWorkSummary) {
        bottomSectionHtml = `
          <div style="border-top: 1px solid #cbd5e1; padding-top: 14px; margin-top: 16px; width: 100%; box-sizing: border-box;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin-bottom: 4px;">
              DELIVERY CONFIRMATION
            </div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.45;">
              This work summary certifies official completion and client delivery of all items and creative assets listed above.
            </div>
          </div>
        `;
      } else {
        bottomSectionHtml = `
          <div>
            <!-- Right-aligned Totals Block -->
            <div style="display: flex; justify-content: flex-end; margin-top: 8px; margin-bottom: 14px;">
              <table style="width: 290px; border-collapse: collapse; font-size: 12px;">
                <tr>
                  <td style="padding: 3px 0; color: #475569;">Subtotal</td>
                  <td style="padding: 3px 0; text-align: right; color: #0f172a; font-weight: 500; font-variant-numeric: tabular-nums;">
                    ₹ ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                ${discount > 0 ? `
                <tr>
                  <td style="padding: 3px 0; color: #475569;">
                    Discount ${params.invoice.discountDescription ? `[${params.invoice.discountDescription}]` : ''}
                  </td>
                  <td style="padding: 3px 0; text-align: right; color: #0f172a; font-weight: 500; font-variant-numeric: tabular-nums;">
                    – ₹ ${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                ` : ''}
                ${extraCost > 0 ? `
                <tr>
                  <td style="padding: 3px 0; color: #475569;">
                    Extra cost ${params.invoice.extraCostDescription ? `[${params.invoice.extraCostDescription}]` : ''}
                  </td>
                  <td style="padding: 3px 0; text-align: right; color: #0f172a; font-weight: 500; font-variant-numeric: tabular-nums;">
                    ₹ ${extraCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                ` : ''}
                <tr style="border-top: 1px solid #cbd5e1;">
                  <td style="padding: 6px 0 2px 0; font-weight: 800; font-size: 13.5px; color: #0f172a;">
                    TOTAL
                  </td>
                  <td style="padding: 6px 0 2px 0; text-align: right; font-weight: 800; font-size: 14px; color: #0f172a; font-variant-numeric: tabular-nums;">
                    ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 2px 0; font-weight: 700; font-size: 12.5px; color: #0f172a;">
                    Amount due
                  </td>
                  <td style="padding: 2px 0; text-align: right; font-weight: 700; font-size: 12.5px; color: #0f172a; font-variant-numeric: tabular-nums;">
                    ₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Bottom Payment Details & UPI QR Box (No Bank Transfer) -->
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; margin-top: 10px; padding-top: 10px; border-top: 1px solid #cbd5e1;">
              <!-- Left: Pay via UPI -->
              <div style="flex: 1; padding-right: 28px;">
                <div style="font-size: 9.5px; font-weight: 700; letter-spacing: 2px; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
                  P A Y &nbsp; V I A &nbsp; U P I
                </div>
                <div style="font-size: 12px; color: #334155; line-height: 1.6;">
                  <div>Payee: <span style="font-weight: 700; color: #0f172a;">${senderName}</span></div>
                  <div>UPI ID: <span style="font-weight: 700; color: #0f172a;">${upiId}</span></div>
                  <div>Amount: <span style="font-weight: 700; color: #0f172a;">₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div>Payment note: <span style="font-weight: 600; color: #0f172a;">${invoiceNo}</span></div>
                </div>

                <div style="margin-top: 10px; font-size: 10.5px; color: #64748b; line-height: 1.4;">
                  Scan the QR with any UPI app (Google Pay, PhonePe, Paytm, BHIM) or pay to the UPI ID above.
                </div>
              </div>

              <!-- Right: UPI QR Box (Exact 34 mm x 34 mm) -->
              <div style="width: 34mm; flex-shrink: 0; display: flex; flex-direction: column; align-items: center;">
                <div style="width: 34mm; height: 34mm; border: 1px dashed #94a3b8; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; overflow: hidden; position: relative;">
                  ${params.qrDataUrl ? `
                    <img src="${params.qrDataUrl}" style="width: 34mm; height: 34mm; object-fit: contain; display: block;" alt="Scan UPI QR" />
                  ` : `
                    <div style="text-align: center; color: #64748b; font-size: 8.5px; line-height: 1.35; padding: 2px;">
                      [Paste UPI QR here]<br/>
                      <span style="font-size: 8px; color: #94a3b8;">34 mm x 34 mm</span>
                    </div>
                  `}
                </div>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 6px; text-align: center; white-space: nowrap;">
                  Scan with any UPI app
                </div>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      bottomSectionHtml = `
        <div style="padding: 8px 12px; border-top: 1px dashed #cbd5e1; text-align: right; font-size: 10.5px; font-weight: 600; color: #64748b; margin-top: 12px;">
          Continued on Page ${pageIdx + 2} of ${totalPages} &rarr;
        </div>
      `;
    }

    // Centered Footer
    const pageFooterHtml = `
      <div style="text-align: center; margin-top: auto; padding-top: 18px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">
          Thank you for your business.
        </div>
        <div style="font-size: 10px; color: #94a3b8;">
          Page ${pageIdx + 1} of ${totalPages}
        </div>
      </div>
    `;

    return `
      <div class="pdf-page" style="width: 794px; min-height: 1123px; max-height: 1123px; padding: 38px 46px 26px 46px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; position: relative;">
        <!-- Top Section -->
        <div style="width: 100%; flex-shrink: 0;">
          ${pageHeaderHtml}
        </div>

        <!-- Work Log Section (Fills majority of the page with minimal empty gap) -->
        <div style="width: 100%; flex: 1; display: flex; flex-direction: column; min-height: 0; margin-top: 4px; margin-bottom: 8px;">
          ${tableHeaderHtml}
        </div>

        <!-- Bottom & Footer Content -->
        <div style="width: 100%; flex-shrink: 0; margin-top: auto;">
          ${bottomSectionHtml}
          ${pageFooterHtml}
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
            padding: 38px 46px 26px 46px !important;
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
  const invNo = formatInvoiceNumber(params.invoice);
  const transactionNote = `Payment for Invoice ${invNo}`;

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
