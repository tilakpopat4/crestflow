import React from 'react';
import { Share2, Copy, Check, Mail } from 'lucide-react';
import { Client } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

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
 * Enables sending review invitations to existing clients via email or link copy.
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
    <Card className="p-6 flex flex-col justify-between bg-surface-700 border-surface-400">
      <div className="space-y-4">
        <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
          <Share2 className="w-4 h-4 text-accent" /> Request a Review
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          Generate a personalized review submission link to send directly to your clients.
        </p>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Select Client
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="w-full border border-surface-400 rounded-lg px-3 py-2 text-sm bg-surface-800 text-text-primary outline-none transition-colors focus:border-surface-300 font-medium cursor-pointer"
          >
            <option value="">-- Choose an active client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-5 flex items-center gap-3">
        {selectedClient ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCopyLink(selectedClient)}
              className="flex-1 text-xs"
            >
              {copiedClientId === selectedClient.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-accent" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onEmailClient(selectedClient)}
              className="flex-1 text-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Client</span>
            </Button>
          </>
        ) : (
          <div className="w-full text-center text-xs text-text-muted bg-surface-800/60 border border-dashed border-surface-400 py-3 rounded-lg font-medium">
            Select a client to generate invite link
          </div>
        )}
      </div>
    </Card>
  );
};
