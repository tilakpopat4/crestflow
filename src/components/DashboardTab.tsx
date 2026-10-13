import React, { useState, useMemo, useRef } from 'react';
import { Invoice, WorkItem, Client } from '../types';
import { 
  BarChart, Bar, LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { IndianRupee, Clock, TrendingUp, CheckCircle2, DownloadCloud, UploadCloud, AlertTriangle, Send, Users, ArrowRight, Mail, Bell, Copy, Smartphone, X, FileText, StickyNote as StickyNoteIcon, Award } from 'lucide-react';
import { User } from 'firebase/auth';
import { useFirestore, safeStringify } from '../hooks/useFirestore';
import { 
  getPaymentStatusInfo, 
  calculateClientFinancials, 
  generateWhatsAppReminder,
  generateEmailReminder,
  triggerBrowserOverdueAlert
} from '../lib/paymentUtils';
import { registerFcmDeviceToken, triggerFcmPaymentReminder } from '../lib/fcmService';
import StickyNotesWidget from './StickyNotesWidget';
import PaymentDateModal from './PaymentDateModal';
import AISummarizer from './AISummarizer';
import { UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { calculateWorkJourney } from '../lib/anniversary';
import { executeAutoInvoiceCheck } from '../lib/autoInvoiceService';
import StatusBadge from './StatusBadge';

interface DashboardTabProps {
  user: User | null;
  profile?: UserProfile | null;
  onNavigateToClients?: () => void;
}

export default function DashboardTab({ user, profile, onNavigateToClients }: DashboardTabProps) {
  const { isDark } = useTheme();
  const { data: clients, addOrUpdateItem: updateClient } = useFirestore<Client>('clients', user?.uid);
  const { data: invoices, loading, addOrUpdateItem, removeItem, batchReplaceAll } = useFirestore<Invoice>('invoices', user?.uid);
  const { batchReplaceAll: batchReplaceClients } = useFirestore<any>('clients', user?.uid);
  const { data: workItems, addOrUpdateItem: updateWorkItem } = useFirestore<WorkItem>('workItems', user?.uid);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastAlert, setToastAlert] = useState<{ title: string; body: string; type: 'success' | 'warning' } | null>(null);
  const [isFcmRegistering, setIsFcmRegistering] = useState(false);
  const [isFcmRegistered, setIsFcmRegistered] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('fcm_device_token'));
  });
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);
  const [isAnnivBannerDismissed, setIsAnnivBannerDismissed] = useState(false);
  const [activeWorkspaceTool, setActiveWorkspaceTool] = useState<'none' | 'notes' | 'ai'>('none');
  const journey = calculateWorkJourney(profile?.freelanceStartDate);
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null, isOpen: boolean }>({ invoiceId: null, isOpen: false });



  const handleRegisterFcmDevice = async () => {
    setIsFcmRegistering(true);
    try {
      const res = await registerFcmDeviceToken(user?.uid);
      if (res.token) {
        setIsFcmRegistered(true);
        setToastAlert({
          title: 'FCM Device Registered!',
          body: 'Firebase Cloud Messaging device token saved. Overdue payment reminders will push directly to this device.',
          type: 'success'
        });
      } else {
        alert(res.error || 'Failed to register FCM device token.');
      }
    } catch (err: any) {
      alert('Error registering FCM device: ' + (err?.message || String(err)));
    } finally {
      setIsFcmRegistering(false);
    }
  };

  // Client statuses & notifications
  const clientStatuses = useMemo(() => {
    return clients.map(c => ({
      client: c,
      statusInfo: getPaymentStatusInfo(c, invoices, workItems),
      financials: calculateClientFinancials(c.id, invoices, workItems)
    }));
  }, [clients, invoices, workItems]);

  const activeNotifications = useMemo(() => {
    return clientStatuses.filter(cs => !cs.client.isClosed && cs.statusInfo.isNotificationRequired);
  }, [clientStatuses]);

  // Automated 6:00 PM FCM Payment Due Push Notification Engine
  React.useEffect(() => {
    const checkAndTrigger6PmReminders = () => {
      const now = new Date();
      const currentHour = now.getHours(); // 0 to 23
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Trigger automatically once per day at or after 6:00 PM (18:00) for clients with coming/overdue payment
      if (currentHour >= 18) {
        activeNotifications.forEach(({ client, statusInfo }) => {
          if (client.isClosed || client.emailRemindersEnabled === false) return;

          const sentKey = `fcm_6pm_sent_${client.id}_${dateKey}`;
          const alreadySent = localStorage.getItem(sentKey);

          if (!alreadySent) {
            triggerFcmPaymentReminder(
              client.name,
              statusInfo.label,
              statusInfo.notificationMessage,
              user?.uid
            ).then(res => {
              if (res.success || res.tokenUsed) {
                localStorage.setItem(sentKey, 'true');
                console.log(`[Auto 6:00 PM FCM Alert] Triggered notification for ${client.name} on ${dateKey}`);
              }
            }).catch(err => {
              console.warn(`[Auto 6:00 PM FCM Alert] Error sending notification for ${client.name}:`, err);
            });
          }
        });
      }
    };

    checkAndTrigger6PmReminders();
    const intervalId = setInterval(checkAndTrigger6PmReminders, 30000);
    return () => clearInterval(intervalId);
  }, [activeNotifications, user?.uid]);

  // Automated 6:00 AM Auto-Invoice Engine (runs background check during session)
  React.useEffect(() => {
    if (!clients || clients.length === 0) return;

    const runAutoInvoiceCheck = () => {
      executeAutoInvoiceCheck({
        clients,
        workItems,
        invoices,
        addInvoice: addOrUpdateItem,
        updateWorkItem,
        updateClient
      }).catch(err => {
        console.warn("[Dashboard Auto-Invoice Engine] Check failed:", err);
      });
    };

    runAutoInvoiceCheck();
    const intervalId = setInterval(runAutoInvoiceCheck, 30000);
    return () => clearInterval(intervalId);
  }, [clients, workItems, invoices, addOrUpdateItem, updateWorkItem, updateClient]);

  // Calculate metrics for current month & overall pending amounts
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalEarned = 0;
    let totalInvoicesThisMonth = 0;
    
    const clientRevenueMap = new Map<string, number>();

    // 1. Calculate current month's earned revenue & invoices count
    invoices.forEach(inv => {
      const invDate = new Date(inv.date);
      const isCurrentMonth = invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      
      if (isCurrentMonth) {
        totalInvoicesThisMonth++;
      }

      // For paid earnings, use lastPaymentDate if available to attribute to the month it was ACTUALLY paid
      if (inv.status === 'Paid') {
        const paymentDate = inv.lastPaymentDate ? new Date(inv.lastPaymentDate) : invDate;
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          totalEarned += inv.totalAmount;
          const current = clientRevenueMap.get(inv.clientName) || 0;
          clientRevenueMap.set(inv.clientName, current + inv.totalAmount);
        }
      }
    });

    // 2. Calculate Total Pending Invoices Amount (exclude closed clients)
    const totalDue = invoices
      .filter(inv => {
        if (inv.status !== 'Pending') return false;
        const clientObj = clients.find(c => c.id === inv.clientId || c.name === inv.clientName);
        return !clientObj?.isClosed;
      })
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    const chartData = Array.from(clientRevenueMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalEarned, totalDue, totalInvoicesThisMonth, chartData };
  }, [invoices, clients]);

  // Compute monthly earnings trend for line chart
  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, { monthKey: string; monthLabel: string; totalInvoiced: number; paidEarnings: number; pendingAmount: number }>();

    // Seed last 6 calendar months for continuous timeline
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthMap.set(key, { monthKey: key, monthLabel: label, totalInvoiced: 0, paidEarnings: 0, pendingAmount: 0 });
    }

    invoices.forEach(inv => {
      if (!inv.date) return;
      
      // Invoiced and Pending always align with creation date
      const invDate = new Date(inv.date);
      const invKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
      const invLabel = invDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      if (!monthMap.has(invKey)) {
        monthMap.set(invKey, { monthKey: invKey, monthLabel: invLabel, totalInvoiced: 0, paidEarnings: 0, pendingAmount: 0 });
      }

      const amt = Number(inv.totalAmount) || 0;
      const invItem = monthMap.get(invKey)!;
      invItem.totalInvoiced += amt;

      if (inv.status === 'Pending') {
        invItem.pendingAmount += amt;
      }

      // Paid Earnings align with payment date
      if (inv.status === 'Paid') {
        const payDate = inv.lastPaymentDate ? new Date(inv.lastPaymentDate) : invDate;
        const payKey = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
        const payLabel = payDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

        if (!monthMap.has(payKey)) {
          monthMap.set(payKey, { monthKey: payKey, monthLabel: payLabel, totalInvoiced: 0, paidEarnings: 0, pendingAmount: 0 });
        }
        monthMap.get(payKey)!.paidEarnings += amt;
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [invoices]);

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
      // Update invoice
      await addOrUpdateItem({ 
        ...inv, 
        status: nextStatus,
        lastPaymentDate: timestamp || undefined
      });

      // Update client's lastPaymentDate for cycle logic
      if (nextStatus === 'Paid') {
        const clientObj = clients.find(c => c.id === inv.clientId || c.name === inv.clientName);
        if (clientObj) {
          await updateClient({ ...clientObj, lastPaymentDate: timestamp || Date.now() });
        }
      }
    }
    setPaymentModalState({ invoiceId: null, isOpen: false });
  };

  const deleteInvoice = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice record?')) {
      try {
        const linkedWork = workItems.filter(w => w.invoiceId === id);
        for (const item of linkedWork) {
          const updatedItem = { ...item };
          delete updatedItem.invoiceId;
          updatedItem.status = 'Uninvoiced';
          await updateWorkItem(updatedItem);
        }
        await removeItem(id);
      } catch (err: any) {
        console.error("Error resetting work items on invoice deletion:", err);
        alert("Failed to reset work items: " + (err?.message || String(err)));
      }
    }
  };

  const handleExport = () => {
    const data = {
      clients: localStorage.getItem('clients') || '[]',
      monthlyWork: safeStringify(invoices),
    };
    const blob = new Blob([safeStringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.clients) {
          const parsedClients = typeof data.clients === 'string' ? JSON.parse(data.clients) : data.clients;
          await batchReplaceClients(parsedClients);
        }
        if (data.monthlyWork) {
           const parsedWork = typeof data.monthlyWork === 'string' ? JSON.parse(data.monthlyWork) : data.monthlyWork;
           await batchReplaceAll(parsedWork);
        }
        alert("Data imported successfully!");
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const migrateLocalData = async () => {
    try {
      const localClients = localStorage.getItem('clients');
      if (localClients) {
        const parsedClients = JSON.parse(localClients);
        if (parsedClients.length > 0) {
          await batchReplaceClients(parsedClients);
        }
      }
      const localInvoices = localStorage.getItem('monthlyWork');
      if (localInvoices) {
        const parsedInvoices = JSON.parse(localInvoices);
        if (parsedInvoices.length > 0) {
          await batchReplaceAll(parsedInvoices);
        }
      }
      localStorage.removeItem('clients');
      localStorage.removeItem('monthlyWork');
      alert("Local data successfully migrated to Cloud!");
    } catch(err) {
      alert("Error migrating data.");
    }
  };

  const recentInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        const clientObj = clients.find(c => c.id === inv.clientId || c.name === inv.clientName);
        return !clientObj?.isClosed;
      })
      .sort((a, b) => b.date - a.date);
  }, [invoices, clients]);

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto text-center py-20"><div className="animate-pulse flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div></div></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Financial overview & payment cycles.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {localStorage.getItem('clients') || localStorage.getItem('monthlyWork') ? (
            <button 
              onClick={migrateLocalData}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <UploadCloud size={14} /> Migrate Data
            </button>
          ) : null}
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <DownloadCloud size={14} /> Export
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <UploadCloud size={14} /> Import
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
        </div>
      </div>

      {/* Toast Notification Floating Banner */}
      {toastAlert && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-xl p-4 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-4 flex items-start gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0 mt-0.5">
            <Bell size={18} />
          </div>
          <div className="flex-1 space-y-0.5">
            <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{toastAlert.title}</h5>
            <p className="text-xs text-slate-200 leading-relaxed">{toastAlert.body}</p>
          </div>
          <button
            onClick={() => setToastAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Career Anniversary Milestone Banner if currently active */}
      {journey?.currentAnniversary && !isAnnivBannerDismissed && (
        <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4 relative overflow-hidden animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                  Career Anniversary Milestone
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {journey.workedDays} days freelancing
                </span>
              </div>
              <h3 className="text-base font-bold mt-0.5 text-slate-900 dark:text-slate-100">{journey.currentAnniversary.title}!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">{journey.currentAnniversary.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAnnivBannerDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!isNotificationDismissed && activeNotifications.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 relative">
          <button
            onClick={() => setIsNotificationDismissed(true)}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Dismiss notification"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-8">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0" size={16} />
              <span>Payment Reminders ({activeNotifications.length})</span>
            </div>
            
            <div className="flex items-center gap-2">
              {!isFcmRegistered ? (
                <button
                  onClick={handleRegisterFcmDevice}
                  disabled={isFcmRegistering}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Smartphone size={12} /> {isFcmRegistering ? 'Registering...' : 'Enable Push'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <Bell size={11} className="text-slate-400" /> Push Active
                </span>
              )}

              {onNavigateToClients && (
                <button 
                  onClick={onNavigateToClients}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Directory <ArrowRight size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-200/50 dark:divide-slate-800/30">
            {activeNotifications.map(({ client, statusInfo, financials }) => {
              const emailData = generateEmailReminder(client, statusInfo);
              const isEmailEnabled = client.emailRemindersEnabled !== false;

              return (
                <div 
                  key={client.id}
                  className="py-3 first:pt-1 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{client.name}</span>
                      <StatusBadge status={statusInfo.code} label={statusInfo.label} />
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                      <span>Due: <strong className="text-slate-700 dark:text-slate-300">{new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN')}</strong></span>
                      {financials.totalPendingAmount > 0 && (
                        <span>Pending: <strong className="text-rose-600 dark:text-rose-400">₹{financials.totalPendingAmount.toLocaleString('en-IN')}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <a
                      href={generateWhatsAppReminder(client, statusInfo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Send WhatsApp Reminder"
                    >
                      <Send size={12} /> WhatsApp
                    </a>

                    {isEmailEnabled && (
                      <a
                        href={emailData.mailtoLink}
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs transition-colors"
                        title="Draft Email Reminder"
                      >
                        <Mail size={13} />
                      </a>
                    )}

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                        alert(`Email reminder template for ${client.name} copied!`);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                      title="Copy Email Text"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      onClick={() => triggerBrowserOverdueAlert(client.name, statusInfo.label, statusInfo.notificationMessage, user?.uid)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                      title="Trigger Device Notification"
                    >
                      <Bell size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4 min-w-0">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
            <IndianRupee size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider truncate">Total Earned This Month</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">₹{metrics.totalEarned.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4 min-w-0">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shrink-0">
            <Clock size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider truncate">Total Pending Invoices Amount</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">₹{metrics.totalDue.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4 min-w-0 sm:col-span-2 xl:col-span-1">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider truncate">Invoices This Month</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">{metrics.totalInvoicesThisMonth}</h3>
          </div>
        </div>
      </div>



      {/* Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recharts Monthly Earnings Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Monthly Earnings Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track paid earnings vs total invoiced revenue over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Paid Earnings
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Total Invoiced
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            {monthlyTrendData.some(m => m.totalInvoiced > 0 || m.paidEarnings > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis 
                    dataKey="monthLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '12px',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: isDark ? '0 10px 15px -3px rgb(0 0 0 / 0.4)' : '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    labelStyle={{
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}
                    formatter={(value: number, name: string) => [
                      `₹${Number(value).toLocaleString('en-IN')}`, 
                      name === 'paidEarnings' ? 'Paid Earnings' : 'Total Invoiced'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="paidEarnings" 
                    name="paidEarnings"
                    stroke="#4F46E5" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: isDark ? '#1e293b' : '#ffffff' }}
                    activeDot={{ r: 7, strokeWidth: 0 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalInvoiced" 
                    name="totalInvoiced"
                    stroke="#94a3b8" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#94a3b8', stroke: isDark ? '#1e293b' : '#ffffff' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 text-center py-12">
                No monthly invoice data yet.<br/>Generate invoices to render the earnings line chart.
              </div>
            )}
          </div>
        </div>

        {/* Client Distribution Bar Chart */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">Client Revenue</h3>
          <div className="flex-1 min-h-[280px]">
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} width={80} />
                  <Tooltip 
                    cursor={{ fill: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)' }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: isDark ? '0 4px 6px -1px rgb(0 0 0 / 0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    labelStyle={{
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontWeight: 600
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 text-center py-12">
                No data available for this month.<br/>Generate invoices to see the chart.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Recent Invoices</h3>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div>{inv.clientName}</div>
                      {inv.discountAmount && (
                        <div className="text-xs text-rose-500 font-normal mt-0.5">
                          Deduction: -₹{inv.discountAmount.toLocaleString('en-IN')}{inv.discountDescription ? ` (${inv.discountDescription})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge
                        status={inv.status}
                        onClick={() => toggleInvoiceStatus(inv.id)}
                        title="Click to toggle payment status"
                      />
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => toggleInvoiceStatus(inv.id)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:underline cursor-pointer"
                      >
                        {inv.status === 'Paid' ? 'Mark Pending' : 'Approve Payment'}
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Workspace Utilities: Progressive Disclosure */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Workspace Tools</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Quick access to scratchpad notes and Gemini AI summaries</p>
          </div>
          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveWorkspaceTool(prev => prev === 'notes' ? 'none' : 'notes')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspaceTool === 'notes'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <StickyNoteIcon size={13} /> Notes {activeWorkspaceTool === 'notes' ? '(Active)' : ''}
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspaceTool(prev => prev === 'ai' ? 'none' : 'ai')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeWorkspaceTool === 'ai'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText size={13} /> AI Summarizer {activeWorkspaceTool === 'ai' ? '(Active)' : ''}
            </button>
          </div>
        </div>

        {activeWorkspaceTool === 'notes' && (
          <div className="animate-in fade-in duration-200">
            <StickyNotesWidget user={user} clients={clients} />
          </div>
        )}

        {activeWorkspaceTool === 'ai' && (
          <div className="animate-in fade-in duration-200">
            <AISummarizer clients={clients} workItems={workItems} profile={profile} />
          </div>
        )}
      </div>

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


    </div>
  );
}
