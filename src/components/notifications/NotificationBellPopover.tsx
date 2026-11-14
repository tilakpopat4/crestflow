import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, X, Send, Mail, Copy, Check } from 'lucide-react';
import { User } from 'firebase/auth';
import { Client, Invoice, WorkItem } from '../../types';
import { getPaymentStatusInfo, calculateClientFinancials, generateWhatsAppReminder, generateEmailReminder } from '../../lib/paymentUtils';

export interface NotificationBellPopoverProps {
  user: User | null;
  clients: Client[];
  invoices: Invoice[];
  workItems: WorkItem[];
  onNavigateToClients?: () => void;
}

interface ActivePaymentNotification {
  client: Client;
  cycleKey: string;
  statusInfo: ReturnType<typeof getPaymentStatusInfo>;
  financials: ReturnType<typeof calculateClientFinancials>;
}

export default function NotificationBellPopover({
  user,
  clients,
  invoices,
  workItems,
  onNavigateToClients,
}: NotificationBellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`crestflow_dismissed_notifs_${user?.uid || 'guest'}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const [seenKeys, setSeenKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`crestflow_seen_notifs_${user?.uid || 'guest'}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mobileTop, setMobileTop] = useState<number>(64);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state if user changes
  useEffect(() => {
    try {
      const dismissedRaw = localStorage.getItem(`crestflow_dismissed_notifs_${user?.uid || 'guest'}`);
      setDismissedKeys(dismissedRaw ? new Set(JSON.parse(dismissedRaw)) : new Set());
      const seenRaw = localStorage.getItem(`crestflow_seen_notifs_${user?.uid || 'guest'}`);
      setSeenKeys(seenRaw ? new Set(JSON.parse(seenRaw)) : new Set());
    } catch { /* ignore */ }
  }, [user?.uid]);

  // Position popover cleanly on mobile below header
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMobileTop(Math.round(rect.bottom + 8));
    }
  }, [isOpen]);

  // Close on outside click or escape
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute active payment notifications for current cycle
  const activeNotifications: ActivePaymentNotification[] = useMemo(() => {
    const list: ActivePaymentNotification[] = [];

    clients.forEach((client) => {
      if (client.isClosed) return;

      const statusInfo = getPaymentStatusInfo(client, invoices, workItems);
      const isDueOrOverdue = statusInfo.code === 'DUE_TODAY' || 
                            statusInfo.code === 'OVERDUE' || 
                            statusInfo.code === 'OVERDUE_2_DAYS' || 
                            statusInfo.daysRemaining <= 0 || 
                            statusInfo.isNotificationRequired;

      if (!isDueOrOverdue) return;

      const cycleKey = `due_${client.id}_${statusInfo.nextDueDate}`;
      if (dismissedKeys.has(cycleKey)) return;

      list.push({
        client,
        cycleKey,
        statusInfo,
        financials: calculateClientFinancials(client.id, invoices, workItems)
      });
    });

    return list;
  }, [clients, invoices, workItems, dismissedKeys]);

  // Unread badge: count items that haven't been opened yet
  const hasUnread = useMemo(() => {
    return activeNotifications.some(n => !seenKeys.has(n.cycleKey));
  }, [activeNotifications, seenKeys]);

  // When dropdown opens, mark all visible notifications as seen
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && activeNotifications.length > 0) {
      const updatedSeen = new Set(seenKeys);
      activeNotifications.forEach(n => updatedSeen.add(n.cycleKey));
      setSeenKeys(updatedSeen);
      try {
        localStorage.setItem(`crestflow_seen_notifs_${user?.uid || 'guest'}`, JSON.stringify(Array.from(updatedSeen)));
      } catch {
        // ignore
      }
    }
  };

  const saveDismissed = (updated: Set<string>) => {
    setDismissedKeys(updated);
    try {
      localStorage.setItem(`crestflow_dismissed_notifs_${user?.uid || 'guest'}`, JSON.stringify(Array.from(updated)));
    } catch { /* ignore */ }
  };

  const handleDismiss = (cycleKey: string) => {
    const updated = new Set(dismissedKeys).add(cycleKey);
    saveDismissed(updated);
  };

  const handleClearAll = () => {
    const updated = new Set(dismissedKeys);
    activeNotifications.forEach(n => updated.add(n.cycleKey));
    saveDismissed(updated);
  };

  const handleCopyEmail = (cycleKey: string, subject: string, body: string) => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopiedKey(cycleKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer relative border-none ${
          isOpen
            ? 'bg-[#282828] text-white'
            : 'bg-transparent text-[#aaaaaa] hover:text-white hover:bg-[#282828] active:bg-[#333333]'
        }`}
        title="Payment Notifications"
        aria-label="Payment Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {hasUnread && (
          <span 
            className="w-1.5 h-1.5 rounded-full bg-[#e1002d] absolute top-1.5 right-1.5 ring-2 ring-[#0f0f0f]" 
            aria-label="Unread notifications"
          />
        )}
      </button>

      {isOpen && (
        <div 
          style={{ top: typeof window !== 'undefined' && window.innerWidth < 640 ? `${mobileTop}px` : undefined }}
          className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 sm:top-full mt-0 sm:mt-2 w-auto sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-[#212121] border border-[#333333] rounded-xl shadow-2xl p-4 z-50 text-white animate-in fade-in duration-100"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#333333]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">Notifications</span>
              {activeNotifications.length > 0 && (
                <span className="text-xs text-slate-400">({activeNotifications.length})</span>
              )}
            </div>
            {activeNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#333333]">
            {activeNotifications.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <p className="text-xs font-medium text-slate-300">No new notifications</p>
                <p className="text-[11px] text-slate-400 mt-1">Payment reminders will appear here once payment is due.</p>
              </div>
            ) : (
              activeNotifications.map(({ client, cycleKey, statusInfo, financials }) => {
                const emailData = generateEmailReminder(client, statusInfo);
                const isOverdue = statusInfo.code === 'OVERDUE' || statusInfo.code === 'OVERDUE_2_DAYS';
                const isEmailEnabled = client.emailRemindersEnabled !== false;

                return (
                  <div key={cycleKey} className="py-3 first:pt-3 last:pb-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              if (onNavigateToClients) onNavigateToClients();
                            }}
                            className="font-semibold text-xs text-white hover:underline text-left truncate cursor-pointer"
                            title="View in Clients directory"
                          >
                            {client.name}
                          </button>
                          <span className={`text-[11px] font-medium ${isOverdue || statusInfo.code === 'DUE_TODAY' ? 'text-[#e1002d]' : 'text-slate-400'}`}>
                            • {statusInfo.label}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Due: <strong className="text-slate-200">{new Date(statusInfo.nextDueDate).toLocaleDateString('en-IN')}</strong></span>
                          {financials.totalPendingAmount > 0 && (
                            <span>Pending: <strong className="text-[#e1002d]">₹{financials.totalPendingAmount.toLocaleString('en-IN')}</strong></span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismiss(cycleKey)}
                        className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer shrink-0"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <a
                        href={generateWhatsAppReminder(client, statusInfo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#282828] hover:bg-[#333333] border border-[#383838] text-white rounded-md text-[11px] font-medium transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <Send size={11} /> WhatsApp
                      </a>
                      {isEmailEnabled && (
                        <a
                          href={emailData.mailtoLink}
                          className="p-1.5 bg-[#282828] hover:bg-[#333333] border border-[#383838] text-[#aaaaaa] hover:text-white rounded-md text-[11px] transition-colors"
                          title="Draft Email Reminder"
                        >
                          <Mail size={12} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(cycleKey, emailData.subject, emailData.body)}
                        className="p-1.5 bg-[#282828] hover:bg-[#333333] border border-[#383838] text-[#aaaaaa] hover:text-white rounded-md text-[11px] transition-colors cursor-pointer"
                        title="Copy Email Template"
                      >
                        {copiedKey === cycleKey ? <Check size={12} className="text-white" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

