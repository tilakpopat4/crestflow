import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, ClipboardList, FileText, ExternalLink, Play, ArrowRight, CheckCircle2, Clock, Sun, Moon, Monitor, Flame, Sparkles, Trophy, Calendar, PartyPopper } from 'lucide-react';
import { User } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { Client, WorkItem, Invoice, UserProfile } from '../types';
import { Tab } from '../App';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { calculateWorkJourney } from '../lib/anniversary';

interface GlobalHeaderProps {
  user: User | null;
  activeTab: Tab;
  setActiveTab: (tab: Tab, query?: string) => void;
  onSearchSelect?: (type: 'client' | 'work' | 'invoice', id: string, query?: string) => void;
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  profile?: UserProfile | null;
  onEditProfile?: () => void;
  onOpenAnniversaryModal?: () => void;
}

export default function GlobalHeader({
  user,
  activeTab,
  setActiveTab,
  onSearchSelect,
  globalQuery,
  setGlobalQuery,
  profile,
  onEditProfile,
  onOpenAnniversaryModal
}: GlobalHeaderProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const journey = calculateWorkJourney(profile?.freelanceStartDate);
  const [showJourneyMenu, setShowJourneyMenu] = useState(false);
  const journeyMenuRef = useRef<HTMLDivElement>(null);

  const { data: clients } = useFirestore<Client>('clients', user?.uid);
  const { data: workItems } = useFirestore<WorkItem>('workItems', user?.uid);
  const { data: invoices } = useFirestore<Invoice>('invoices', user?.uid);

  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'clients' | 'work' | 'invoices'>('all');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut (⌘K or /) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === '/' && document.activeElement !== inputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setShowThemeMenu(false);
        setShowJourneyMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
      if (journeyMenuRef.current && !journeyMenuRef.current.contains(e.target as Node)) {
        setShowJourneyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanQuery = globalQuery.trim().toLowerCase();

  // Filter clients
  const filteredClients = cleanQuery ? clients.filter(c => 
    c.name.toLowerCase().includes(cleanQuery) ||
    (c.email && c.email.toLowerCase().includes(cleanQuery)) ||
    (c.phone && c.phone.toLowerCase().includes(cleanQuery))
  ) : [];

  // Filter work items
  const filteredWork = cleanQuery ? workItems.filter(w => {
    const client = clients.find(c => c.id === w.clientId);
    const clientName = client ? client.name.toLowerCase() : '';
    return w.description.toLowerCase().includes(cleanQuery) ||
      clientName.includes(cleanQuery) ||
      (w.videoUrl && w.videoUrl.toLowerCase().includes(cleanQuery));
  }) : [];

  // Filter invoices
  const filteredInvoices = cleanQuery ? invoices.filter(inv => {
    const invoiceNo = inv.id.substring(0, 8).toLowerCase();
    const itemsText = inv.reels ? inv.reels.map(r => r.title).join(' ').toLowerCase() : '';
    return inv.clientName.toLowerCase().includes(cleanQuery) ||
      invoiceNo.includes(cleanQuery) ||
      itemsText.includes(cleanQuery);
  }) : [];

  const totalResults = filteredClients.length + filteredWork.length + filteredInvoices.length;

  const handleSelectClient = (client: Client) => {
    setIsOpen(false);
    if (onSearchSelect) {
      onSearchSelect('client', client.id, globalQuery);
    } else {
      setActiveTab('clients', globalQuery);
    }
  };

  const handleSelectWork = (work: WorkItem) => {
    setIsOpen(false);
    if (onSearchSelect) {
      onSearchSelect('work', work.id, globalQuery);
    } else {
      setActiveTab('work', globalQuery);
    }
  };

  const handleSelectInvoice = (inv: Invoice) => {
    setIsOpen(false);
    if (onSearchSelect) {
      onSearchSelect('invoice', inv.id, globalQuery);
    } else {
      setActiveTab('invoice', globalQuery);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 md:px-8 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4">
        {/* Mobile Logo Branding */}
        <div className="flex items-center gap-1.5 md:hidden shrink-0">
          <Logo className="w-6 h-6 min-[380px]:w-7 min-[380px]:h-7" />
          <span className="hidden min-[380px]:inline font-extrabold text-slate-900 dark:text-white tracking-tight text-sm md:text-base">CrestFlow</span>
        </div>

        {/* Real-time Global Search Input */}
        <div ref={searchRef} className="relative flex-1 max-w-2xl mx-auto md:mx-0">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
            <input
              ref={inputRef}
              type="text"
              value={globalQuery}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search clients, work items, video links, invoices..."
              className="w-full bg-slate-100/80 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs md:text-sm pl-10 pr-20 py-2 md:py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {globalQuery ? (
                <button
                  onClick={() => {
                    setGlobalQuery('');
                    setIsOpen(false);
                  }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs pointer-events-none">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Real-Time Filter Search Results Dropdown */}
          {isOpen && cleanQuery.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] flex flex-col">
              {/* Category Filter Chips */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 font-medium">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      activeCategory === 'all'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All ({totalResults})
                  </button>
                  <button
                    onClick={() => setActiveCategory('clients')}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      activeCategory === 'clients'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Users size={12} /> Clients ({filteredClients.length})
                  </button>
                  <button
                    onClick={() => setActiveCategory('work')}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      activeCategory === 'work'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ClipboardList size={12} /> Work Logs ({filteredWork.length})
                  </button>
                  <button
                    onClick={() => setActiveCategory('invoices')}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      activeCategory === 'invoices'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <FileText size={12} /> Invoices ({filteredInvoices.length})
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                  Real-time results
                </span>
              </div>

              {/* Scrollable Results Body */}
              <div className="overflow-y-auto p-2 space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                {totalResults === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No matching records found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Try searching for a client name, project description, reel title, or invoice ID.</p>
                  </div>
                ) : (
                  <>
                    {/* Clients Section */}
                    {(activeCategory === 'all' || activeCategory === 'clients') && filteredClients.length > 0 && (
                      <div className="pt-2 first:pt-0">
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Users size={12} className="text-indigo-500 dark:text-indigo-400" /> Clients ({filteredClients.length})
                        </div>
                        <div className="mt-1 space-y-1">
                          {filteredClients.map(client => (
                            <button
                              key={client.id}
                              onClick={() => handleSelectClient(client)}
                              className="w-full text-left p-3 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 rounded-xl transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shrink-0">
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 flex items-center gap-2">
                                    {client.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-3 mt-0.5">
                                    {client.email && <span>{client.email}</span>}
                                    {client.phone && <span>{client.phone}</span>}
                                    <span>Rate: ₹{client.defaultRate}/reel</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                                View Client <ArrowRight size={13} />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Logs Section */}
                    {(activeCategory === 'all' || activeCategory === 'work') && filteredWork.length > 0 && (
                      <div className="pt-2 first:pt-0">
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ClipboardList size={12} className="text-indigo-500 dark:text-indigo-400" /> Work Logs ({filteredWork.length})
                        </div>
                        <div className="mt-1 space-y-1">
                          {filteredWork.map(work => {
                            const client = clients.find(c => c.id === work.clientId);
                            return (
                              <button
                                key={work.id}
                                onClick={() => handleSelectWork(work)}
                                className="w-full text-left p-3 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 rounded-xl transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                                    <ClipboardList size={16} className="text-slate-600 dark:text-slate-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 truncate">
                                      {work.description}
                                    </div>
                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2.5 mt-0.5 flex-wrap">
                                      <span className="font-medium text-slate-600 dark:text-slate-400">{client ? client.name : 'Unknown Client'}</span>
                                      <span>•</span>
                                      <span>{new Date(work.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                      <span>•</span>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">₹{(work.quantity * work.rate).toLocaleString('en-IN')}</span>
                                      {work.status === 'Invoiced' ? (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                          <CheckCircle2 size={10} /> Invoiced
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                          <Clock size={10} /> Uninvoiced
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                                  View Log <ArrowRight size={13} />
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Invoices Section */}
                    {(activeCategory === 'all' || activeCategory === 'invoices') && filteredInvoices.length > 0 && (
                      <div className="pt-2 first:pt-0">
                        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={12} className="text-indigo-500 dark:text-indigo-400" /> Invoices ({filteredInvoices.length})
                        </div>
                        <div className="mt-1 space-y-1">
                          {filteredInvoices.map(inv => (
                            <button
                              key={inv.id}
                              onClick={() => handleSelectInvoice(inv)}
                              className="w-full text-left p-3 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 rounded-xl transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                  #{inv.id.substring(0, 4).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 flex items-center gap-2">
                                    <span>#{inv.id.substring(0, 8).toUpperCase()}</span>
                                    <span className="text-slate-400 dark:text-slate-600 font-normal">•</span>
                                    <span>{inv.clientName}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    <span>•</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-200">₹{inv.totalAmount.toLocaleString('en-IN')}</span>
                                    <span>•</span>
                                    <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                                      inv.status === 'Paid'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                    }`}>
                                      {inv.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                                View Invoice <ArrowRight size={13} />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Worked Days / Career Journey Widget */}
        <div className="relative shrink-0" ref={journeyMenuRef}>
          {journey ? (
            <>
              <button
                type="button"
                onClick={() => setShowJourneyMenu(!showJourneyMenu)}
                className={`py-1.5 px-2.5 md:px-3 md:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 md:gap-2 transition-all cursor-pointer shadow-2xs border ${
                  journey.currentAnniversary
                    ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-indigo-500/15 text-amber-700 dark:text-amber-300 border-amber-400/50 dark:border-amber-400/40 animate-pulse hover:border-amber-500'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100/90 dark:hover:bg-amber-900/50 border-amber-200/80 dark:border-amber-800/60'
                }`}
                title={`Started: ${journey.startDateFormatted} (${journey.workedDays} days freelancing). Click for journey details.`}
              >
                {journey.currentAnniversary ? (
                  <>
                    <PartyPopper size={16} className="text-amber-500 animate-bounce" />
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {journey.currentAnniversary.badge} <span className="hidden sm:inline">Milestone!</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Flame size={16} className="text-amber-500 fill-amber-500/20" />
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {journey.workedDays}
                    </span>
                    <span className="hidden sm:inline text-slate-600 dark:text-slate-300 font-medium">
                      days worked
                    </span>
                    <span className="sm:hidden text-slate-600 dark:text-slate-300 font-medium">
                      d
                    </span>
                  </>
                )}
              </button>

              {/* Journey Details Popover */}
              {showJourneyMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Flame size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Freelancing Journey</h4>
                        <p className="text-[10px] text-slate-400">Since {journey.startDateFormatted}</p>
                      </div>
                    </div>
                    {onEditProfile && (
                      <button
                        type="button"
                        onClick={() => { setShowJourneyMenu(false); onEditProfile(); }}
                        className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Edit Date
                      </button>
                    )}
                  </div>

                  <div className="py-3 space-y-2.5">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Worked</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {journey.workedDays} <span className="text-xs font-normal text-slate-500">days</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Duration</span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {journey.formattedDuration}
                        </span>
                      </div>
                    </div>

                    {journey.currentAnniversary && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{journey.currentAnniversary.emoji}</span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            {journey.currentAnniversary.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                          {journey.currentAnniversary.description}
                        </p>
                        {onOpenAnniversaryModal && (
                          <button
                            type="button"
                            onClick={() => { setShowJourneyMenu(false); onOpenAnniversaryModal(); }}
                            className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            View Celebration Card 🎉
                          </button>
                        )}
                      </div>
                    )}

                    {journey.nextMilestone && (
                      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-indigo-500 shrink-0" />
                          <div className="text-[11px] text-slate-700 dark:text-slate-300">
                            Next milestone: <strong className="font-semibold text-indigo-700 dark:text-indigo-300">{journey.nextMilestone.badge}</strong>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-2xs border border-indigo-100 dark:border-indigo-800">
                          in {Math.abs(journey.nextMilestone.diffDays)}d
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : onEditProfile ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="py-1.5 px-2.5 md:px-3 md:py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Set your freelancing start date to track worked days"
            >
              <Calendar size={14} className="text-slate-400" />
              <span className="hidden sm:inline">+ Start Date</span>
              <span className="sm:hidden">+ Date</span>
            </button>
          ) : null}
        </div>

        {/* Theme Switcher Button & Dropdown */}
        <div className="relative shrink-0" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 md:px-3 md:py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/70 transition-all flex items-center gap-2 cursor-pointer shadow-2xs group"
            title={`Current theme: ${theme === 'system' ? `Auto (${resolvedTheme})` : theme}. Click to change theme.`}
            aria-label="Toggle Theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun size={17} className="text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon size={17} className="text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
            )}
            <span className="hidden lg:inline-block text-xs font-semibold capitalize">
              {theme === 'system' ? `Auto (${resolvedTheme})` : theme}
            </span>
          </button>

          {/* Theme Dropdown Menu */}
          {showThemeMenu && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Theme Options
              </div>

              <button
                onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sun size={15} className="text-amber-500" />
                <span>Light Theme</span>
              </button>

              <button
                onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Moon size={15} className="text-indigo-400" />
                <span>Dark Theme</span>
              </button>

              <button
                onClick={() => { setTheme('system'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Monitor size={15} className="text-slate-400" />
                <span>System Auto</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
