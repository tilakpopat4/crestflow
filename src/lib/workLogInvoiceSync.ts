import { Invoice, WorkItem } from '../types';

/**
 * Updates an invoice when an invoiced work item is edited.
 */
export function syncWorkItemToInvoice(
  invoice: Invoice,
  existingWork: WorkItem,
  formData: { description: string; quantity: number; rate: number; videoUrl?: string; subClientId?: string; subClientName?: string }
): Invoice {
  if (invoice.invoiceType === 'monthly_retainer' && invoice.deliverables) {
    const updatedDeliverables = invoice.deliverables.map((deliv: any) => {
      const isMatch = deliv.id === existingWork.id || deliv.workItemId === existingWork.id;
      return isMatch
        ? {
            ...deliv,
            title: formData.description,
            quantity: formData.quantity,
            subClientId: formData.subClientId,
            subClientName: formData.subClientName,
            videoUrl: formData.videoUrl,
          }
        : deliv;
    });
    return { ...invoice, deliverables: updatedDeliverables };
  }

  if (invoice.reels) {
    let replaced = false;
    const updatedReels = invoice.reels.map((reel: any) => {
      const isMatch =
        (reel.workItemId && reel.workItemId === existingWork.id) ||
        (!replaced &&
          reel.title === existingWork.description &&
          reel.quantity === existingWork.quantity &&
          reel.rate === existingWork.rate);
      if (isMatch && !replaced) {
        replaced = true;
        return {
          ...reel,
          workItemId: existingWork.id,
          title: formData.description,
          quantity: formData.quantity,
          rate: formData.rate,
          subClientId: formData.subClientId,
          subClientName: formData.subClientName,
          videoUrl: formData.videoUrl,
        };
      }
      return reel;
    });

    const newSubtotal = updatedReels.reduce((sum: number, r: any) => sum + r.quantity * r.rate, 0);
    const newTotal = Math.max(
      0,
      newSubtotal - (invoice.discountAmount || 0) + (invoice.extraCostAmount || 0)
    );
    return { ...invoice, reels: updatedReels, totalAmount: newTotal };
  }

  return invoice;
}

/**
 * Removes a deleted work item from an invoice.
 * Returns the updated invoice, or null if no line items remain.
 */
export function removeWorkItemFromInvoice(
  invoice: Invoice,
  deletedWork: WorkItem
): Invoice | null {
  if (!invoice.reels) return invoice;

  let matched = false;
  const updatedReels = invoice.reels.filter((reel: any) => {
    const isMatch =
      (reel.workItemId && reel.workItemId === deletedWork.id) ||
      (!matched &&
        reel.title === deletedWork.description &&
        reel.quantity === deletedWork.quantity &&
        reel.rate === deletedWork.rate);
    if (isMatch && !matched) {
      matched = true;
      return false;
    }
    return true;
  });

  if (updatedReels.length === 0) {
    return null;
  }

  const newSubtotal = updatedReels.reduce((sum: number, r: any) => sum + r.quantity * r.rate, 0);
  const newTotal = Math.max(
    0,
    newSubtotal - (invoice.discountAmount || 0) + (invoice.extraCostAmount || 0)
  );
  return { ...invoice, reels: updatedReels, totalAmount: newTotal };
}
