import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Search, UserPlus, Inbox, Users, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile, ServiceRequest, Client } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { generateUUID } from '../lib/utils';
import { OnboardingLinkCard } from './onboarding/OnboardingLinkCard';
import { OnboardingRequestCard } from './onboarding/OnboardingRequestCard';

interface ClientOnboardingTabProps {
  user: User;
  profile: UserProfile | null;
  onNavigateToClients?: () => void;
}

type FilterStatus = 'pending' | 'accepted' | 'declined' | 'all';

/**
 * ClientOnboardingTab provides freelancers with a dedicated hub to:
 * 1. View, copy, and share their branded public onboarding link & QR code.
 * 2. Track, review, and convert incoming client inquiries into active clients.
 */
export default function ClientOnboardingTab({
  user,
  profile,
  onNavigateToClients,
}: ClientOnboardingTabProps) {
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');

  const { data: serviceRequests, loading, addOrUpdateItem: updateServiceRequest } =
    useFirestore<ServiceRequest>('serviceRequests', user.uid);
  const { addOrUpdateItem: saveClient } =
    useFirestore<Client>('clients', user.uid);

  const onboardingUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (import.meta.env.VITE_BASE_URL || 'https://crestflow.app');
    return `${origin}/onboarding/${user.uid}`;
  }, [user.uid]);

  // Derived counts
  const counts = useMemo(() => {
    return {
      all: serviceRequests.length,
      pending: serviceRequests.filter((r) => r.status === 'pending').length,
      accepted: serviceRequests.filter((r) => r.status === 'accepted').length,
      declined: serviceRequests.filter((r) => r.status === 'declined').length,
    };
  }, [serviceRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return serviceRequests
      .filter((req) => {
        if (statusFilter !== 'all' && req.status !== statusFilter) {
          return false;
        }
        if (!query) return true;
        return (
          req.clientName?.toLowerCase().includes(query) ||
          req.contactName?.toLowerCase().includes(query) ||
          req.contactEmail?.toLowerCase().includes(query) ||
          req.projectDetails?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [serviceRequests, statusFilter, searchQuery]);

  const handleAcceptRequest = async (request: ServiceRequest) => {
    try {
      const newClientId = generateUUID();
      const newClient: Client = {
        id: newClientId,
        name: request.clientName,
        phone: request.contactPhone,
        email: request.contactEmail,
        defaultRate: request.proposedRate || profile?.defaultRate || 1500,
        createdAt: Date.now(),
        notes: `Client onboarding request submitted on ${new Date(request.createdAt).toLocaleDateString()}:\n${request.projectDetails}`,
      };

      if (request.instagram) {
        newClient.instagram = request.instagram;
      }

      await saveClient(newClient);
      await updateServiceRequest({
        ...request,
        status: 'accepted',
      });
    } catch (err: any) {
      console.error(err);
      alert(`Failed to accept onboarding request: ${err.message || String(err)}`);
    }
  };

  const handleDeclineRequest = async (request: ServiceRequest) => {
    if (!window.confirm(`Decline the onboarding request from ${request.contactName}?`)) return;
    try {
      await updateServiceRequest({
        ...request,
        status: 'declined',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRestoreRequest = async (request: ServiceRequest) => {
    try {
      await updateServiceRequest({
        ...request,
        status: 'pending',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 text-slate-900 dark:text-slate-100">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Client Onboarding
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Manage your client intake pipeline, copy your shareable link, and convert inquiries into clients.
        </p>
      </div>

      {/* Shareable Onboarding Link Card */}
      <OnboardingLinkCard
        onboardingUrl={onboardingUrl}
        profile={profile}
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Inquiries</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{counts.pending}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60  flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Inbox size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accepted Clients</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{counts.accepted}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900/60  flex items-center justify-center text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Submissions</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{counts.all}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900/60  flex items-center justify-center text-slate-600 dark:text-slate-400">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Inquiries Header, Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Incoming Onboarding Requests
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
              {filteredRequests.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(['pending', 'accepted', 'declined', 'all'] as const).map((filter) => {
            const count = counts[filter];
            const isActive = statusFilter === filter;
            const labels: Record<FilterStatus, string> = {
              pending: 'Pending Review',
              accepted: 'Accepted',
              declined: 'Declined',
              all: 'All Requests',
            };

            return (
              <motion.button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className={`relative px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-0 select-none ${
                  isActive
                    ? 'text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="onboardingFilterPill"
                    className="absolute inset-0 bg-slate-900 dark:bg-slate-100 rounded-xl -z-0"
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 500, damping: 38 }
                    }
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span>{labels[filter]}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
                      isActive
                        ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                        : 'bg-slate-200/80 dark:bg-slate-600/60 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">
          Loading incoming requests...
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={statusFilter + (searchQuery ? `-${searchQuery}` : '')}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {filteredRequests.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-slate-400">
                  <Inbox size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {searchQuery
                    ? 'No requests match your search'
                    : statusFilter === 'pending'
                    ? 'No pending onboarding requests'
                    : 'No requests in this status'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try adjusting your search terms or filter view.'
                    : 'Share your public onboarding link with prospective clients to receive incoming project briefs.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredRequests.map((req) => (
                  <OnboardingRequestCard
                    key={req.id}
                    request={req}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                    onRestore={handleRestoreRequest}
                    onNavigateToClients={onNavigateToClients}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
