import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Search, Inbox, Users, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile, ServiceRequest, Client } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { generateUUID } from '../lib/utils';
import { OnboardingLinkCard } from './onboarding/OnboardingLinkCard';
import { OnboardingRequestCard } from './onboarding/OnboardingRequestCard';
import { getUserHandle, getOnboardingUrl, getPublicProfileUrl, hasConfiguredUsername } from '../lib/userHandle';

interface ClientOnboardingTabProps {
  user: User;
  profile: UserProfile | null;
  onNavigateToClients?: () => void;
  onNavigateToProfile?: () => void;
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
  onNavigateToProfile,
}: ClientOnboardingTabProps) {
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');

  const { data: serviceRequests, loading, addOrUpdateItem: updateServiceRequest } =
    useFirestore<ServiceRequest>('serviceRequests', user.uid);
  const { addOrUpdateItem: saveClient } =
    useFirestore<Client>('clients', user.uid);

  const hasUsername = useMemo(() => hasConfiguredUsername(profile), [profile]);
  const handle = useMemo(() => (hasUsername ? profile!.username! : getUserHandle(profile, user)), [hasUsername, profile, user]);
  const onboardingUrl = useMemo(() => getOnboardingUrl(handle), [handle]);
  const publicProfileUrl = useMemo(() => getPublicProfileUrl(handle), [handle]);

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
        if (statusFilter !== 'all' && req.status !== statusFilter) return false;
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
        name: request.clientName || request.contactName || 'New Client',
        phone: request.contactPhone || '',
        email: request.contactEmail || '',
        defaultRate: request.proposedRate || 0,
        instagram: request.instagram || '',
        paymentBasis: 'per_reel',
        notes: `Client onboarding request submitted on ${new Date(request.createdAt).toLocaleDateString()}:\n${request.projectDetails}`,
        createdAt: Date.now(),
      };

      await saveClient(newClient);
      await updateServiceRequest({ ...request, status: 'accepted' });

      if (onNavigateToClients) {
        onNavigateToClients();
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to accept onboarding request: ${err.message || String(err)}`);
    }
  };

  const handleDeclineRequest = async (request: ServiceRequest) => {
    if (!window.confirm(`Decline the onboarding request from ${request.contactName}?`)) return;
    try {
      await updateServiceRequest({ ...request, status: 'declined' });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRestoreRequest = async (request: ServiceRequest) => {
    try {
      await updateServiceRequest({ ...request, status: 'pending' });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 text-slate-900 dark:text-slate-100">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Client Onboarding
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Manage your client intake pipeline, copy your shareable link, and convert inquiries into clients.
        </p>
      </div>

      <OnboardingLinkCard
        onboardingUrl={onboardingUrl}
        publicProfileUrl={publicProfileUrl}
        profile={profile}
        hasUsername={hasUsername}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-[#212121] border border-[#333333] rounded-xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Inquiries</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{counts.pending}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#282828] border border-[#3a3a3a] flex items-center justify-center text-slate-300">
            <Inbox size={22} />
          </div>
        </div>

        <div className="bg-[#212121] border border-[#333333] rounded-xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Accepted Clients</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{counts.accepted}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#282828] border border-[#3a3a3a] flex items-center justify-center text-slate-300">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-[#212121] border border-[#333333] rounded-xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Leads</p>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{counts.all}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#282828] border border-[#3a3a3a] flex items-center justify-center text-slate-300">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search leads by name, email, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {(['pending', 'accepted', 'declined', 'all'] as FilterStatus[]).map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <motion.button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors duration-120 cursor-pointer border-0 ${
                  isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="onboardingFilterPill"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-xs -z-0"
                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">
                  {tab} ({counts[tab]})
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
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
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
