import React from 'react';
import { IndianRupee, Loader2 } from 'lucide-react';
import { Client, Reel, InvoiceDeliverable } from '../../types';
import { Button } from '@/components/ui/button';
import { DateInput } from '../DateInput';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import InvoiceLineItemsEditor from './InvoiceLineItemsEditor';
import InvoiceRetainerDeliverablesList from './InvoiceRetainerDeliverablesList';

interface InvoiceFormCardProps {
  clients: Client[];
  selectedClientId: string;
  dateFrom: string;
  dateTo: string;
  invoiceBillingMode: 'per_reel' | 'monthly_retainer';
  monthlyRetainerInput: string;
  monthlyServiceDescription: string;
  effectiveReels: Reel[];
  currentBillingDeliverables?: InvoiceDeliverable[];
  discountAmount: string;
  discountDescription: string;
  extraCostAmount: string;
  extraCostDescription: string;
  directGrandTotalInput: string;
  customUpiId: string;
  editingInvoiceId: string | null;
  isGenerating: boolean;
  total: number;
  discount: number;
  extraCost: number;
  grandTotal: number;
  onClientChange: (clientId: string) => void;
  setDateFrom: (val: string) => void;
  setDateTo: (val: string) => void;
  setInvoiceBillingMode: (mode: 'per_reel' | 'monthly_retainer') => void;
  setMonthlyRetainerInput: (val: string) => void;
  setMonthlyServiceDescription: (val: string) => void;
  onAddItem: (title: string, rate: number) => void;
  onUpdateReel: (id: string, field: keyof Reel, value: string | number) => void;
  onRemoveReel: (id: string) => void;
  setDiscountAmount: (val: string) => void;
  setDiscountDescription: (val: string) => void;
  setExtraCostAmount: (val: string) => void;
  setExtraCostDescription: (val: string) => void;
  setDirectGrandTotalInput: (val: string) => void;
  onApplyGrandTotal: () => void;
  onRoundFigures: () => void;
  setCustomUpiId: (val: string) => void;
  onGenerateInvoice: () => Promise<void>;
  onCancelEdit: () => void;
}

/**
 * Invoice creator and editor form card.
 */
