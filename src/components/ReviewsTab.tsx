import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Client, ClientReview, UserProfile } from '../types';
import { useFirestore } from '../hooks/useFirestore';
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
  const { data: clients, loading: clientsLoading } = useFirestore<Client>('clients', user?.uid);
  const { data: reviews, loading: reviewsLoading, removeItem: deleteReview } = useFirestore<ClientReview>('reviews', user?.uid);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-400 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Client Reviews
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Gather testimonials, view ratings, and build client trust.
          </p>
        </div>
      </div>

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
