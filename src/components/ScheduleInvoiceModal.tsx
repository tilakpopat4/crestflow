import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, CheckCircle2, Sparkles, AlertCircle, Play, Check } from 'lucide-react';
import { Client, WorkItem, Invoice } from '../types';
import { DateInput } from './DateInput';
import { formatLocalDateToYMD } from '../lib/dateUtils';
import { getAutoInvoiceScheduleInfo, executeAutoInvoiceCheck } from '../lib/autoInvoiceService';

interface ScheduleInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  workItems: WorkItem[];
  invoices: Invoice[];
  initialClientId?: string;
  onUpdateClient: (client: Client) => Promise<any>;
  onAddInvoice: (inv: Invoice) => Promise<any>;
  onUpdateWorkItem: (item: WorkItem) => Promise<any>;
}

export default function ScheduleInvoiceModal({
  isOpen,
  onClose,
  clients,
  workItems,
  invoices,
  initialClientId,
  onUpdateClient,
  onAddInvoice,
  onUpdateWorkItem
}: ScheduleInvoiceModalProps) {
  const activeClients = clients.filter(c => !c.isClosed);

  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    if (initialClientId && activeClients.some(c => c.id === initialClientId)) {
      return initialClientId;
    }
    return activeClients[0]?.id || '';
  });

  const selectedClient = activeClients.find(c => c.id === selectedClientId) || activeClients[0];

  const [enabled, setEnabled] = useState<boolean>(false);
  const [scheduleType, setScheduleType] = useState<'cycle_date' | 'day_of_month' | 'specific_date'>('cycle_date');
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [specificDate, setSpecificDate] = useState<string>(() => formatLocalDateToYMD(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync state when selected client changes
  useEffect(() => {
    if (selectedClient) {
      setEnabled(!!selectedClient.autoInvoiceEnabled);
      setScheduleType(selectedClient.autoInvoiceScheduleType || 'cycle_date');
      setCycleDay(selectedClient.autoInvoiceCycleDay || 1);
      setSpecificDate(selectedClient.autoInvoiceSpecificDate || formatLocalDateToYMD(new Date()));
      setStatusMessage(null);
    }
  }, [selectedClient?.id, isOpen]);

  if (!isOpen) return null;

  const currentScheduleInfo = selectedClient ? getAutoInvoiceScheduleInfo({
    ...selectedClient,
    autoInvoiceEnabled: enabled,
    autoInvoiceScheduleType: scheduleType,
    autoInvoiceCycleDay: cycleDay,
    autoInvoiceSpecificDate: specificDate
  }) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsSaving(true);
    try {
      const updatedClient: Client = {
        ...selectedClient,
        autoInvoiceEnabled: enabled,
        autoInvoiceScheduleType: scheduleType,
        autoInvoiceCycleDay: scheduleType === 'day_of_month' ? Number(cycleDay) : undefined,
        autoInvoiceSpecificDate: scheduleType === 'specific_date' ? specificDate : undefined
      };

      await onUpdateClient(updatedClient);
      setStatusMessage(`Schedule updated! Invoices will auto-generate at 6:00 AM on ${currentScheduleInfo?.nextRunDateFormatted}.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      alert("Failed to save schedule: " + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunImmediateTest = async () => {
    if (!selectedClient) return;
    if (!confirm(`Generate scheduled invoice for "${selectedClient.name}" now? This will immediately compile their uninvoiced work into a new pending invoice.`)) {
      return;
    }

    setIsRunningTest(true);
    setStatusMessage(null);
    try {
      const res = await executeAutoInvoiceCheck({
        clients: [selectedClient],
        workItems,
        invoices,
        addInvoice: onAddInvoice,
        updateWorkItem: onUpdateWorkItem,
        updateClient: onUpdateClient,
        forceRunClientId: selectedClient.id
      });

      if (res.generatedCount > 0) {
        setStatusMessage(`Success! Generated: ${res.summaryMessages.join(', ')}`);
      } else {
        setStatusMessage('No invoice generated. Client may have no billable work.');
      }
    } catch (err: any) {
      alert('Error running auto-invoice: ' + (err?.message || String(err)));
    } finally {
      setIsRunningTest(false);
    }
  };

  // Find all clients with active schedules
  const scheduledClients = activeClients.filter(c => c.autoInvoiceEnabled);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-700 my-8 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Schedule Automatic Invoicing
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                  6:00 AM Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically generate pending invoices at morning 6:00 AM on your client's cycle date.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Client Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Target Client *
            </label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            >
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.autoInvoiceEnabled ? '✓ (Scheduled)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Switch */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label htmlFor="enableAutoInvoiceToggle" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer block">
                Enable Auto-Invoicing at 6:00 AM
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                When enabled, Crestflow automatically bundles unbilled work into an invoice at 6:00 AM on the scheduled date.
              </p>
            </div>
            <input
              id="enableAutoInvoiceToggle"
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer shrink-0"
            />
          </div>

          {/* Schedule Options */}
          {enabled && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Select Invoicing Cycle Date
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: Payment Cycle Due Date */}
                  <label className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                    scheduleType === 'cycle_date'
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="cycle_date"
                        checked={scheduleType === 'cycle_date'}
                        onChange={() => setScheduleType('cycle_date')}
                        className="text-indigo-600"
                      />
                      <span>Cycle Due Date</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Matches client's {selectedClient?.paymentCycleDays || 30}-day cycle
                    </span>
                  </label>

                  {/* Option 2: Day of Month */}
                  <label className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                    scheduleType === 'day_of_month'
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="day_of_month"
                        checked={scheduleType === 'day_of_month'}
                        onChange={() => setScheduleType('day_of_month')}
                        className="text-indigo-600"
                      />
                      <span>Day of Month</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Every month on day 1 to 31
                    </span>
                  </label>

                  {/* Option 3: Specific Date */}
                  <label className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                    scheduleType === 'specific_date'
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="specific_date"
                        checked={scheduleType === 'specific_date'}
                        onChange={() => setScheduleType('specific_date')}
                        className="text-indigo-600"
                      />
                      <span>Specific Date</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      One-time custom calendar date
                    </span>
                  </label>
                </div>
              </div>

              {/* Sub-inputs based on selection */}
              {scheduleType === 'day_of_month' && (
                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Day of Every Month (1 to 31)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={cycleDay}
                      onChange={e => setCycleDay(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="w-28 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Runs on the {cycleDay}{cycleDay === 1 ? 'st' : cycleDay === 2 ? 'nd' : cycleDay === 3 ? 'rd' : 'th'} of each month at 6:00 AM
                    </span>
                  </div>
                </div>
              )}

              {scheduleType === 'specific_date' && (
                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Execution Date *
                  </label>
                  <div className="max-w-xs">
                    <DateInput
                      value={specificDate}
                      onChange={val => setSpecificDate(val)}
                      required
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Next run preview banner */}
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
                <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Next Automated Generation:</span>{' '}
                  <span className="font-semibold underline">
                    {currentScheduleInfo?.nextRunDateFormatted} at 6:00 AM
                  </span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {currentScheduleInfo?.description}. Uninvoiced work logs will be compiled automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-medium animate-in fade-in">
              {statusMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div>
              {enabled && (
                <button
                  type="button"
                  disabled={isRunningTest}
                  onClick={handleRunImmediateTest}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
                  title="Test auto-generation logic right now"
                >
                  <Play size={12} className="text-indigo-600" />
                  {isRunningTest ? 'Generating...' : 'Test Run Now'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                {isSaving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </form>

        {/* Scheduled Clients Summary Section */}
        {scheduledClients.length > 0 && (
          <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-600" />
              Active 6:00 AM Auto-Invoice Schedules ({scheduledClients.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {scheduledClients.map(sc => {
                const info = getAutoInvoiceScheduleInfo(sc);
                return (
                  <div key={sc.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{sc.name}</span>
                      <span className="text-slate-400 text-[11px] ml-1.5">({info.description})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {info.nextRunDateFormatted} @ 6:00 AM
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(sc.id)}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