export function InvoiceFormCard({
  clients,
  selectedClientId,
  dateFrom,
  dateTo,
  invoiceBillingMode,
  monthlyRetainerInput,
  monthlyServiceDescription,
  effectiveReels,
  currentBillingDeliverables,
  discountAmount,
  discountDescription,
  extraCostAmount,
  extraCostDescription,
  customUpiId,
  editingInvoiceId,
  isGenerating,
  discount,
  grandTotal,
  onClientChange, setDateFrom, setDateTo, setInvoiceBillingMode, setMonthlyRetainerInput,
  setMonthlyServiceDescription, onAddItem, onUpdateReel, onRemoveReel, setDiscountAmount,
  setExtraCostAmount, onRoundFigures, setCustomUpiId, onGenerateInvoice, onCancelEdit,
}: InvoiceFormCardProps) {
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="bg-surface-700 border border-surface-400 p-5 sm:p-6 rounded-xl shadow-xs space-y-5 text-text-primary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-400/80">
        <div>
          <h3 className="text-base font-semibold text-text-primary tracking-tight">
            {editingInvoiceId ? 'Edit Invoice' : 'Create New Invoice'}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Auto-aggregate unbilled work items or issue recurring retainers.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-surface-800 p-1 rounded-lg border border-surface-400/80 w-fit">
          <button
            type="button"
            onClick={() => setInvoiceBillingMode('per_reel')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border-0 ${
              invoiceBillingMode === 'per_reel'
                ? 'bg-surface-500 text-text-primary'
                : 'bg-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Per Deliverable
          </button>
          <button
            type="button"
            onClick={() => setInvoiceBillingMode('monthly_retainer')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border-0 ${
              invoiceBillingMode === 'monthly_retainer'
                ? 'bg-surface-500 text-text-primary'
                : 'bg-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Monthly Retainer
          </button>
        </div>
      </div>

      {/* Client and Date Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Client *</label>
          <select
            value={selectedClientId}
            onChange={(e) => onClientChange(e.target.value)}
            className="w-full p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-medium"
          >
            <option value="">Select a Client</option>
            {clients
              .filter((c) => !c.isClosed)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Billing From</label>
          <DateInput
            value={dateFrom}
            onChange={(val) => setDateFrom(val)}
            className="p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Billing To</label>
          <DateInput
            value={dateTo}
            onChange={(val) => setDateTo(val)}
            className="p-2.5 bg-surface-800 text-text-primary border border-surface-400 rounded-lg outline-none focus:border-surface-300 text-xs font-mono"
          />
        </div>
      </div>

      {/* Retainer specific inputs or line items */}
      {invoiceBillingMode === 'monthly_retainer' ? (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-surface-800 p-3.5 rounded-lg border border-surface-400">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Retainer Service Description
              </label>
              <input
                type="text"
                value={monthlyServiceDescription}
                onChange={(e) => setMonthlyServiceDescription(e.target.value)}
                placeholder="e.g. Monthly Video Editing Retainer"
                className="w-full p-2 bg-surface-900 border border-surface-400 rounded-md text-xs text-text-primary outline-none focus:border-surface-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Retainer Amount ({selectedClient?.currency || 'INR'}) *
              </label>
              <input
                type="number"
                value={monthlyRetainerInput}
                onChange={(e) => setMonthlyRetainerInput(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full p-2 bg-surface-900 border border-surface-400 rounded-md text-xs text-text-primary font-mono outline-none focus:border-surface-300"
              />
            </div>
          </div>
          <InvoiceRetainerDeliverablesList
            deliverables={currentBillingDeliverables || []}
            currency={selectedClient?.currency}
            fixedTotal={grandTotal}
          />
        </div>
      ) : (
        <InvoiceLineItemsEditor
          effectiveReels={effectiveReels}
          defaultRate={selectedClient?.defaultRate || 0}
          onAddItem={onAddItem}
          onUpdateReel={onUpdateReel}
          onRemoveReel={onRemoveReel}
          onRoundFigures={onRoundFigures}
        />
      )}

      {/* Adjustments: Discount, Extra Costs, UPI override */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-surface-400/70">
        <div>
          <label className="block text-[11px] font-medium text-text-secondary mb-1">Discount Amount</label>
          <input
            type="number"
            min="0"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            placeholder="0"
            className="w-full p-2 bg-surface-800 border border-surface-400 rounded text-xs text-text-primary font-mono outline-none focus:border-surface-300"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-secondary mb-1">Extra Expense / Cost</label>
          <input
            type="number"
            min="0"
            value={extraCostAmount}
            onChange={(e) => setExtraCostAmount(e.target.value)}
            placeholder="0"
            className="w-full p-2 bg-surface-800 border border-surface-400 rounded text-xs text-text-primary font-mono outline-none focus:border-surface-300"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-secondary mb-1">Payee UPI ID (Override)</label>
          <input
            type="text"
            value={customUpiId}
            onChange={(e) => setCustomUpiId(e.target.value)}
            placeholder="username@bank"
            className="w-full p-2 bg-surface-800 border border-surface-400 rounded text-xs text-text-primary font-mono outline-none focus:border-surface-300"
          />
        </div>
      </div>

      {/* Grand Total & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-surface-400/80">
        <div className="flex items-center gap-3">
          <div className="text-xs text-text-secondary font-medium">Grand Total:</div>
          <div className="text-xl sm:text-2xl font-bold text-text-primary font-mono tabular-nums">
            {formatCurrencyAmount(grandTotal, selectedClient?.currency)}
          </div>
          {discount > 0 && (
            <span className="text-xs text-text-muted font-mono tabular-nums">
              (-{formatCurrencyAmount(discount, selectedClient?.currency)} discount)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editingInvoiceId && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onGenerateInvoice}
            disabled={isGenerating || !selectedClientId}
            className="gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <IndianRupee size={13} />
                <span>{editingInvoiceId ? 'Save Changes' : 'Generate Invoice & Download'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InvoiceFormCard;
