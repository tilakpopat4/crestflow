import React from 'react';
import { ServiceRequest } from '../../types';
import { Briefcase, Phone, Mail, Instagram } from 'lucide-react';
import { Button } from '../ui/button';

interface ClientLeadsSectionProps {
  serviceRequests: ServiceRequest[];
  onAccept: (req: ServiceRequest) => void;
  onDecline: (req: ServiceRequest) => void;
}

export const ClientLeadsSection: React.FC<ClientLeadsSectionProps> = ({
  serviceRequests,
  onAccept,
  onDecline,
}) => {
  const pendingRequests = serviceRequests.filter((req) => req.status === 'pending');
  if (pendingRequests.length === 0) return null;

  return (
    <div className="bg-surface-700 border border-surface-400 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5 text-text-primary font-semibold text-sm">
        <div className="w-7 h-7 rounded-lg bg-surface-600 border border-surface-400 flex items-center justify-center text-text-secondary">
          <Briefcase size={15} />
        </div>
        <span>Incoming Client Onboardings & Inquiries ({pendingRequests.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {pendingRequests.map((req) => (
          <div
            key={req.id}
            className="bg-surface-800 border border-surface-500 p-4 rounded-xl shadow-2xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-text-primary text-sm">{req.clientName}</h4>
                  <p className="text-xs text-text-secondary">Contact: {req.contactName}</p>
                </div>
                {req.proposedRate ? (
                  <span className="text-xs font-mono tabular-nums text-text-secondary">
                    ₹{req.proposedRate}/reel
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-text-secondary leading-relaxed bg-surface-700 border border-surface-500 p-2.5 rounded-lg">
                {req.projectDetails}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
                <span className="flex items-center gap-1 font-mono">
                  <Phone size={12} /> {req.contactPhone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {req.contactEmail}
                </span>
                {req.instagram && (
                  <a
                    href={req.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-text-secondary hover:text-text-primary hover:underline"
                  >
                    <Instagram size={12} /> Instagram
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-500">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDecline(req)}
              >
                Decline
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAccept(req)}
              >
                Accept & Create Client
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientLeadsSection;
