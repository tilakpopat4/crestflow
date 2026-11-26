import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Search, Users, ClipboardList, FileText, ArrowRight } from 'lucide-react';
import { Client, WorkItem, Invoice } from '../../types';
import { formatInvoiceNumber } from '../../lib/invoiceUtils';
import StatusBadge from '../StatusBadge';

interface GlobalSearchDropdownProps {
  activeCategory: 'all' | 'clients' | 'work' | 'invoices';
  setActiveCategory: (cat: 'all' | 'clients' | 'work' | 'invoices') => void;
  clients: Client[];
  filteredClients: Client[];
  filteredWork: WorkItem[];
  filteredInvoices: Invoice[];
  invoices: Invoice[];
  onSelectClient: (client: Client) => void;
  onSelectWork: (work: WorkItem) => void;
  onSelectInvoice: (inv: Invoice) => void;
}

/**
 * Search results overlay dropdown for GlobalHeader across clients, work logs, and invoices.
 */
export default function GlobalSearchDropdown({
  activeCategory,
  setActiveCategory,
  clients,
  filteredClients,
  filteredWork,
  filteredInvoices,
  invoices,
  onSelectClient,
  onSelectWork,
  onSelectInvoice,
}: GlobalSearchDropdownProps) {
  const shouldReduceMotion = useReducedMotion();
  const totalResults = filteredClients.length + filteredWork.length + filteredInvoices.length;

  return (
    <div className="absolute left-0 right-0 top-full mt-2 bg-[#131318] rounded-xl border border-[#2A2A33] overflow-hidden z-50 max-h-[80vh] flex flex-col">
      <div className="p-3 bg-[#1B1B22] border-b border-[#2A2A33] flex items-center justify-between text-xs gap-2 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 font-medium">
          {[
            { id: 'all' as const, label: `All (${totalResults})`, icon: null },
            { id: 'clients' as const, label: `Clients (${filteredClients.length})`, icon: Users },
            { id: 'work' as const, label: `Work Logs (${filteredWork.length})`, icon: ClipboardList },
            { id: 'invoices' as const, label: `Invoices (${filteredInvoices.length})`, icon: FileText },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                className={`relative px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border-0 bg-transparent select-none ${
                  isSelected ? 'text-[#F7F7F8]' : 'text-[#A1A1AA] hover:bg-[#2A2A33]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="searchCategoryFilterIndicator"
                    className="absolute inset-0 bg-[#2A2A33] rounded-lg -z-0"
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {Icon && <Icon size={12} />}
                  {cat.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        <span className="text-[11px] text-[#A1A1AA] font-medium shrink-0">Real-time results</span>
      </div>

      <div className="overflow-y-auto p-2 space-y-4 divide-y divide-[#2A2A33]">
        {totalResults === 0 ? (
          <div className="p-8 text-center text-[#A1A1AA] space-y-2">
            <Search className="w-7 h-7 text-[#A1A1AA] mx-auto" />
            <p className="text-sm font-semibold text-[#F7F7F8]">No matching records found</p>
            <p className="text-xs text-[#A1A1AA]">Try a client name, project description, reel title, or invoice ID.</p>
          </div>
        ) : (
          <>
            {(activeCategory === 'all' || activeCategory === 'clients') && filteredClients.length > 0 && (
              <div className="pt-2 first:pt-0">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} /> Clients ({filteredClients.length})
                </div>
                <div className="mt-1 space-y-1">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => onSelectClient(client)}
                      className="w-full text-left p-3 hover:bg-[#1B1B22] rounded-xl transition-colors flex items-center justify-between group cursor-pointer border-0 bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1B1B22] border border-[#2A2A33] text-[#F7F7F8] font-bold flex items-center justify-center text-sm shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs md:text-sm text-[#F7F7F8]">{client.name}</div>
                          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-3 mt-0.5 tabular-figures">
                            {client.email && <span>{client.email}</span>}
                            {client.phone && <span>{client.phone}</span>}
                            <span>Rate: ₹{client.defaultRate}/reel</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#F7F7F8] flex items-center gap-1 shrink-0">
                        View Client <ArrowRight size={13} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(activeCategory === 'all' || activeCategory === 'work') && filteredWork.length > 0 && (
              <div className="pt-2 first:pt-0">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList size={12} /> Work Logs ({filteredWork.length})
                </div>
                <div className="mt-1 space-y-1">
                  {filteredWork.map((work) => {
                    const client = clients.find((c) => c.id === work.clientId);
                    return (
                      <button
                        key={work.id}
                        type="button"
                        onClick={() => onSelectWork(work)}
                        className="w-full text-left p-3 hover:bg-[#1B1B22] rounded-xl transition-colors flex items-center justify-between group cursor-pointer border-0 bg-transparent"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-9 h-9 rounded-xl bg-[#1B1B22] border border-[#2A2A33] text-[#A1A1AA] flex items-center justify-center shrink-0">
                            <ClipboardList size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs md:text-sm text-[#F7F7F8] truncate">
                              {work.description}
                            </div>
                            <div className="text-[11px] text-[#A1A1AA] flex items-center gap-2 mt-0.5 flex-wrap tabular-figures">
                              <span className="font-medium text-[#F7F7F8]">{client ? client.name : 'Unknown Client'}</span>
                              <span>·</span>
                              <span>{new Date(work.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#F7F7F8]">₹{(work.quantity * work.rate).toLocaleString('en-IN')}</span>
                              <span>·</span>
                              <StatusBadge status={work.status === 'Invoiced' ? 'Invoiced' : 'Pending'} />
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#F7F7F8] flex items-center gap-1 shrink-0">
                          View Log <ArrowRight size={13} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(activeCategory === 'all' || activeCategory === 'invoices') && filteredInvoices.length > 0 && (
              <div className="pt-2 first:pt-0">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={12} /> Invoices ({filteredInvoices.length})
                </div>
                <div className="mt-1 space-y-1">
                  {filteredInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => onSelectInvoice(inv)}
                      className="w-full text-left p-3 hover:bg-[#1B1B22] rounded-xl transition-colors flex items-center justify-between group cursor-pointer border-0 bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1B1B22] border border-[#2A2A33] text-[#F7F7F8] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          #{inv.id.substring(0, 4).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs md:text-sm text-[#F7F7F8] flex items-center gap-2">
                            <span>{formatInvoiceNumber(inv, invoices)}</span>
                            <span className="text-[#A1A1AA] font-normal">·</span>
                            <span>{inv.clientName}</span>
                          </div>
                          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-2 mt-0.5 tabular-figures">
                            <span>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span>·</span>
                            <span className="font-bold text-[#F7F7F8]">₹{inv.totalAmount.toLocaleString('en-IN')}</span>
                            <span>·</span>
                            <StatusBadge status={inv.status} />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#F7F7F8] flex items-center gap-1 shrink-0">
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
  );
}
