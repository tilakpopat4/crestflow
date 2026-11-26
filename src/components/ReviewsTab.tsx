import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Client, ClientReview, UserProfile } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { useAccess } from '../hooks/useAccess';
import { SAMPLE_CLIENTS, SAMPLE_REVIEWS } from '../data/sampleWorkspaceData';
import { ReviewsSkeleton } from './skeletons';
import { ReviewsStatsCard } from './reviews/ReviewsStatsCard';
import { ReviewRequestCard } from './reviews/ReviewRequestCard';
import { ReviewsToolbar } from './reviews/ReviewsToolbar';
import { ReviewsGrid } from './reviews/ReviewsGrid';

interface ReviewsTabProps {
  user: User;
  profile: UserProfile | null;
}

/**
 * ReviewsTab Component
 * Client reviews and testimonials management view.
 */
export default function ReviewsTab({ user, profile }: ReviewsTabProps) {
  const access = useAccess();
  const isExploring = access.state === 'none';
  const liveUid = !isExploring ? user?.uid : undefined;

  const { data: fsClients, loading: fsClientsLoading } = useFirestore<Client>('clients', liveUid);
  const { data: fsReviews, loading: fsReviewsLoading, removeItem: rawDeleteReview } = useFirestore<ClientReview>('reviews', liveUid);

  const clients = isExploring ? SAMPLE_CLIENTS : fsClients;
  const reviews = isExploring ? SAMPLE_REVIEWS : fsReviews;
  const clientsLoading = isExploring ? false : fsClientsLoading;
  const reviewsLoading = isExploring ? false : fsReviewsLoading;

  const deleteReview = async (reviewId: string) => {
    if (!access.requireAccess('manage_reviews', 'Manage and curate verified client reviews.')) return;
    await rawDeleteReview(reviewId);
  };

  const [selectedClientId, setSelectedClientId] = useState('');
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');

  // Calculate statistics with tabular numbers
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    const rating = Math.min(5, Math.max(1, r.rating)) as 5 | 4 | 3 | 2 | 1;
    ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
  });

  const getReviewLink = (client: Client) => {
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const nameParam = encodeURIComponent(profile?.name || user.displayName || 'Freelancer');
    const clientNameParam = encodeURIComponent(client.name);
    return `${baseUrl}?feedback=true&uid=${user.uid}&name=${nameParam}&clientId=${client.id}&clientName=${clientNameParam}`;
  };

  const handleCopyLink = (client: Client) => {
    const link = getReviewLink(client);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedClientId(client.id);
      setTimeout(() => setCopiedClientId(null), 2000);
    });
  };

  const handleEmailRequest = (client: Client) => {
    const link = getReviewLink(client);
    const subject = encodeURIComponent('Feedback Request - Freelance Services');
    const body = encodeURIComponent(
      `Hi ${client.name},\n\nHope you're doing well!\n\nThank you for working with me on our recent projects. I would really appreciate it if you could take 1 minute to leave a review of your experience using this link:\n\n${link}\n\nYour feedback helps me improve my services and builds trust with future clients.\n\nBest regards,\n${profile?.name || user.displayName || 'Freelancer'}`
    );
    window.open(`mailto:${client.email || ''}?subject=${subject}&body=${body}`);
  };

  // Filter reviews
  const filteredReviews = reviews
    .filter((r) => {
      const matchQuery =
        r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.projectName && r.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.feedbackText.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRating = ratingFilter === 'all' || r.rating === ratingFilter;

      return matchQuery && matchRating;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  if (clientsLoading && reviewsLoading && reviews.length === 0) {
    return <ReviewsSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 pb-24 md:pb-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Client Reviews
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Client feedback and ratings.
          </p>
        </div>
        {isExploring && (
          <span className="text-xs font-medium text-[#FFC145] bg-[#1B1B22] border border-[#2A2A33] px-2.5 py-1 rounded self-start">
            Sample data
          </span>
        )}
      </div>

      {access.isExpired && totalReviews > 0 && (
        <div className="rounded-xl bg-[#131318] border border-[#FFB020]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-[#F7F7F8]">
            <strong className="text-[#FFB020]">{totalReviews} waiting</strong>, reactivate to respond or manage testimonials.
          </span>
          <button
            type="button"
            onClick={() =>
              access.openUpgradeSheet({
                action: 'manage_reviews',
                benefit: 'Reactivate your plan to feature and respond to new client reviews.',
              })
            }
            className="px-3 py-1.5 rounded-lg cf-btn-primary text-xs font-semibold cursor-pointer shrink-0"
          >
            Reactivate to respond
          </button>
        </div>
      )}

      {/* Stats and Request Generator Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReviewsStatsCard
          averageRating={averageRating}
          totalReviews={totalReviews}
          ratingCounts={ratingCounts}
        />
        <ReviewRequestCard
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          copiedClientId={copiedClientId}
          onCopyLink={handleCopyLink}
          onEmailClient={handleEmailRequest}
        />
      </div>

      {/* Review List Filter & Search Toolbar */}
      <ReviewsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        ratingFilter={ratingFilter}
        onRatingFilterChange={setRatingFilter}
      />

      {/* Reviews Content Grid */}
      <ReviewsGrid
        reviews={filteredReviews}
        searchQuery={searchQuery}
        ratingFilter={ratingFilter}
        onDeleteReview={deleteReview}
      />
    </div>
  );
}
