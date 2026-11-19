import { useState } from 'react';
import { Invoice, Client, UserProfile } from '../types';
import { generateOffscreenPdfBlob } from '../lib/invoiceRenderer';
import { sendEmailWithPdfAttachment, acquireGmailAccessToken } from '../lib/gmailService';
import { formatInvoiceNumber } from '../lib/invoiceUtils';

interface UseInvoicePdfOperationsOptions {
  profile: UserProfile | null;
  customUpiId: string;
  invoices: Invoice[];
  clients: Client[];
  emailModalData: any;
  setEmailModalData: (val: any) => void;
}

/**
 * Handles offscreen PDF generation, downloads, and Gmail dispatch for invoices.
 */
export function useInvoicePdfOperations({
  profile,
  customUpiId,
  invoices,
  clients,
  emailModalData,
  setEmailModalData,
}: UseInvoicePdfOperationsOptions) {
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [isSendingGmail, setIsSendingGmail] = useState(false);

  const handleRedownloadPdf = async (inv: Invoice) => {
    const clientObj = clients.find((c) => c.id === inv.clientId) || {
      id: inv.clientId,
      name: inv.clientName,
      email: '',
      phone: '',
      defaultRate: 0,
      createdAt: 0,
    };
    setDownloadingPdfId(inv.id);
    try {
      const pdfBlob = await generateOffscreenPdfBlob({
        invoice: inv,
        client: clientObj,
        profile,
        customUpiId,
        deliverables: inv.deliverables,
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formatInvoiceNumber(inv, invoices)}_${inv.clientName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF download.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleSendGmailManual = async () => {
    if (!emailModalData?.clientEmail?.trim()) return alert('Please enter recipient email.');
    setIsSendingGmail(true);
    setEmailModalData((prev: any) => (prev ? { ...prev, gmailStatus: { sending: true } } : null));
    try {
      const res = await sendEmailWithPdfAttachment({
        to: emailModalData.clientEmail.trim(),
        subject: emailModalData.subject,
        bodyText: emailModalData.body,
        pdfBlob: emailModalData.pdfBlob,
        pdfFilename: emailModalData.pdfFilename || 'Invoice.pdf',
      });
      setEmailModalData((prev: any) =>
        prev ? { ...prev, gmailStatus: { sending: false, success: res.success, error: res.error, messageId: res.id } } : null
      );
    } catch (e: any) {
      setEmailModalData((prev: any) =>
        prev ? { ...prev, gmailStatus: { sending: false, success: false, error: e?.message || String(e) } } : null
      );
    } finally {
      setIsSendingGmail(false);
    }
  };

  return {
    downloadingPdfId,
    isSendingGmail,
    handleRedownloadPdf,
    handleSendGmailManual,
  };
}
