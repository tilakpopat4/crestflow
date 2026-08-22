import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Client, ClientReview, UserProfile } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { Star, MessageSquare, Copy, Check, Mail, Trash2, Search, ArrowUpRight, Share2, Sparkles, Filter } from 'lucide-react';

interface ReviewsTabProps {
  user: User;
  profile: UserProfile | null;
}

export default function ReviewsTab({ user, profile }: ReviewsTabProps) {
  const { data: clients } = useFirestore<Client>('clients', user.uid);
  const { data: reviews, removeItem: deleteReview } = useFirestore<ClientReview>('reviews', user.uid);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const rating = Math.min(5, Math.max(1, r.rating)) as 5 | 4 | 3 | 2 | 1;
    ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
  });

  const getReviewLink = (client: Client) => {
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const nameParam = encodeURIComponent(profile?.name || user.displayName || 'Video Editor');
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
    const subject = encodeURIComponent('Feedback Request - Video Editing Services');
    const body = encodeURIComponent(
      `Hi ${client.name},\n\nHope you're doing well!\n\nThank you for working with me on your recent video projects. I would really appreciate it if you could take 1 minute to leave a review of your experience using this link:\n\n${link}\n\nYour feedback helps me improve my services and builds trust with future clients.\n\nBest regards,\n${profile?.name || user.displayName || 'Video Editor'}`
    );
    window.open(`mailto:${client.email || ''}?subject=${subject}&body=${body}`);
  };

  // Filter reviews
  const filteredReviews = reviews
    .filter(r => {
      const matchQuery = 
        r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.projectName && r.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.feedbackText.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRating = ratingFilter === 'all' || r.rating === ratingFilter;
      
      return matchQuery && matchRating;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24 md:pb-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Reviews</h1>
          <p className="text-slate-500 text-sm">Gather testimonials, view ratings, and build client trust.</p>
        </div>
      </div>

      {/* Stats and Generator Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Testimonials Stats Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col md:flex-row lg:col-span-2 items-stretch gap-6 md:gap-8">
          
          {/* Average Rating Widget */}
          <div className="flex flex-col items-center justify-center text-center p-4 md:border-r border-slate-100 md:pr-8 min-w-[150px]">
            <span className="text-6xl font-extrabold text-slate-900 leading-none">{averageRating || '0.0'}</span>
            
            {/* Stars */}
            <div className="flex gap-0.5 mt-3 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating) 
                      ? 'text-amber-500 fill-amber-400' 
                      : 'text-slate-200 fill-none'
                  }`}
                />
              ))}
            </div>
            
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
              {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>

          {/* Rating Breakdown Progress Bars */}
          <div className="flex-1 flex flex-col justify-center space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingCounts[rating as 5|4|3|2|1] || 0;
              const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center text-xs gap-3">
                  <span className="w-3 font-semibold text-slate-500">{rating}</span>
                  <Star className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />
                  <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <span className="w-8 text-right text-slate-400 font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Review Request Link Generator */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-indigo-500" /> Request a Review
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate a personalized review submission link to send directly to your clients.
            </p>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Client</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 outline-none transition-all focus:border-indigo-500 focus:bg-white font-medium"
              >
                <option value="">-- Choose an active client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-5 flex items-center gap-3">
            {selectedClient ? (
              <>
                <button
                  onClick={() => handleCopyLink(selectedClient)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                >
                  {copiedClientId === selectedClient.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEmailRequest(selectedClient)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Client</span>
                </button>
              </>
            ) : (
              <div className="w-full text-center text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 py-3.5 rounded-xl font-medium">
                Select a client to generate invite link
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Review List Filter & Search Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, project, or review content..."
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm bg-slate-50 outline-none transition-all focus:border-indigo-500 focus:bg-white"
          />
        </div>

        {/* Star Rating Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setRatingFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ratingFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Ratings
            </button>
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  ratingFilter === r
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r} <Star className="w-3 h-3 fill-current" />
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Reviews Content Grid */}
      {filteredReviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-200 relative group animate-in fade-in"
            >
              
              {/* Delete button (only visible on hover or mobile) */}
              <button
                onClick={() => setReviewToDelete(review.id)}
                className="absolute right-4 top-4 text-slate-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 md:opacity-0 focus:opacity-100 cursor-pointer"
                title="Delete testimonial"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                {/* Stars and Project Title */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating 
                            ? 'text-amber-500 fill-amber-400' 
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">
                    {new Date(review.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                  <p className="text-slate-700 text-sm leading-relaxed italic font-medium">
                    "{review.feedbackText}"
                  </p>
                  
                  {review.projectName && (
                    <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      Project: {review.projectName}
                    </span>
                  )}
                </div>
              </div>

              {/* Client Info Footer */}
              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 leading-snug">{review.clientName}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Verified Testimonial</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                  {review.clientName.charAt(0)}
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 py-16 px-6 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">No Testimonials Found</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              {searchQuery || ratingFilter !== 'all'
                ? "Try adjusting your search queries or filters."
                : "You haven't received any client feedback yet. Use the share button above to request reviews from active clients!"}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <div 
          onClick={() => setReviewToDelete(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Delete Review?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to delete this testimonial? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reviewToDelete) {
                    deleteReview(reviewToDelete);
                    setReviewToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all shadow active:scale-95 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
