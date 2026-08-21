import React, { useState, useMemo, useRef } from 'react';
import { Invoice, WorkItem, Client } from '../types';
import { 
  BarChart, Bar, LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { IndianRupee, Clock, TrendingUp, CheckCircle2, DownloadCloud, UploadCloud, AlertTriangle, Send, Users, ArrowRight, Mail, Bell, Copy, Smartphone, X, Calendar } from 'lucide-react';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface DashboardTabProps {
  user: User | null;
  profile?: UserProfile | null;
  onNavigateToClients?: () => void;
}

export default function DashboardTab({ user, profile, onNavigateToClients }: DashboardTabProps) {
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
  const [paymentModalState, setPaymentModalState] = useState<{ invoiceId: string | null, isOpen: boolean }>({ invoiceId: null, isOpen: false });

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [hoveredDay, setHoveredDay] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Process contributions
  const contributions = useMemo(() => {
    const counts: Record<string, { work: number; payments: number; total: number; details: string[] }> = {};

    workItems.forEach(item => {
      if (!item.date) return;
      const date = new Date(item.date);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!counts[dateStr]) {
        counts[dateStr] = { work: 0, payments: 0, total: 0, details: [] };
      }
      counts[dateStr].work += 1;
      counts[dateStr].total += 1;
      counts[dateStr].details.push(`Completed: "${item.description}" (${item.quantity} × ₹${item.rate})`);
    });

    invoices.forEach(inv => {
      if (inv.status !== 'Paid' || !inv.lastPaymentDate) return;
      const date = new Date(inv.lastPaymentDate);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!counts[dateStr]) {
        counts[dateStr] = { work: 0, payments: 0, total: 0, details: [] };
      }
      counts[dateStr].payments += 1;
      counts[dateStr].total += 1;
      counts[dateStr].details.push(`Received Payment: ₹${inv.totalAmount.toLocaleString('en-IN')} (Inv #${inv.id.substring(0, 8).toUpperCase()})`);
    });

    return counts;
  }, [workItems, invoices]);

  // 2. Extract active years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());

    workItems.forEach(item => {
      if (item.date) {
        yearsSet.add(new Date(item.date).getFullYear());
      }
    });

    invoices.forEach(inv => {
      if (inv.lastPaymentDate) {
        yearsSet.add(new Date(inv.lastPaymentDate).getFullYear());
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [workItems, invoices]);

  // 3. Compute calendar grid weeks/days
  const calendarGrid = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let startDate: Date;
    let endDate: Date;

    if (selectedYear === currentYear) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 364);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31);
    }

    const startDayOfWeek = startDate.getDay();
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setDate(adjustedStartDate.getDate() - startDayOfWeek);

    const endDayOfWeek = endDate.getDay();
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + (6 - endDayOfWeek));

    interface CalendarDay {
      date: Date;
      dateStr: string;
      contributionInfo: { work: number; payments: number; total: number; details: string[] };
    }

    const allDays: CalendarDay[] = [];
    const current = new Date(adjustedStartDate);

    while (current <= adjustedEndDate) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      allDays.push({
        date: new Date(current),
        dateStr,
        contributionInfo: contributions[dateStr] || { work: 0, payments: 0, total: 0, details: [] }
      });
      current.setDate(current.getDate() + 1);
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    return weeks;
  }, [selectedYear, contributions]);

  // 4. Compute Month Labels positioning
  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    let lastMonth = -1;

    calendarGrid.forEach((week, weekIndex) => {
      const firstDay = week[0].date;
      const currentMonth = firstDay.getMonth();

      if (currentMonth !== lastMonth) {
        labels.push({
          index: weekIndex,
          label: firstDay.toLocaleDateString('en-IN', { month: 'short' })
        });
        lastMonth = currentMonth;
      }
    });

    return labels;
  }, [calendarGrid]);

  // 5. Total year contributions count
  const totalYearContributions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let startDate: Date;
    let endDate: Date;

    if (selectedYear === currentYear) {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 364);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31);
    }

    const startMs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const endMs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();

    let total = 0;
    workItems.forEach(item => {
      if (item.date && item.date >= startMs && item.date <= endMs) {
        total += 1;
      }
    });
    invoices.forEach(inv => {
      if (inv.status === 'Paid' && inv.lastPaymentDate && inv.lastPaymentDate >= startMs && inv.lastPaymentDate <= endMs) {
        total += 1;
      }
    });

    return total;
  }, [selectedYear, workItems, invoices]);

  const getContributionColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-800/40 border border-slate-850/80';
    if (count === 1) return 'bg-emerald-950 border border-emerald-900/60';
    if (count === 2) return 'bg-emerald-800 border border-emerald-700/60';
    if (count === 3) return 'bg-emerald-600 border border-emerald-500/60';
    return 'bg-emerald-400 border border-emerald-300/60 shadow-[0_0_8px_rgba(52,211,153,0.25)]';
  };

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
    return clientStatuses.filter(cs => cs.statusInfo.isNotificationRequired);
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
          if (client.emailRemindersEnabled === false) return;

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

    // 2. Calculate Total Pending Invoices Amount
    const totalDue = invoices
      .filter(inv => inv.status === 'Pending')
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

    const chartData = Array.from(clientRevenueMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalEarned, totalDue, totalInvoicesThisMonth, chartData };
  }, [invoices]);

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

  const recentInvoices = [...invoices].sort((a, b) => b.date - a.date);

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto text-center py-20"><div className="animate-pulse flex items-center justify-center space-x-2"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div><div className="w-2 h-2 bg-indigo-600 rounded-full"></div></div></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 mt-1">Overview of your monthly earnings, client payment cycles & due reminders.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(localStorage.getItem('clients') || localStorage.getItem('monthlyWork')) ? (
            <button 
              onClick={migrateLocalData}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
            >
              <UploadCloud size={16} /> Migrate Local Data
            </button>
          ) : null}
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-sm font-medium transition-colors shadow-sm"
          >
            <DownloadCloud size={16} /> Export Sync
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-sm font-medium transition-colors shadow-sm"
          >
            <UploadCloud size={16} /> Import Sync
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
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/50 animate-in fade-in slide-in-from-top-4 flex items-start gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <Bell size={18} className="animate-bounce" />
          </div>
          <div className="flex-1 space-y-0.5">
            <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{toastAlert.title}</h5>
            <p className="text-xs text-slate-200 leading-relaxed">{toastAlert.body}</p>
          </div>
          <button
            onClick={() => setToastAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      )}



      {!isNotificationDismissed && activeNotifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4 relative">
          <button
            onClick={() => setIsNotificationDismissed(true)}
            className="absolute top-4 right-4 text-amber-700 hover:text-amber-950 hover:bg-amber-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Dismiss notification"
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-2.5 text-amber-900 font-bold text-base">
              <AlertTriangle className="text-amber-600 animate-bounce" size={20} />
              <span>Payment Cycle Reminders ({activeNotifications.length} Client(s) Need Follow-up)</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {!isFcmRegistered ? (
                <button
                  onClick={handleRegisterFcmDevice}
                  disabled={isFcmRegistering}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Register this device for Firebase Cloud Messaging (FCM) push notifications"
                >
                  <Smartphone size={13} /> {isFcmRegistering ? 'Registering...' : 'Register FCM Device'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-md border border-emerald-200">
                  <Bell size={12} className="text-emerald-600" /> Auto 6:00 PM Push Active
                </span>
              )}

              {onNavigateToClients && (
                <button 
                  onClick={onNavigateToClients}
                  className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View Directory <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeNotifications.map(({ client, statusInfo, financials }) => {
              const emailData = generateEmailReminder(client, statusInfo);
              const isEmailEnabled = client.emailRemindersEnabled !== false;

              return (
                <div 
                  key={client.id}
                  className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm">{client.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                      <div>Due Date: <span className="font-semibold text-slate-800">{new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN')}</span></div>
                      {financials.totalPendingAmount > 0 && (
                        <div>Pending Balance: <span className="font-bold text-rose-600">₹{financials.totalPendingAmount.toLocaleString('en-IN')}</span></div>
                      )}
                      <div className="pt-1 flex items-center gap-1.5 text-[11px]">
                        <span className={`w-2 h-2 rounded-full ${isEmailEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                        <span className="text-slate-600">Email Reminders: <strong className={isEmailEnabled ? 'text-indigo-700' : 'text-slate-500'}>{isEmailEnabled ? 'Enabled' : 'Disabled'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <a
                        href={generateWhatsAppReminder(client, statusInfo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <Send size={13} />
                      </a>

                      {isEmailEnabled && (
                        <a
                          href={emailData.mailtoLink}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          title="Draft Email Reminder"
                        >
                          <Mail size={13} />
                        </a>
                      )}

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                          alert(`Email reminder template for ${client.name} copied to clipboard!`);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        title="Copy Email Text to Clipboard"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        onClick={() => triggerBrowserOverdueAlert(client.name, statusInfo.label, statusInfo.notificationMessage, user?.uid)}
                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="Trigger FCM Device Notification"
                      >
                        <Bell size={13} />
                      </button>
                    </div>

                    {onNavigateToClients && (
                      <button
                        onClick={onNavigateToClients}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Open Profile
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Earned This Month</p>
            <h3 className="text-3xl font-bold text-slate-900">₹{metrics.totalEarned.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Pending Invoices Amount</p>
            <h3 className="text-3xl font-bold text-slate-900">₹{metrics.totalDue.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Invoices This Month</p>
            <h3 className="text-3xl font-bold text-slate-900">{metrics.totalInvoicesThisMonth}</h3>
          </div>
        </div>
      </div>

      {/* GitHub-style Activity Calendar Widget */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-md text-slate-100 flex flex-col md:flex-row gap-6 relative">
        {/* Left: Calendar & Grid */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold tracking-wide text-slate-300 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              <span>
                {totalYearContributions} contributions in {selectedYear === new Date().getFullYear() ? 'the last year' : selectedYear}
              </span>
            </div>
          </div>

          <div className="border border-slate-800/60 rounded-xl p-4 bg-slate-900/40">
            <div className="flex gap-2">
              {/* Day labels column */}
              <div className="flex flex-col justify-between text-[10px] text-slate-500 pr-1 pt-[18px] pb-1 h-[94px] select-none shrink-0 font-medium">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>

              {/* Scrollable Month labels + Calendar Grid */}
              <div className="flex-1 overflow-x-auto select-none scrollbar-thin scrollbar-thumb-slate-800">
                {/* Month labels header */}
                <div className="relative h-4 text-[10px] text-slate-500 mb-1 w-full min-w-[720px] font-semibold">
                  {monthLabels.map((ml, idx) => (
                    <span
                      key={idx}
                      className="absolute"
                      style={{ left: `${ml.index * 13.5}px` }}
                    >
                      {ml.label}
                    </span>
                  ))}
                </div>

                {/* Grid of days grouped by weeks */}
                <div className="flex gap-[3.5px] min-w-[720px] pb-1">
                  {calendarGrid.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3.5px]">
                      {week.map((day) => {
                        const count = day.contributionInfo?.total || 0;
                        const colorClass = getContributionColorClass(count);

                        return (
                          <div
                            key={day.dateStr}
                            className={`w-2.5 h-2.5 rounded-[2px] transition-all hover:scale-125 cursor-pointer relative shrink-0 ${colorClass}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredDay(day);
                              setTooltipPos({
                                x: rect.left + rect.width / 2,
                                y: rect.top
                              });
                            }}
                            onMouseLeave={() => setHoveredDay(null)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Legend & Helper Info */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 px-1">
            <span className="text-[10px] text-slate-500">
              Activity synced with work completions & paid invoice dates.
            </span>
            <div className="flex items-center gap-1.5 font-medium">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-800/40 border border-slate-850/80"></div>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-950 border border-emerald-900/60"></div>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800 border border-emerald-700/60"></div>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 border border-emerald-500/60"></div>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300/60"></div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Right: Year selection buttons */}
        <div className="flex flex-row md:flex-col gap-1.5 shrink-0 justify-start md:pt-7">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center whitespace-nowrap min-w-[60px] ${
                selectedYear === year
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics & Charts Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recharts Monthly Earnings Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Monthly Earnings Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Track paid earnings vs total invoiced revenue over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Paid Earnings
              </span>
              <span className="flex items-center gap-1.5 font-medium text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Total Invoiced
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            {monthlyTrendData.some(m => m.totalInvoiced > 0 || m.paidEarnings > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="monthLabel" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [
                      `₹${Number(value).toLocaleString('en-IN')}`, 
                      name === 'paidEarnings' ? 'Paid Earnings' : 'Total Invoiced'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="paidEarnings" 
                    name="paidEarnings"
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, strokeWidth: 0 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalInvoiced" 
                    name="totalInvoiced"
                    stroke="#6366f1" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#6366f1' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 text-center py-12">
                No monthly invoice data yet.<br/>Generate invoices to render the earnings line chart.
              </div>
            )}
          </div>
        </div>

        {/* Client Distribution Bar Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-6">Client Revenue</h3>
          <div className="flex-1 min-h-[280px]">
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563' }} width={80} />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {metrics.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 text-center py-12">
                No data available for this month.<br/>Generate invoices to see the chart.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Recent Invoices</h3>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div>{inv.clientName}</div>
                      {inv.discountAmount && (
                        <div className="text-xs text-rose-500 font-normal mt-0.5">
                          Deduction: -₹{inv.discountAmount.toLocaleString('en-IN')}{inv.discountDescription ? ` (${inv.discountDescription})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleInvoiceStatus(inv.id)}
                        title="Click to toggle payment status"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                          inv.status === 'Paid' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {inv.status === 'Paid' && <CheckCircle2 size={12} />}
                        {inv.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => toggleInvoiceStatus(inv.id)}
                        className={`text-xs font-semibold hover:underline ${
                          inv.status === 'Paid' 
                            ? 'text-amber-600 hover:text-amber-800' 
                            : 'text-emerald-600 hover:text-emerald-800'
                        }`}
                      >
                        {inv.status === 'Paid' ? 'Mark Pending' : 'Approve Payment'}
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
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

      {/* Sticky Notes Widget */}
      <StickyNotesWidget user={user} clients={clients} />

      {/* AI Summarizer Widget */}
      <AISummarizer clients={clients} workItems={workItems} profile={profile} />

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

      {/* Viewport-floating Tooltip */}
      {hoveredDay && (
        <div
          className="fixed bg-slate-950 text-slate-100 text-[11px] rounded-xl p-3 shadow-2xl border border-slate-800 z-[99999] pointer-events-none w-52 transition-all duration-100 ease-out"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px'
          }}
        >
          <div className="font-bold text-slate-200 border-b border-slate-850 pb-1 mb-1 font-mono">
            {hoveredDay.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-1">
            {hoveredDay.contributionInfo.total === 0 ? 'No contributions' : `${hoveredDay.contributionInfo.total} contribution${hoveredDay.contributionInfo.total === 1 ? '' : 's'}`}
          </div>
          {hoveredDay.contributionInfo.details.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-[10px] text-emerald-400 font-medium">
              {hoveredDay.contributionInfo.details.map((detail: string, i: number) => (
                <li key={i} className="list-disc list-inside truncate" title={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
