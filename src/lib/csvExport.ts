import { Client, Invoice, WorkItem } from '../types';

function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val).replace(/"/g, '""');
      return `"${str}"`;
    } catch {
      return '""';
    }
  }
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function formatDateISO(timestamp?: number | string | null): string {
  if (!timestamp) return '';
  const d = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimestampMs(timestamp?: number | string | null): number | '' {
  if (!timestamp) return '';
  const d = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return isNaN(d.getTime()) ? '' : d.getTime();
}

/**
 * Exports a single Client with all their Work Items and Invoices with 0% data loss.
 */
export function exportClientCSV(client: Client, clientWorkItems: WorkItem[], clientInvoices: Invoice[]) {
  const rows: string[] = [];

  // Report Header
  rows.push(["CRESTFLOW COMPLETE CLIENT & WORK REPORT (FULL FIDELITY)"].map(escapeCsv).join(","));
  rows.push([`Generated On: ${new Date().toISOString()}`].map(escapeCsv).join(","));
  rows.push([`Client: ${client.name} (ID: ${client.id})`].map(escapeCsv).join(","));
  rows.push("");

  // SECTION 1: CLIENT OVERVIEW & METADATA
  rows.push(["CLIENT OVERVIEW"].map(escapeCsv).join(","));
  rows.push([
    "Client ID",
    "Client Name",
    "Phone",
    "Email",
    "Payment Basis",
    "Monthly Retainer (₹)",
    "Default Reel Rate (₹)",
    "On-Site Shoot Rate (₹)",
    "Website Making Rate (₹)",
    "Last Payment Date (YYYY-MM-DD)",
    "Last Payment Timestamp (ms)",
    "Payment Cycle (Days)",
    "Email Reminders Enabled",
    "Auto Invoice Enabled",
    "Auto Invoice Schedule Type",
    "Auto Invoice Cycle Day",
    "Auto Invoice Specific Date",
    "Is Closed",
    "Closed At (ms)",
    "Created At (ISO)",
    "Created At (ms)",
    "Notes",
    "Sub-Clients Data (JSON)"
  ].map(escapeCsv).join(","));

  rows.push([
    client.id,
    client.name,
    client.phone || "",
    client.email || "",
    client.paymentBasis || "per_reel",
    client.monthlyRetainerAmount || 0,
    client.defaultRate || 0,
    client.onSiteShootRate || 0,
    client.websiteMakingRate || 0,
    formatDateISO(client.lastPaymentDate),
    formatTimestampMs(client.lastPaymentDate),
    client.paymentCycleDays || 30,
    client.emailRemindersEnabled !== false,
    !!client.autoInvoiceEnabled,
    client.autoInvoiceScheduleType || "",
    client.autoInvoiceCycleDay || "",
    client.autoInvoiceSpecificDate || "",
    !!client.isClosed,
    formatTimestampMs(client.closedAt),
    formatDateISO(client.createdAt),
    client.createdAt || "",
    client.notes || "",
    client.subClients && client.subClients.length > 0 ? JSON.stringify(client.subClients) : "[]"
  ].map(escapeCsv).join(","));

  rows.push("");

  // SECTION 2: FINANCIAL SUMMARY
  const totalWorkItems = clientWorkItems.length;
  const totalWorkAmount = clientWorkItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const totalInvoiced = clientInvoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  const paidInvoiced = clientInvoices.filter(i => i.status === 'Paid').reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  const pendingInvoiced = totalInvoiced - paidInvoiced;

  rows.push(["FINANCIAL SUMMARY"].map(escapeCsv).join(","));
  rows.push([
    "Total Work Logs",
    "Total Work Value (₹)",
    "Total Invoices",
    "Total Invoiced (₹)",
    "Paid Amount (₹)",
    "Pending Balance (₹)"
  ].map(escapeCsv).join(","));
  rows.push([
    totalWorkItems,
    totalWorkAmount,
    clientInvoices.length,
    totalInvoiced,
    paidInvoiced,
    pendingInvoiced
  ].map(escapeCsv).join(","));

  rows.push("");

  // SECTION 3: WORK HISTORY LOGS
  rows.push(["WORK HISTORY LOGS"].map(escapeCsv).join(","));
  rows.push([
    "Log ID",
    "Date (YYYY-MM-DD)",
    "Date Timestamp (ms)",
    "Client ID",
    "Sub-Client ID",
    "Sub-Client Name",
    "Description",
    "Quantity",
    "Rate (₹)",
    "Total Amount (₹)",
    "Status",
    "Invoice ID",
    "Video URL",
    "Created At (ms)"
  ].map(escapeCsv).join(","));

  if (clientWorkItems.length === 0) {
    rows.push(["No work logs recorded for this client."].map(escapeCsv).join(","));
  } else {
    const sortedWork = [...clientWorkItems].sort((a, b) => b.date - a.date);
    sortedWork.forEach(item => {
      rows.push([
        item.id,
        formatDateISO(item.date),
        formatTimestampMs(item.date),
        item.clientId,
        item.subClientId || "",
        item.subClientName || "",
        item.description,
        item.quantity,
        item.rate,
        item.quantity * item.rate,
        item.status || (item.invoiceId ? "Invoiced" : "Uninvoiced"),
        item.invoiceId || "",
        item.videoUrl || "",
        item.createdAt || ""
      ].map(escapeCsv).join(","));
    });
  }

  rows.push("");

  // SECTION 4: INVOICES SUMMARY & FULL REELS DETAILS
  rows.push(["INVOICES SUMMARY"].map(escapeCsv).join(","));
  rows.push([
    "Invoice ID",
    "Date (YYYY-MM-DD)",
    "Date Timestamp (ms)",
    "Client ID",
    "Client Name",
    "Status",
    "Invoice Type",
    "Billing Month",
    "Total Amount (₹)",
    "Discount Amount (₹)",
    "Discount Description",
    "Extra Cost Amount (₹)",
    "Extra Cost Description",
    "Last Payment Date (YYYY-MM-DD)",
    "Last Payment Timestamp (ms)",
    "Is Auto Generated",
    "Linked Work Item IDs (JSON)",
    "Reels Data (JSON)",
    "Deliverables Data (JSON)"
  ].map(escapeCsv).join(","));

  if (clientInvoices.length === 0) {
    rows.push(["No invoices generated for this client."].map(escapeCsv).join(","));
  } else {
    const sortedInvoices = [...clientInvoices].sort((a, b) => (b.date || 0) - (a.date || 0));
    sortedInvoices.forEach(inv => {
      rows.push([
        inv.id,
        formatDateISO(inv.date),
        formatTimestampMs(inv.date),
        inv.clientId,
        inv.clientName,
        inv.status,
        inv.invoiceType || "per_item",
        inv.billingMonth || "",
        inv.totalAmount || 0,
        inv.discountAmount || 0,
        inv.discountDescription || "",
        inv.extraCostAmount || 0,
        inv.extraCostDescription || "",
        formatDateISO(inv.lastPaymentDate),
        formatTimestampMs(inv.lastPaymentDate),
        !!inv.isAutoGenerated,
        inv.linkedWorkItemIds ? JSON.stringify(inv.linkedWorkItemIds) : "[]",
        inv.reels ? JSON.stringify(inv.reels) : "[]",
        inv.deliverables ? JSON.stringify(inv.deliverables) : "[]"
      ].map(escapeCsv).join(","));
    });
  }

  triggerCsvDownload(rows, `${client.name.replace(/[^a-zA-Z0-9_\-]/g, "_")}_Complete_Work_History_Invoices.csv`);
}

/**
 * Exports the Entire Workspace (all clients, all work items, all invoices) with 0% data loss.
 */
export function exportWorkspaceCSV(clients: Client[], workItems: WorkItem[], invoices: Invoice[]) {
  const rows: string[] = [];

  rows.push(["CRESTFLOW FULL WORKSPACE DATABASE BACKUP (FULL FIDELITY CSV)"].map(escapeCsv).join(","));
  rows.push([`Generated On: ${new Date().toISOString()}`].map(escapeCsv).join(","));
  rows.push([`Total Clients: ${clients.length} | Total Work Items: ${workItems.length} | Total Invoices: ${invoices.length}`].map(escapeCsv).join(","));
  rows.push("");

  // SECTION 1: ALL CLIENTS
  rows.push(["ALL CLIENTS"].map(escapeCsv).join(","));
  rows.push([
    "Client ID",
    "Client Name",
    "Phone",
    "Email",
    "Payment Basis",
    "Monthly Retainer (₹)",
    "Default Reel Rate (₹)",
    "On-Site Shoot Rate (₹)",
    "Website Making Rate (₹)",
    "Last Payment Date (YYYY-MM-DD)",
    "Last Payment Timestamp (ms)",
    "Payment Cycle (Days)",
    "Email Reminders Enabled",
    "Auto Invoice Enabled",
    "Auto Invoice Schedule Type",
    "Auto Invoice Cycle Day",
    "Auto Invoice Specific Date",
    "Is Closed",
    "Closed At (ms)",
    "Created At (ISO)",
    "Created At (ms)",
    "Notes",
    "Sub-Clients Data (JSON)"
  ].map(escapeCsv).join(","));

  clients.forEach(c => {
    rows.push([
      c.id,
      c.name,
      c.phone || "",
      c.email || "",
      c.paymentBasis || "per_reel",
      c.monthlyRetainerAmount || 0,
      c.defaultRate || 0,
      c.onSiteShootRate || 0,
      c.websiteMakingRate || 0,
      formatDateISO(c.lastPaymentDate),
      formatTimestampMs(c.lastPaymentDate),
      c.paymentCycleDays || 30,
      c.emailRemindersEnabled !== false,
      !!c.autoInvoiceEnabled,
      c.autoInvoiceScheduleType || "",
      c.autoInvoiceCycleDay || "",
      c.autoInvoiceSpecificDate || "",
      !!c.isClosed,
      formatTimestampMs(c.closedAt),
      formatDateISO(c.createdAt),
      c.createdAt || "",
      c.notes || "",
      c.subClients && c.subClients.length > 0 ? JSON.stringify(c.subClients) : "[]"
    ].map(escapeCsv).join(","));
  });

  rows.push("");

  // SECTION 2: ALL WORK ITEMS
  rows.push(["WORK HISTORY LOGS"].map(escapeCsv).join(","));
  rows.push([
    "Log ID",
    "Date (YYYY-MM-DD)",
    "Date Timestamp (ms)",
    "Client ID",
    "Sub-Client ID",
    "Sub-Client Name",
    "Description",
    "Quantity",
    "Rate (₹)",
    "Total Amount (₹)",
    "Status",
    "Invoice ID",
    "Video URL",
    "Created At (ms)"
  ].map(escapeCsv).join(","));

  const sortedWork = [...workItems].sort((a, b) => b.date - a.date);
  sortedWork.forEach(item => {
    rows.push([
      item.id,
      formatDateISO(item.date),
      formatTimestampMs(item.date),
      item.clientId,
      item.subClientId || "",
      item.subClientName || "",
      item.description,
      item.quantity,
      item.rate,
      item.quantity * item.rate,
      item.status || (item.invoiceId ? "Invoiced" : "Uninvoiced"),
      item.invoiceId || "",
      item.videoUrl || "",
      item.createdAt || ""
    ].map(escapeCsv).join(","));
  });

  rows.push("");

  // SECTION 3: ALL INVOICES
  rows.push(["INVOICES SUMMARY"].map(escapeCsv).join(","));
  rows.push([
    "Invoice ID",
    "Date (YYYY-MM-DD)",
    "Date Timestamp (ms)",
    "Client ID",
    "Client Name",
    "Status",
    "Invoice Type",
    "Billing Month",
    "Total Amount (₹)",
    "Discount Amount (₹)",
    "Discount Description",
    "Extra Cost Amount (₹)",
    "Extra Cost Description",
    "Last Payment Date (YYYY-MM-DD)",
    "Last Payment Timestamp (ms)",
    "Is Auto Generated",
    "Linked Work Item IDs (JSON)",
    "Reels Data (JSON)",
    "Deliverables Data (JSON)"
  ].map(escapeCsv).join(","));

  const sortedInvoices = [...invoices].sort((a, b) => (b.date || 0) - (a.date || 0));
  sortedInvoices.forEach(inv => {
    rows.push([
      inv.id,
      formatDateISO(inv.date),
      formatTimestampMs(inv.date),
      inv.clientId,
      inv.clientName,
      inv.status,
      inv.invoiceType || "per_item",
      inv.billingMonth || "",
      inv.totalAmount || 0,
      inv.discountAmount || 0,
      inv.discountDescription || "",
      inv.extraCostAmount || 0,
      inv.extraCostDescription || "",
      formatDateISO(inv.lastPaymentDate),
      formatTimestampMs(inv.lastPaymentDate),
      !!inv.isAutoGenerated,
      inv.linkedWorkItemIds ? JSON.stringify(inv.linkedWorkItemIds) : "[]",
      inv.reels ? JSON.stringify(inv.reels) : "[]",
      inv.deliverables ? JSON.stringify(inv.deliverables) : "[]"
    ].map(escapeCsv).join(","));
  });

  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(rows, `CrestFlow_Workspace_Backup_${dateStr}.csv`);
}

function triggerCsvDownload(rows: string[], filename: string) {
  const csvString = rows.join("\r\n");
  const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
