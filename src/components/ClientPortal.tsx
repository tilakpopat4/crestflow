/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { User } from 'firebase/auth';
import { Invoice } from '../types';
import MediaEmbedModal from './MediaEmbedModal';
import Footer from './Footer';
import { useClientPortalData } from '../hooks/useClientPortalData';
import { ClientPortalHeader, ClientPortalTab } from './client-portal/ClientPortalHeader';
import { ClientPortalOverview } from './client-portal/ClientPortalOverview';
import { ClientPortalWorkLog } from './client-portal/ClientPortalWorkLog';
import { ClientPortalInvoices } from './client-portal/ClientPortalInvoices';
import { ClientPortalReview } from './client-portal/ClientPortalReview';
import { ClientPortalInvoiceModal } from './client-portal/ClientPortalInvoiceModal';
import { ClientPortalNoAccount } from './client-portal/ClientPortalNoAccount';

interface ClientPortalProps {
  user: User;
  onLogout: () => void;
  onSwitchToFreelancer?: () => void;
}

/**
 * Main Client Portal coordinator.
 * Composes modular subcomponents and manages active tab state and modals.
 */
export default function ClientPortal({ user, onLogout, onSwitchToFreelancer }: ClientPortalProps) {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    currentClient,
    freelancerProfile,
    loading,
    invoices,
    workItems,
    paymentStatus,
    totalQuantityDelivered,
    totalInvoicedAmount,
    totalPaidAmount,
    totalPendingBalance,
    reviewRating,
    setReviewRating,
    reviewText,
    setReviewText,
    isSubmittingReview,
    reviewSuccess,
    existingReview,
    checkingReview,
    handleReviewSubmit,
  } = useClientPortalData(user);

  // Tab & Modal UI state
  const [activeTab, setActiveTab] = useState<ClientPortalTab>('overview');
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [workStatusFilter, setWorkStatusFilter] = useState<'all' | 'Uninvoiced' | 'Invoiced'>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'Pending' | 'Paid'>('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [embedModalData, setEmbedModalData] = useState<{ isOpen: boolean; url: string; title: string; clientName?: string } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    );
  }

  // If no client profile is linked to this Google account
  if (clients.length === 0) {
    return (
      <ClientPortalNoAccount
        userEmail={user.email}
        onLogout={onLogout}
        onSwitchToFreelancer={onSwitchToFreelancer}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      <ClientPortalHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        freelancerProfile={freelancerProfile}
        workItemsCount={workItems.length}
        invoicesCount={invoices.length}
        onLogout={onLogout}
        onSwitchToFreelancer={onSwitchToFreelancer}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full space-y-4 sm:space-y-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{
              duration: shouldReduceMotion ? 0.01 : 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full"
          >
            {activeTab === 'overview' && (
              <ClientPortalOverview
                currentClient={currentClient}
                userEmail={user.email}
                freelancerProfile={freelancerProfile}
                paymentStatus={paymentStatus}
                totalQuantityDelivered={totalQuantityDelivered}
                totalInvoicedAmount={totalInvoicedAmount}
                totalPaidAmount={totalPaidAmount}
                totalPendingBalance={totalPendingBalance}
                invoicesCount={invoices.length}
                recentWorkItems={workItems.slice(0, 5)}
                onNavigateToWork={() => setActiveTab('work')}
                onOpenVideoEmbed={(url, title) =>
                  setEmbedModalData({
                    isOpen: true,
                    url,
                    title,
                    clientName: currentClient?.name,
                  })
                }
              />
            )}

            {activeTab === 'work' && (
              <ClientPortalWorkLog
                workItems={workItems}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={workStatusFilter}
                onStatusFilterChange={setWorkStatusFilter}
                onOpenVideoEmbed={(url, title) =>
                  setEmbedModalData({
                    isOpen: true,
                    url,
                    title,
                    clientName: currentClient?.name,
                  })
                }
              />
            )}

            {activeTab === 'invoices' && (
              <ClientPortalInvoices
                invoices={invoices}
                statusFilter={invoiceStatusFilter}
                onStatusFilterChange={setInvoiceStatusFilter}
                onViewInvoice={setViewInvoice}
              />
            )}

            {activeTab === 'review' && (
              <ClientPortalReview
                freelancerName={freelancerProfile?.name || 'your freelancer'}
                checkingReview={checkingReview}
                existingReview={existingReview}
                reviewSuccess={reviewSuccess}
                reviewRating={reviewRating}
                onRatingChange={setReviewRating}
                reviewText={reviewText}
                onReviewTextChange={setReviewText}
                isSubmittingReview={isSubmittingReview}
                onSubmitReview={handleReviewSubmit}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer variant="minimal" />

      {/* Invoice Details Modal */}
      {viewInvoice && (
        <ClientPortalInvoiceModal
          invoice={viewInvoice}
          currentClient={currentClient}
          userEmail={user.email}
          freelancerProfile={freelancerProfile}
          onClose={() => setViewInvoice(null)}
        />
      )}

      {/* Video Preview Embed Modal */}
      {embedModalData && (
        <MediaEmbedModal
          isOpen={embedModalData.isOpen}
          onClose={() => setEmbedModalData(null)}
          url={embedModalData.url}
          title={embedModalData.title}
          clientName={embedModalData.clientName}
        />
      )}
    </div>
  );
}
