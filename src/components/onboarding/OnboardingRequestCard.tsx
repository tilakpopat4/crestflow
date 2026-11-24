import React from 'react';
import { Phone, Mail, Instagram, Clock } from 'lucide-react';
import { ServiceRequest } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/button';

interface OnboardingRequestCardProps {
  request: ServiceRequest;
  onAccept: (request: ServiceRequest) => Promise<void>;
  onDecline: (request: ServiceRequest) => Promise<void>;
  onRestore?: (request: ServiceRequest) => Promise<void>;
  onNavigateToClients?: () => void;
}

/**
 * OnboardingRequestCard Component
 * Displays an incoming client onboarding lead with actions to accept, decline, or restore.
 */
export const OnboardingRequestCard: React.FC<OnboardingRequestCardProps> = ({
  request,
  onAccept,
  onDecline,
  onRestore,
  onNavigateToClients,
}) => {
  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const renderStatus = () => {
    switch (request.status) {
      case 'accepted':
        return <span className="text-xs font-medium text-text-primary">Accepted</span>;
      case 'declined':
        return <span className="text-xs font-medium text-text-muted">Declined</span>;
      case 'pending':
      default:
        return <span className="text-xs font-medium text-text-secondary">Pending</span>;
    }
  };

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between gap-4 bg-surface-700 border-surface-400">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary tracking-tight">
              {request.clientName}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {request.contactName}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {renderStatus()}
            <span className="text-xs text-text-muted flex items-center gap-1 font-mono tabular-nums">
              <Clock size={12} />
              {formattedDate}
            </span>
          </div>
        </div>

        {request.proposedRate && (
          <div className="text-xs text-text-secondary">
            Rate:{' '}
            <span className="text-text-primary font-mono tabular-nums font-semibold">
              ₹{request.proposedRate} / reel
            </span>
          </div>
        )}

        <div className="bg-surface-800 border border-surface-400 rounded-lg p-3 text-xs text-text-secondary leading-relaxed whitespace-pre-line">
          {request.projectDetails}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
          {request.contactPhone && (
            <a
              href={`tel:${request.contactPhone}`}
              className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              <Phone size={13} className="text-text-muted" />
              <span className="font-mono tabular-nums">{request.contactPhone}</span>
            </a>
          )}

          {request.contactEmail && (
            <a
              href={`mailto:${request.contactEmail}`}
              className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              <Mail size={13} className="text-text-muted" />
              <span>{request.contactEmail}</span>
            </a>
          )}

          {request.instagram && (
            <a
              href={request.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
            >
              <Instagram size={13} />
              <span>Instagram</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-400/80">
        {request.status === 'pending' && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onDecline(request)}
              className="text-xs"
            >
              Decline
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onAccept(request)}
              className="text-xs font-semibold"
            >
              Accept
            </Button>
          </>
        )}

        {request.status === 'accepted' && onNavigateToClients && (
          <button
            type="button"
            onClick={onNavigateToClients}
            className="text-xs font-medium text-text-secondary hover:text-text-primary cursor-pointer border-0 bg-transparent"
          >
            View client
          </button>
        )}

        {request.status === 'declined' && onRestore && (
          <button
            type="button"
            onClick={() => onRestore(request)}
            className="text-xs font-medium text-text-muted hover:text-text-primary cursor-pointer border-0 bg-transparent"
          >
            Restore
          </button>
        )}
      </div>
    </Card>
  );
};

export default OnboardingRequestCard;
