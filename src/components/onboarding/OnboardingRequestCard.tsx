import React from 'react';
import { Phone, Mail, Instagram, Clock } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ServiceRequest } from '../../types';

interface OnboardingRequestCardProps {
  request: ServiceRequest;
  onAccept: (request: ServiceRequest) => Promise<void>;
  onDecline: (request: ServiceRequest) => Promise<void>;
  onRestore?: (request: ServiceRequest) => Promise<void>;
  onNavigateToClients?: () => void;
}

/**
 * OnboardingRequestCard renders an incoming client onboarding lead or request,
 * displaying contact details, project scope, proposed rates, and workflow actions.
 */
export const OnboardingRequestCard: React.FC<OnboardingRequestCardProps> = ({
  request,
  onAccept,
  onDecline,
  onRestore,
  onNavigateToClients,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const getStatusBadge = () => {
    switch (request.status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 dark:text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Declined
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4">
      <div className="space-y-3">
        {/* Header: Client & Status */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {request.clientName}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Contact: <span className="font-semibold text-slate-800 dark:text-slate-200">{request.contactName}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {getStatusBadge()}
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Clock size={12} />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Proposed Rate */}
        {request.proposedRate && (
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Proposed Rate: <span className="text-indigo-600 dark:text-indigo-400">₹{request.proposedRate} / reel</span>
          </div>
        )}

        {/* Project Scope / Description */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {request.projectDetails}
        </div>

        {/* Contact Links */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 pt-1">
          {request.contactPhone && (
            <a
              href={`tel:${request.contactPhone}`}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <Phone size={14} className="text-slate-400" />
              <span>{request.contactPhone}</span>
            </a>
          )}

          {request.contactEmail && (
            <a
              href={`mailto:${request.contactEmail}`}
              className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <Mail size={14} className="text-slate-400" />
              <span>{request.contactEmail}</span>
            </a>
          )}

          {request.instagram && (
            <a
              href={request.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Instagram size={14} />
              <span>Instagram</span>
            </a>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        {request.status === 'pending' && (
          <>
            <motion.button
              type="button"
              onClick={() => onDecline(request)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-0"
            >
              Decline
            </motion.button>
            <motion.button
              type="button"
              onClick={() => onAccept(request)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-0 shadow-2xs"
            >
              Accept &amp; Add Client
            </motion.button>
          </>
        )}

        {request.status === 'accepted' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Client Added</span>
            {onNavigateToClients && (
              <motion.button
                type="button"
                onClick={onNavigateToClients}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer border-0 bg-transparent"
              >
                View in Clients
              </motion.button>
            )}
          </div>
        )}

        {request.status === 'declined' && onRestore && (
          <motion.button
            type="button"
            onClick={() => onRestore(request)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer border-0 bg-transparent"
          >
            Restore Request
          </motion.button>
        )}
      </div>
    </div>
  );
};
