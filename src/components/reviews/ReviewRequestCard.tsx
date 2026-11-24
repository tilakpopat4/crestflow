import React from 'react';
import { Copy, Check, Mail } from 'lucide-react';
import { Client } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/button';

interface ReviewRequestCardProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  copiedClientId: string | null;
  onCopyLink: (client: Client) => void;
  onEmailClient: (client: Client) => void;
}

/**
 * ReviewRequestCard Component
 * Enables sending review invitations to active clients via email or link copy.
 */
export const ReviewRequestCard: React.FC<ReviewRequestCardProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  copiedClientId,
  onCopyLink,
  onEmailClient,
}) => {
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <Card className="p-6 flex flex-col justify-between bg-surface-700 border-0 shadow-none">
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary text-sm tracking-tight">
          Request Review
        </h3>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-text-secondary">
            Client
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="w-full border border-surface-400 rounded-lg px-3 py-2 text-xs sm:text-sm bg-surface-800 text-text-primary outline-none transition-colors focus:border-surface-300 font-medium cursor-pointer"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-4 flex items-center gap-2.5">
        {selectedClient ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCopyLink(selectedClient)}
              className="flex-1 text-xs border-0"
            >
              {copiedClientId === selectedClient.id ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onEmailClient(selectedClient)}
              className="flex-1 text-xs border-0"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </Button>
          </>
        ) : (
          <div className="w-full text-center text-xs text-text-muted bg-surface-800/60 border-0 py-2.5 rounded-lg">
            Select a client to share link
          </div>
        )}
      </div>
    </Card>
  );
};
