import React from 'react';
import { Client, Invoice, WorkItem } from '../../types';
import { Edit2, Trash2, Download, Archive, ArchiveRestore, Users, ChevronRight } from 'lucide-react';
import { cn, getDriveDirectImageUrl } from '../../lib/utils';
import { exportClientCSV } from '../../lib/csvExport';
import { formatCurrencyAmount } from '../../lib/currencyUtils';
import StatusBadge from '../StatusBadge';
import { Button } from '../ui/button';

interface ClientCardProps {
  client: Client;
  statusInfo: { nextDueDate: string | number; isOverdue?: boolean; daysRemaining?: number; [key: string]: any };
  financials: { totalPendingAmount?: number; totalEarned?: number; paidTotal?: number; [key: string]: any };
  invoices: Invoice[];
  workItems: WorkItem[];
  onSelect: (clientId: string) => void;
  onEdit: (client: Client) => void;
  onCloseClient: (client: Client) => void;
  onReopenClient: (client: Client) => void;
  onDeleteClient: (clientId: string, clientName: string) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  statusInfo,
  financials,
  invoices,
  workItems,
  onSelect,
  onEdit,
  onCloseClient,
  onReopenClient,
  onDeleteClient,
}) => {
  const formattedPrevDate =
    client.lastPaymentDate && !isNaN(new Date(client.lastPaymentDate).getTime())
      ? new Date(client.lastPaymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : 'Not set';

  const nextDueTime = typeof statusInfo.nextDueDate === 'number'
    ? statusInfo.nextDueDate
    : new Date(statusInfo.nextDueDate).getTime();
  const formattedNextDate = !isNaN(nextDueTime)
    ? new Date(nextDueTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <div
      className={`rounded-xl border border-surface-400 p-4 sm:p-5 shadow-2xs transition-all flex flex-col justify-between space-y-4 overflow-hidden w-full min-w-0 ${
        client.isClosed
          ? 'bg-surface-800/60 opacity-80 hover:opacity-100'
          : 'bg-surface-700 hover:border-surface-400/90'
      }`}
    >
      <div className="space-y-3.5 min-w-0 w-full">
        {/* Top row: Avatar & Client Name & Quiet Actions */}
        <div className="flex items-start justify-between gap-2 min-w-0 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {client.logoUrl ? (
              <img
                src={getDriveDirectImageUrl(client.logoUrl)}
                alt={client.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-lg object-cover bg-surface-600 border border-surface-400 shrink-0 shadow-2xs"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=282828&color=f1f1f1&size=128&rounded=true&bold=true`;
                }}
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-surface-600 border border-surface-400 text-text-primary flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3
                className="text-sm sm:text-base font-semibold text-text-primary leading-snug truncate"
                title={client.name}
              >
                {client.name}
              </h3>
              <p className="text-[11px] text-text-muted font-mono truncate">ID: {client.id.split('-')[0]}</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="icon"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                const cWorkItems = workItems.filter((item) => item.clientId === client.id);
                const cInvoices = invoices.filter((inv) => inv.clientId === client.id);
                exportClientCSV(client, cWorkItems, cInvoices);
              }}
              title="Export Work History to CSV"
            >
              <Download size={13} />
            </Button>
            <Button
              variant="icon"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(client);
              }}
              title="Edit Client Profile"
            >
              <Edit2 size={13} />
            </Button>
            {client.isClosed ? (
              <Button
                variant="icon"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onReopenClient(client);
                }}
                title="Reopen Client"
              >
                <ArchiveRestore size={13} />
              </Button>
            ) : (
              <Button
                variant="icon"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseClient(client);
                }}
                title="Close Work with Client"
              >
                <Archive size={13} />
              </Button>
            )}
            <Button
              variant="icon"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClient(client.id, client.name);
              }}
              className="hover:text-accent"
              title="Delete Client"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        {/* Badges / Retainer info */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {client.isClosed && (
            <StatusBadge
              status="Closed"
              label={`Closed${client.closedAt ? ` · ${new Date(client.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`}
            />
          )}
          {client.subClients && client.subClients.length > 0 && (
            <span className="text-xs text-text-secondary font-normal inline-flex items-center gap-1">
              <Users size={12} className="shrink-0 text-text-muted" /> {client.subClients.length} Subs
            </span>
          )}
          {client.paymentBasis === 'monthly_retainer' && (
            <span className="text-xs font-medium text-text-secondary">
              Monthly Retainer
            </span>
          )}
        </div>

        {/* 30-Day Cycle Dates Row */}
        <div className="bg-surface-800 border border-surface-500 p-2.5 sm:p-3 rounded-lg grid grid-cols-2 gap-2 text-xs w-full min-w-0">
          <div className="min-w-0">
            <span className="text-text-muted block text-[10px] font-semibold uppercase tracking-wider truncate">
              Prev Payment
            </span>
            <span className="font-semibold font-mono tabular-nums text-text-primary text-xs sm:text-sm truncate block mt-0.5">
              {formattedPrevDate}
            </span>
          </div>

          <div className="border-l border-surface-500 pl-2.5 min-w-0">
            <span className="text-text-muted block text-[10px] font-semibold uppercase tracking-wider truncate">
              Next Due
            </span>
            <span className="font-semibold font-mono tabular-nums text-text-primary text-xs sm:text-sm truncate block mt-0.5">
              {formattedNextDate}
            </span>
          </div>
        </div>

        {/* Financials & Rates */}
        <div className="flex items-center justify-between text-xs pt-0.5 gap-2 w-full min-w-0">
          <div className="min-w-0">
            <span className="text-text-muted block text-[11px] truncate">
              {client.paymentBasis === 'monthly_retainer' ? 'Retainer' : 'Default Rate'}
            </span>
            <span className="font-semibold font-mono tabular-nums text-text-primary text-xs sm:text-sm truncate block mt-0.5">
              {formatCurrencyAmount(
                client.paymentBasis === 'monthly_retainer'
                  ? client.monthlyRetainerAmount || client.defaultRate
                  : client.defaultRate,
                client.currency
              )}
              {client.paymentBasis === 'monthly_retainer' ? ' / mo' : ' / reel'}
            </span>
          </div>

          <div className="text-right min-w-0">
            <span className="text-text-muted block text-[11px] truncate">Pending</span>
            <span
              className={`font-semibold font-mono tabular-nums text-xs sm:text-sm truncate block mt-0.5 ${
                (financials.totalPendingAmount ?? 0) > 0 ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              {formatCurrencyAmount(financials.totalPendingAmount ?? 0, client.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Row (Steel Blue button for Open Dashboard per Image 3) */}
      <div className="flex items-center gap-2 pt-1 w-full min-w-0">
        <Button
          variant={client.isClosed ? "secondary" : "blue"}
          size="sm"
          onClick={() => onSelect(client.id)}
          className="flex-1 font-semibold justify-between h-9 px-3"
        >
          <span className="truncate">{client.isClosed ? 'View History' : 'Open Dashboard'}</span>
          <ChevronRight size={14} className={cn("shrink-0", client.isClosed ? "text-text-secondary" : "text-white")} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(client);
          }}
          className="h-9 w-9 shrink-0"
          title="Edit Client Profile"
        >
          <Edit2 size={13} />
        </Button>

        {client.isClosed ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onReopenClient(client);
            }}
            className="h-9 px-2.5 shrink-0"
            title="Reopen Client"
          >
            <ArchiveRestore size={13} /> <span className="hidden min-[380px]:inline">Reopen</span>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const cWorkItems = workItems.filter((item) => item.clientId === client.id);
              const cInvoices = invoices.filter((inv) => inv.clientId === client.id);
              exportClientCSV(client, cWorkItems, cInvoices);
            }}
            className="h-9 px-2.5 shrink-0"
            title="Export to CSV"
          >
            <Download size={13} /> <span>CSV</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ClientCard;
