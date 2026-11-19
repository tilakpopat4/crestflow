import React from 'react';
import { Phone, Mail, Download, Send } from 'lucide-react';
import { Client, WorkItem, Invoice } from '../../types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { getDriveDirectImageUrl } from '../../lib/utils';
import { exportClientCSV } from '../../lib/csvExport';
import { generateWhatsAppReminder } from '../../lib/paymentUtils';

interface ClientHeaderCardProps {
  client: Client;
  currencySymbol: string;
  clientWorkItems: WorkItem[];
  clientInvoices: Invoice[];
  statusInfo: { daysRemaining?: number; nextDueDate?: number; isOverdue?: boolean; [key: string]: any };
  onUpdateClient: (updatedClient: Client) => Promise<void>;
}

/**
 * Main Client Profile Header Card.
 * Displays client branding, contact credentials, email reminder toggle, and quick exports.
 */
export function ClientHeaderCard({
  client,
  currencySymbol,
  clientWorkItems,
  clientInvoices,
  statusInfo,
  onUpdateClient,
}: ClientHeaderCardProps) {
  const handleToggleEmailReminder = async () => {
    try {
      const updated = {
        ...client,
        emailRemindersEnabled: client.emailRemindersEnabled === false ? true : false,
      };
      await onUpdateClient(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface-700 border border-surface-400 rounded-xl p-4 sm:p-6 shadow-xs relative overflow-hidden w-full min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 w-full min-w-0">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {client.logoUrl ? (
            <img
              src={getDriveDirectImageUrl(client.logoUrl)}
              alt={client.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-surface-400 shrink-0 bg-surface-600"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=282828&color=ffffff&size=128&rounded=true&bold=true`;
              }}
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface-600 border border-surface-400 text-text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight truncate">
                {client.name}
              </h1>
              {client.isClosed && <StatusBadge status="Closed" label="Closed" />}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-xs text-text-secondary min-w-0">
              <span className="flex items-center gap-1.5 truncate">
                <Phone size={13} className="text-text-muted shrink-0" />
                <span className="font-mono">{client.phone}</span>
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5 truncate">
                  <Mail size={13} className="text-text-muted shrink-0" />
                  <span>{client.email}</span>
                </span>
              )}
              <span className="text-text-muted truncate">
                Since:{' '}
                {client.clientFrom
                  ? new Date(client.clientFrom + '-01').toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : new Date(client.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}
              </span>
              <span className="text-text-secondary font-medium truncate">
                Currency:{' '}
                <span className="text-text-primary font-mono">
                  {client.currency || 'INR'} ({currencySymbol})
                </span>
              </span>
              {client.instagram && (
                <a
                  href={
                    client.instagram.startsWith('http')
                      ? client.instagram
                      : `https://instagram.com/${client.instagram.replace('@', '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-text-primary hover:underline"
                >
                  Instagram
                </a>
              )}
            </div>

            {client.workExperience && (
              <div className="mt-3 text-xs text-text-secondary bg-surface-800 border border-surface-400/70 p-2.5 rounded-lg max-w-xl">
                <span className="font-semibold text-text-primary">Experience / Notes:</span>{' '}
                {client.workExperience}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleEmailReminder}
            className="gap-1.5"
            title="Toggle email reminders for overdue payments"
          >
            <Mail
              size={13}
              className={client.emailRemindersEnabled !== false ? 'text-text-primary' : 'text-text-muted'}
            />
            <span>Email: {client.emailRemindersEnabled !== false ? 'ON' : 'OFF'}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportClientCSV(client, clientWorkItems, clientInvoices)}
            className="gap-1.5"
            title="Export client history as CSV"
          >
            <Download size={13} className="text-text-muted" />
            <span>CSV</span>
          </Button>

          <a
            href={generateWhatsAppReminder(client, statusInfo as any)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-surface-500 hover:bg-surface-400 text-text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-surface-400"
          >
            <Send size={13} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default ClientHeaderCard;
