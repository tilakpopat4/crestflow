import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { AlertCircle, Loader2 } from 'lucide-react';
import Logo from './Logo';
import FeedbackSuccessCard from './feedback/FeedbackSuccessCard';
import FeedbackAuthPrompt from './feedback/FeedbackAuthPrompt';
import FeedbackRatingSelector from './feedback/FeedbackRatingSelector';
import FeedbackFormFields from './feedback/FeedbackFormFields';

export default function ClientFeedbackForm() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [freelancerUid, setFreelancerUid] = useState('');
  const [freelancerName, setFreelancerName] = useState('your Freelancer');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const [existingReview, setExistingReview] = useState<{
    rating: number;
    feedbackText: string;
    projectName?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // 1. Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user && !clientName) {
        setClientName(user.displayName || user.email || '');
      }
    });
    return () => unsub();
  }, []);

  // 2. Parse URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid') || '';
    const name = params.get('name') || '';
    const cName = params.get('clientName') || '';
    const cId = params.get('clientId') || '';

    setFreelancerUid(uid);
    if (name) setFreelancerName(name);
    if (cName) setClientName(cName);
    if (cId) setClientId(cId);

    if (!uid) {
      setError('Invalid review link. Missing freelancer ID.');
    }
  }, []);

  // 3. Check for existing review by this signed-in user for this freelancer
  useEffect(() => {
    if (!currentUser || !freelancerUid) {
      setExistingReview(null);
      return;
    }

    if (currentUser.uid === freelancerUid) {
      setError('You cannot review your own creator profile.');
      return;
    }

    const reviewDocId = `${currentUser.uid}_${freelancerUid}`;
    getDoc(doc(db, 'reviews', reviewDocId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setExistingReview({
            rating: data.rating,
            feedbackText: data.feedbackText,
            projectName: data.projectName,
          });
        } else {
          setExistingReview(null);
        }
      })
      .catch((err) => console.warn('Could not check existing review:', err));
  }, [currentUser?.uid, freelancerUid]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setCurrentUser(res.user);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must sign in with Google to leave a review.');
      return;
    }
    if (currentUser.uid === freelancerUid) {
      setError('You cannot review your own creator profile.');
      return;
    }
    if (!freelancerUid) {
      setError('Cannot submit feedback: Missing freelancer ID.');
      return;
    }
    if (!clientName.trim()) {
      setError('Please enter your name or company.');
      return;
    }
    if (rating === 0) {
      setError('Please select a star rating (1 to 5).');
      return;
    }
    if (!feedbackText.trim()) {
      setError('Please write some feedback.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Deterministic document ID guarantees 1 review per account per freelancer
      const reviewDocId = `${currentUser.uid}_${freelancerUid}`;

      const reviewData = {
        id: reviewDocId,
        userId: freelancerUid,
        clientId: clientId || '',
        clientName: clientName.trim(),
        projectName: projectName.trim() || 'Video Production Project',
        rating,
        feedbackText: feedbackText.trim(),
        createdAt: Date.now(),
        isApproved: false,
        reviewerUid: currentUser.uid,
        reviewerEmail: currentUser.email || '',
      };

      await setDoc(doc(db, 'reviews', reviewDocId), reviewData);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error saving feedback:', err);
      setError(err?.message || 'Failed to submit your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <FeedbackAuthPrompt
        freelancerName={freelancerName}
        onSignIn={handleSignIn}
        isAuthenticating={isAuthenticating}
      />
    );
  }

  if (existingReview) {
    return (
      <FeedbackSuccessCard
        freelancerName={freelancerName}
        clientName={clientName}
        projectName={existingReview.projectName}
        rating={existingReview.rating}
        feedbackText={existingReview.feedbackText}
        isExisting={true}
      />
    );
  }

  if (isSuccess) {
    return (
      <FeedbackSuccessCard
        freelancerName={freelancerName}
        clientName={clientName}
        projectName={projectName}
        rating={rating}
        feedbackText={feedbackText}
        isExisting={false}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-150">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative animate-in fade-in duration-300">
        {/* Header */}
        <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9 shadow-sm" />
            <div className="flex flex-col">
              <h2 className="font-extrabold text-lg tracking-tight leading-none text-white">CrestFlow</h2>
              <span className="text-[9px] text-accent font-bold uppercase tracking-wider mt-1">Client Feedback Portal</span>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">Leave Review</span>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Share Your Experience</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed">
              Hi there! Please take a moment to leave a review for <span className="font-semibold text-text-primary">{freelancerName}</span>. Your review helps build trust and improve future collaborations.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Signed in as {currentUser.email} • 1 review permitted per account
            </p>
          </div>

          {error && (
            <div className="bg-[#181818] border border-red-600/40 text-red-400 p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Selector */}
          <FeedbackRatingSelector
            rating={rating}
            hoveredRating={hoveredRating}
            onRatingChange={(star) => {
              setRating(star);
              setError('');
            }}
            onHoverChange={setHoveredRating}
          />

          <FeedbackFormFields
            clientName={clientName}
            setClientName={setClientName}
            projectName={projectName}
            setProjectName={setProjectName}
            feedbackText={feedbackText}
            setFeedbackText={setFeedbackText}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || rating === 0 || !feedbackText.trim() || !clientName.trim()}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-120 shadow-xs disabled:opacity-50 cursor-pointer border-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Review...</span>
                </>
              ) : (
                <span>Submit Verified Review</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
