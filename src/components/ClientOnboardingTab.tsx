import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Search, Inbox, Users, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile, ServiceRequest, Client, WorkItem } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useAccess } from '../hooks/useAccess';
import { SAMPLE_SERVICE_REQUESTS, SAMPLE_WORK_ITEMS } from '../data/sampleWorkspaceData';
import { generateUUID } from '../lib/utils';
import { OnboardingLinkCard } from './onboarding/OnboardingLinkCard';
import { OnboardingRequestCard } from './onboarding/OnboardingRequestCard';
import { OnboardingSampleVideoBanner } from './onboarding/OnboardingSampleVideoBanner';
import { getUserHandle, getOnboardingUrl, getPublicProfileUrl, hasConfiguredUsername } from '../lib/userHandle';
import { StatCard } from './ui/StatCard';
import { EmptyState } from './ui/EmptyState';

interface ClientOnboardingTabProps {
  user: User;
  profile: UserProfile | null;
  onNavigateToClients?: () => void;
  onNavigateToProfile?: () => void;
  onSaveProfile?: (profile: UserProfile) => Promise<void>;
}

type FilterStatus = 'pending' | 'accepted' | 'declined' | 'all';

/**
 * ClientOnboardingTab provides freelancers with a streamlined workspace to:
 * 1. Share their intake link, QR code, and Drive-connected sample videos.
 * 2. Track and convert incoming client leads.
 */
export default function ClientOnboardingTab({
  user,
  profile,
  onNavigateToClients,
  onNavigateToProfile,
  onSaveProfile,
}: ClientOnboardingTabProps) {
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');

  const access = useAccess();
  const isExploring = access.state === 'none';
  const liveUid = !isExploring ? user?.uid : undefined;

  const { data: fsRequests, loading: fsLoading, addOrUpdateItem: updateServiceRequest } =
    useFirestore<ServiceRequest>('serviceRequests', liveUid);
  const { addOrUpdateItem: saveClient } =
    useFirestore<Client>('clients', liveUid);
  const { data: fsWorkItems } =
    useFirestore<WorkItem>('workItems', liveUid);

  const serviceRequests = isExploring ? SAMPLE_SERVICE_REQUESTS : fsRequests;
  const workItems = isExploring ? SAMPLE_WORK_ITEMS : fsWorkItems;
  const loading = isExploring ? false : fsLoading;

  const hasUsername = useMemo(() => hasConfiguredUsername(profile), [profile]);
  const handle = useMemo(() => (hasUsername ? profile!.username! : getUserHandle(profile, user)), [hasUsername, profile, user]);
  const onboardingUrl = useMemo(() => getOnboardingUrl(handle), [handle]);
  const publicProfileUrl = useMemo(() => getPublicProfileUrl(handle), [handle]);

  const counts = useMemo(() => {
    return {
      all: serviceRequests.length,
      pending: serviceRequests.filter((r) => r.status === 'pending').length,
      accepted: serviceRequests.filter((r) => r.status === 'accepted').length,
      declined: serviceRequests.filter((r) => r.status === 'declined').length,
    };
  }, [serviceRequests]);

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
    if (!access.requireAccess('manage_onboarding', 'Convert client intake requests directly into active clients.')) return;
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
    if (!access.requireAccess('manage_onboarding', 'Manage incoming client onboarding requests.')) return;
    if (!window.confirm(`Decline the onboarding request from ${request.contactName}?`)) return;
    try {
      await updateServiceRequest({ ...request, status: 'declined' });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRestoreRequest = async (request: ServiceRequest) => {
    if (!access.requireAccess('manage_onboarding', 'Restore archived client onboarding requests.')) return;
    try {
      await updateServiceRequest({ ...request, status: 'pending' });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Client Onboarding
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Intake link and client leads.
          </p>
        </div>
        {isExploring && (
          <span className="text-xs font-medium text-[#FFC145] bg-[#1B1B22] border border-[#2A2A33] px-2.5 py-1 rounded">
            Sample data
          </span>
        )}
      </div>

      {access.isExpired && counts.pending > 0 && (
        <div className="rounded-xl bg-[#131318] border border-[#FFB020]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-[#F7F7F8]">
            <strong className="text-[#FFB020]">{counts.pending} waiting</strong>, reactivate to respond.
          </span>
          <button
            type="button"
            onClick={() =>
              access.openUpgradeSheet({
                action: 'manage_onboarding',
                benefit: 'Reactivate to accept incoming onboarding briefs and convert them to clients.',
              })
            }
            className="px-3 py-1.5 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer shrink-0"
          >
            Reactivate to respond
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <StatCard label="Pending" value={counts.pending} icon={Inbox} />
        <StatCard label="Accepted" value={counts.accepted} icon={CheckCircle2} />
        <StatCard label="Total Leads" value={counts.all} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 items-stretch">
        <div className="lg:col-span-2">
          <OnboardingLinkCard
            onboardingUrl={onboardingUrl}
            publicProfileUrl={publicProfileUrl}
            profile={profile}
            hasUsername={hasUsername}
            onNavigateToProfile={onNavigateToProfile}
          />
        </div>
        <div className="lg:col-span-1">
          <OnboardingSampleVideoBanner
            profile={profile}
            workItems={workItems}
            onboardingUrl={onboardingUrl}
            onSaveProfile={onSaveProfile}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-800 border border-surface-400 rounded-lg pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-surface-300 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-800 border border-surface-400 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
          {(['pending', 'accepted', 'declined', 'all'] as FilterStatus[]).map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`relative px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors duration-120 cursor-pointer border-0 ${
                  isActive
                    ? 'bg-surface-600 text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/60'
                }`}
              >
                <span>
                  {tab}{' '}
                  <span className="font-mono tabular-nums text-[11px] opacity-80">
                    ({counts[tab]})
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-text-muted font-mono">
          Loading...
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
              <EmptyState
                icon={Inbox}
                title={
                  searchQuery
                    ? 'No matching leads'
                    : statusFilter === 'pending'
                    ? 'No pending requests'
                    : 'No requests'
                }
                description={
                  searchQuery
                    ? 'Try a different search or filter.'
                    : 'Leads from your intake link appear here.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
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
