import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { generateUUID } from '../lib/utils';
import { Star, CheckCircle2, MessageSquare, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Logo from './Logo';

export default function ClientFeedbackForm() {
  const [freelancerUid, setFreelancerUid] = useState('');
  const [freelancerName, setFreelancerName] = useState('your Video Editor');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Parse URL query parameters
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const reviewId = generateUUID();
      const reviewData = {
        id: reviewId,
        userId: freelancerUid,
        clientId: clientId || '',
        clientName: clientName.trim(),
        projectName: projectName.trim() || 'Video Production Project',
        rating: rating,
        feedbackText: feedbackText.trim(),
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'reviews', reviewId), reviewData);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error saving feedback:', err);
      setError(err?.message || 'Failed to submit your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Subtle design accents */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
              Thank You! <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your review for <span className="font-semibold text-slate-800">{freelancerName}</span> has been submitted successfully. Your feedback is highly appreciated!
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Review</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-4 h-4 ${star <= rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              {projectName && (
                <div className="text-xs font-bold text-slate-700">Project: {projectName}</div>
              )}
              <p className="text-slate-600 text-sm italic leading-relaxed">"{feedbackText}"</p>
            </div>
            <div className="text-[10px] text-slate-400 text-right font-medium">Submitted by {clientName}</div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <Logo className="w-5 h-5" />
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">CrestFlow Portal</span>
            </div>
            <p className="text-[10px] text-slate-400">Professional client workflow manager for video editors</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden relative animate-in fade-in duration-300">
        
        {/* Banner with gradient accent */}
        <div className="h-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>

        {/* Header */}
        <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9 shadow-sm" />
            <div className="flex flex-col">
              <h2 className="font-extrabold text-lg tracking-tight leading-none text-white">CrestFlow</h2>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Client Feedback Portal</span>
            </div>
          </div>
          <div className="bg-indigo-600/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Leave Review
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Share Your Experience</h1>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              Hi there! Please take a moment to leave a review for <span className="font-semibold text-indigo-600">{freelancerName}</span>. Your review helps build trust and improve future collaborations.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Selector */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rate Your Experience *
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= (hoveredRating || rating);
                return (
                  <button
                    type="button"
                    key={star}
                    onClick={() => {
                      setRating(star);
                      setError('');
                    }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-all active:scale-90 hover:scale-115 cursor-pointer outline-none"
                    title={`Rate ${star} Stars`}
                  >
                    <Star 
                      className={`w-9 h-9 transition-colors ${
                        isLit 
                          ? 'text-amber-500 fill-amber-400' 
                          : 'text-slate-300 fill-none hover:text-amber-400'
                      }`} 
                    />
                  </button>
                );
              })}
            </div>
            {rating > 0 && (
              <span className="text-xs font-semibold text-amber-600 transition-all">
                {rating === 1 && '⭐ Poor'}
                {rating === 2 && '⭐⭐ Fair'}
                {rating === 3 && '⭐⭐⭐ Good'}
                {rating === 4 && '⭐⭐⭐⭐ Very Good'}
                {rating === 5 && '⭐⭐⭐⭐⭐ Excellent!'}
              </span>
            )}
          </div>

          {/* Input details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Your Name / Company *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. John Doe / Pixel Studios"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 outline-none transition-all focus:border-indigo-500 focus:bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Project Name (Optional)
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. August Commercial Reel / YouTube Video Edit"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 outline-none transition-all focus:border-indigo-500 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Your Detailed Review *
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Write about the quality of editing, communication, delivery speed, or overall experience..."
                rows={4}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 outline-none transition-all focus:border-indigo-500 focus:bg-white leading-relaxed font-medium"
                required
              ></textarea>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !freelancerUid}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all shadow-sm hover:shadow active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Review...
                </>
              ) : (
                <>
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Small footer */}
      <div className="mt-6 flex flex-col items-center gap-1 text-slate-400">
        <div className="flex items-center gap-1.5 text-xs">
          <Logo className="w-4 h-4 opacity-50" />
          <span className="font-semibold uppercase tracking-wider">CrestFlow</span>
        </div>
        <p className="text-[10px]">Secure & instant client relations platform.</p>
      </div>
    </div>
  );
}
