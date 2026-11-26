import { useState, useEffect, useRef } from 'react';
import { Client, WorkItem, Invoice } from '../types';
import { formatInvoiceNumber } from '../lib/invoiceUtils';
import { Tab } from '../App';

interface UseGlobalHeaderSearchParams {
  clients: Client[];
  workItems: WorkItem[];
  invoices: Invoice[];
  globalQuery: string;
  setActiveTab: (tab: Tab, query?: string) => void;
  onSearchSelect?: (type: 'client' | 'work' | 'invoice', id: string, query?: string) => void;
}

/**
 * Manages global header search state, keyboard shortcuts, click-outside dismissal, and result filtering.
 */
export function useGlobalHeaderSearch({
  clients,
  workItems,
  invoices,
  globalQuery,
  setActiveTab,
  onSearchSelect,
}: UseGlobalHeaderSearchParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [showJourneyMenu, setShowJourneyMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'clients' | 'work' | 'invoices'>('all');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const journeyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setShowJourneyMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsOpen(false);
      if (journeyMenuRef.current && !journeyMenuRef.current.contains(e.target as Node)) setShowJourneyMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanQuery = globalQuery.trim().toLowerCase();

  const filteredClients = cleanQuery
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          (c.email && c.email.toLowerCase().includes(cleanQuery)) ||
          (c.phone && c.phone.toLowerCase().includes(cleanQuery)),
      )
    : [];

  const filteredWork = cleanQuery
    ? workItems.filter((w) => {
        const client = clients.find((c) => c.id === w.clientId);
        if (client?.isClosed) return false;
        const clientName = client ? client.name.toLowerCase() : '';
        return (
          w.description.toLowerCase().includes(cleanQuery) ||
          clientName.includes(cleanQuery) ||
          (w.videoUrl && w.videoUrl.toLowerCase().includes(cleanQuery))
        );
      })
    : [];

  const filteredInvoices = cleanQuery
    ? invoices.filter((inv) => {
        const client = clients.find((c) => c.id === inv.clientId || c.name === inv.clientName);
        if (client?.isClosed) return false;
        const invoiceNo = formatInvoiceNumber(inv, invoices).toLowerCase();
        const itemsText = inv.reels ? inv.reels.map((r) => r.title).join(' ').toLowerCase() : '';
        return (
          inv.clientName.toLowerCase().includes(cleanQuery) ||
          invoiceNo.includes(cleanQuery) ||
          itemsText.includes(cleanQuery)
        );
      })
    : [];

  const handleSelectClient = (client: Client) => {
    setIsOpen(false);
    if (onSearchSelect) onSearchSelect('client', client.id, globalQuery);
    else setActiveTab('clients', globalQuery);
  };

  const handleSelectWork = (work: WorkItem) => {
    setIsOpen(false);
    if (onSearchSelect) onSearchSelect('work', work.id, globalQuery);
    else setActiveTab('work', globalQuery);
  };

  const handleSelectInvoice = (inv: Invoice) => {
    setIsOpen(false);
    if (onSearchSelect) onSearchSelect('invoice', inv.id, globalQuery);
    else setActiveTab('invoice', globalQuery);
  };

  return {
    isOpen,
    setIsOpen,
    showJourneyMenu,
    setShowJourneyMenu,
    activeCategory,
    setActiveCategory,
    searchRef,
    inputRef,
    journeyMenuRef,
    cleanQuery,
    filteredClients,
    filteredWork,
    filteredInvoices,
    handleSelectClient,
    handleSelectWork,
    handleSelectInvoice,
  };
}
