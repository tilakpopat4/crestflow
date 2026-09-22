import React, { useState } from 'react';
import { 
  X, Check, AlertCircle, Calendar, Hash, FileText, 
  Building2, Link as LinkIcon, Info, Users, IndianRupee, Layers
} from 'lucide-react';
import { Client, Invoice, Reel, WorkItem } from '../types';

interface BulkEditWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: WorkItem[];
  clients: Client[];
  invoices: Invoice[];
  onSave: (updatedWorkItems: WorkItem[], updatedInvoices: Invoice[]) => Promise<void>;
}

export default function BulkEditWorkModal({
  isOpen,
  onClose,
  selectedItems,
  clients,
  invoices,
  onSave
}: BulkEditWorkModalProps) {
  // Field toggles
  const [updateRate, setUpdateRate] = useState(false);
  const [rateMode, setRateMode] = useState<'fixed' | 'clientDefault'>('fixed');
  const [rateValue, setRateValue] = useState('');

  const [updateDate, setUpdateDate] = useState(false);
  const [dateValue, setDateValue] = useState(new Date().toISOString().split('T')[0]);

  const [updateQuantity, setUpdateQuantity] = useState(false);
  const [quantityValue, setQuantityValue] = useState('1');

  const [updateDescription, setUpdateDescription] = useState(false);
  const [descriptionMode, setDescriptionMode] = useState<'replace' | 'append' | 'prepend'>('replace');
  const [descriptionText, setDescriptionText] = useState('');

  const [updateClient, setUpdateClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSubClientId, setSelectedSubClientId] = useState('');

  const [updateVideoUrl, setUpdateVideoUrl] = useState(false);
  const [videoUrlMode, setVideoUrlMode] = useState<'set' | 'clear'>('set');
  const [videoUrlText, setVideoUrlText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Analysis of selected items
  const invoicedItems = selectedItems.filter(i => i.status === 'Invoiced' && i.invoiceId);
  const invoicedInvoiceIds = Array.from(new Set(invoicedItems.map(i => i.invoiceId!)));
  const affectedInvoices = invoices.filter(inv => invoicedInvoiceIds.includes(inv.id));
  const hasInvoiced = invoicedItems.length > 0;

  const anyFieldEnabled = updateRate || updateDate || updateQuantity || updateDescription || updateClient || updateVideoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!anyFieldEnabled) {
      setErrorMsg("Please select at least one field toggle to bulk edit.");
      return;
    }

    if (updateRate && rateMode === 'fixed' && (rateValue === '' || isNaN(Number(rateValue)) || Number(rateValue) < 0)) {
      setErrorMsg("Please enter a valid non-negative rate.");
      return;
    }

    if (updateQuantity && (quantityValue === '' || isNaN(Number(quantityValue)) || Number(quantityValue) < 1)) {
      setErrorMsg("Please enter a valid quantity of 1 or more.");
      return;
    }

    if (updateDescription && !descriptionText.trim()) {
      setErrorMsg("Please enter description text or uncheck the description toggle.");
      return;
    }

    if (updateClient && !selectedClientId) {
      setErrorMsg("Please select a target client or uncheck the client toggle.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Clone affected invoices into a map for synchronous accumulation of reel edits
      const invoiceMap = new Map<string, Invoice>();
      affectedInvoices.forEach(inv => {
        invoiceMap.set(inv.id, JSON.parse(JSON.stringify(inv)));
      });

      const updatedWorkItems: WorkItem[] = [];

      for (const item of selectedItems) {
        let currentClientId = item.clientId;
        let currentSubClientId = item.subClientId;
        let currentSubClientName = item.subClientName;

        let clientObj = clients.find(c => c.id === currentClientId);

        if (updateClient && selectedClientId) {
          currentClientId = selectedClientId;
          clientObj = clients.find(c => c.id === selectedClientId);
          const chosenSub = clientObj?.subClients?.find(sc => sc.id === selectedSubClientId);
          currentSubClientId = chosenSub ? chosenSub.id : (selectedSubClientId || undefined);
          currentSubClientName = chosenSub ? chosenSub.name : undefined;
        }

        let rate = item.rate;
        if (updateRate) {
          if (rateMode === 'clientDefault') {
            rate = clientObj?.defaultRate ?? item.rate;
          } else {
            rate = Number(rateValue);
          }
        }

        let date = item.date;
        if (updateDate && dateValue) {
          date = new Date(dateValue).getTime();
        }

        let quantity = item.quantity;
        if (updateQuantity) {
          quantity = Number(quantityValue);
        }

        let description = item.description;
        if (updateDescription && descriptionText.trim()) {
          const trimmed = descriptionText.trim();
          if (descriptionMode === 'replace') {
            description = trimmed;
          } else if (descriptionMode === 'append') {
            description = `${item.description} ${trimmed}`.trim();
          } else if (descriptionMode === 'prepend') {
            description = `${trimmed} ${item.description}`.trim();
          }
        }

        let videoUrl = item.videoUrl;
        if (updateVideoUrl) {
          if (videoUrlMode === 'clear') {
            videoUrl = undefined;
          } else {
            videoUrl = videoUrlText.trim() || undefined;
          }
        }

        const updatedWorkItem: WorkItem = {
          ...item,
          clientId: currentClientId,
          subClientId: currentSubClientId,
          subClientName: currentSubClientName,
          rate,
          date,
          quantity,
          description,
          videoUrl
        };
        updatedWorkItems.push(updatedWorkItem);

        // If this work item is already invoiced, update the corresponding invoice reel & totals!
        if (item.status === 'Invoiced' && item.invoiceId && invoiceMap.has(item.invoiceId)) {
          const inv = invoiceMap.get(item.invoiceId)!;

          if (updateClient && clientObj) {
            inv.clientId = clientObj.id;
            inv.clientName = clientObj.name;
          }

          let matched = false;
          inv.reels = (inv.reels || []).map((reel: Reel) => {
            const isMatch =
              (reel.workItemId && reel.workItemId === item.id) ||
              reel.id === item.id ||
              (!matched &&
                reel.title === item.description &&
                reel.quantity === item.quantity &&
                reel.rate === item.rate);

            if (isMatch && !matched) {
              matched = true;
              return {
                ...reel,
                workItemId: item.id,
                title: description,
                quantity,
                rate,
                videoUrl,
                subClientId: currentSubClientId,
                subClientName: currentSubClientName
              };
            }
            return reel;
          });

          // Recalculate invoice totals
          const subtotal = inv.reels.reduce((sum, r) => sum + (r.quantity * r.rate), 0);
          const discount = inv.discountAmount || 0;
          const extraCost = inv.extraCostAmount || 0;
          inv.totalAmount = Math.max(0, subtotal - discount + extraCost);
        }
      }

      const updatedInvoicesList = Array.from(invoiceMap.values());
      await onSave(updatedWorkItems, updatedInvoicesList);
      onClose();
    } catch (err: any) {
      console.error("Failed to bulk edit:", err);
      setErrorMsg("Error saving bulk changes: " + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClientObj = clients.find(c => c.id === selectedClientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl my-8 overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Bulk Edit Work Logs
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {selectedItems.length} selected
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enable only the fields you wish to modify. Unchecked fields will remain untouched.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invoiced Sync Notification Banner */}
        {hasInvoiced && (
          <div className="mx-6 mt-5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
            <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <span className="font-bold">Automatic Invoice Sync Active:</span> {invoicedItems.length} of the {selectedItems.length} selected logs belong to {affectedInvoices.length} existing listed invoice(s). Any edits to Rate, Quantity, Description, or Sub-Client will automatically be synchronized into the line items and grand totals of their respective invoices.
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Rate Section */}
          <div className={`p-4 rounded-xl border transition-colors ${updateRate ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-sm text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={updateRate}
                onChange={(e) => setUpdateRate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <IndianRupee size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Update Rate (₹)</span>
            </label>

            {updateRate && (
              <div className="mt-3 pl-6 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="rateMode"
                      checked={rateMode === 'fixed'}
                      onChange={() => setRateMode('fixed')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Set fixed rate for all</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="rateMode"
                      checked={rateMode === 'clientDefault'}
                      onChange={() => setRateMode('clientDefault')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Reset to each client's default rate</span>
                  </label>
                </div>

                {rateMode === 'fixed' && (
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 2500"
                      value={rateValue}
                      onChange={(e) => setRateValue(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date Section */}
          <div className={`p-4 rounded-xl border transition-colors ${updateDate ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-sm text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={updateDate}
                onChange={(e) => setUpdateDate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <Calendar size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Update Date Completed</span>
            </label>

            {updateDate && (
              <div className="mt-3 pl-6 animate-fadeIn">
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="max-w-xs px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Quantity Section */}
          <div className={`p-4 rounded-xl border transition-colors ${updateQuantity ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-sm text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={updateQuantity}
                onChange={(e) => setUpdateQuantity(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <Hash size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Update Quantity</span>
            </label>

            {updateQuantity && (
              <div className="mt-3 pl-6 animate-fadeIn">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantityValue}
                  onChange={(e) => setQuantityValue(e.target.value)}
                  className="w-32 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className={`p-4 rounded-xl border transition-colors ${updateDescription ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-sm text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Update Description</span>
            </label>

            {updateDescription && (
              <div className="mt-3 pl-6 space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="descMode"
                      checked={descriptionMode === 'replace'}
                      onChange={() => setDescriptionMode('replace')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Replace completely</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="descMode"
                      checked={descriptionMode === 'append'}
                      onChange={() => setDescriptionMode('append')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Append to end</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="descMode"
                      checked={descriptionMode === 'prepend'}
                      onChange={() => setDescriptionMode('prepend')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Prefix to beginning</span>
                  </label>
                </div>

                <input
                  type="text"
                  placeholder={descriptionMode === 'replace' ? 'New description text...' : 'Text to append/prefix...'}
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Client & Sub-Client Section */}
          <div className={`p-4 rounded-xl border transition-colors ${updateClient ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-sm text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={updateClient}
                onChange={(e) => setUpdateClient(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <Building2 size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Change Client / Sub-Client</span>
            </label>

            {updateClient && (
              <div className="mt-3 pl-6 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Target Client</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        setSelectedSubClientId('');
                      }}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Choose Client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedClientObj?.subClients && selectedClientObj.subClients.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                        <Users size={11} /> Assign Sub-Client (Optional)
                      </label>
                      <select
                        value={selectedSubClientId}
                        onChange={(e) => setSelectedSubClientId(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value="">Direct Parent ({selectedClientObj.name})</option>
                        {selectedClientObj.subClients.map(sc => (
                          <option key={sc.id} value={sc.id}>
                            {sc.name} {sc.code ? `(${sc.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Deliverable Video URL Section */}
          <div className={`p-4 rounded-xl border transition-colors ${updateVideoUrl ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'}`}>
            <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-sm text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={updateVideoUrl}
                onChange={(e) => setUpdateVideoUrl(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <LinkIcon size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span>Update Video / Deliverable Link</span>
            </label>

            {updateVideoUrl && (
              <div className="mt-3 pl-6 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="videoUrlMode"
                      checked={videoUrlMode === 'set'}
                      onChange={() => setVideoUrlMode('set')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Set link URL</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="videoUrlMode"
                      checked={videoUrlMode === 'clear'}
                      onChange={() => setVideoUrlMode('clear')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Clear existing links</span>
                  </label>
                </div>

                {videoUrlMode === 'set' && (
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... or post link"
                    value={videoUrlText}
                    onChange={(e) => setVideoUrlText(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                  />
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {anyFieldEnabled ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                Ready to apply changes to {selectedItems.length} work log(s)
                {hasInvoiced ? ` & sync ${affectedInvoices.length} invoice(s)` : ''}
              </span>
            ) : (
              <span>Check at least one field toggle above to enable bulk saving</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !anyFieldEnabled}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Apply Changes ({selectedItems.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
