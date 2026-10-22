import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { SubscriptionState } from '../hooks/useSubscription';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileGeneralCard } from './profile/ProfileGeneralCard';
import { ProfileInvoicingCard } from './profile/ProfileInvoicingCard';
import { ProfilePreferencesCard } from './profile/ProfilePreferencesCard';
import { ProfileSubscriptionCard } from './profile/ProfileSubscriptionCard';

interface ProfilePageProps {
  user: User;
  profile: UserProfile | null;
  onSave: (updatedProfile: UserProfile) => Promise<void>;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

export default function ProfilePage({
  user,
  profile,
  onSave,
  subscriptionState,
  onOpenSubscriptionModal
}: ProfilePageProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('Video Editor Pro');
  const [servicesDescription, setServicesDescription] = useState('Video Editing Services');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [freelanceStartDate, setFreelanceStartDate] = useState('');
  const [workExperienceBio, setWorkExperienceBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      if (profile) {
        setName(profile.name || user.displayName || '');
        setPhone(profile.phone || '');
        setUpiId(profile.upiId || '');
        setProfessionalTitle(profile.professionalTitle || 'Video Editor');
        setServicesDescription(profile.servicesDescription || 'Video Editing Services');
        setGeminiApiKey(profile.geminiApiKey || '');
        setFreelanceStartDate(profile.freelanceStartDate || '');
        setWorkExperienceBio(profile.workExperienceBio || '');
        isInitializedRef.current = true;
      } else if (user) {
        setName(user.displayName || '');
      }
    } else if (profile?.geminiApiKey && !geminiApiKey) {
      // If private credentials resolve after initial render, populate key
      setGeminiApiKey(profile.geminiApiKey);
    }
  }, [profile, user, geminiApiKey]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !upiId.trim() || !professionalTitle.trim() || !servicesDescription.trim()) {
      setError('Full name, phone, UPI ID, title, and services description are required.');
      return;
    }

    if (!upiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. username@bank).');
      return;
    }

    setIsSaving(true);
    setIsSaved(false);
    setError('');

    try {
      const updatedProfile: UserProfile = {
        id: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        upiId: upiId.trim(),
        professionalTitle: professionalTitle.trim(),
        servicesDescription: servicesDescription.trim(),
        geminiApiKey: geminiApiKey.trim() || undefined,
        freelanceStartDate: freelanceStartDate.trim() || undefined,
        workExperienceBio: workExperienceBio.trim() || undefined,
        isPublicProfile: true,
        createdAt: profile?.createdAt || Date.now()
      };

      await onSave(updatedProfile);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <ProfileHeader isSaving={isSaving} isSaved={isSaved} onSave={handleSave} />

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Creator Details & Invoicing */}
        <div className="lg:col-span-7 space-y-6">
          <ProfileGeneralCard
            user={user}
            name={name}
            setName={setName}
            professionalTitle={professionalTitle}
            setProfessionalTitle={setProfessionalTitle}
            servicesDescription={servicesDescription}
            setServicesDescription={setServicesDescription}
            freelanceStartDate={freelanceStartDate}
            setFreelanceStartDate={setFreelanceStartDate}
            workExperienceBio={workExperienceBio}
            setWorkExperienceBio={setWorkExperienceBio}
          />

          <ProfileInvoicingCard
            upiId={upiId}
            setUpiId={setUpiId}
            phone={phone}
            setPhone={setPhone}
            userId={user.uid}
          />
        </div>

        {/* Right Column: Preferences, AI & SaaS Plan */}
        <div className="lg:col-span-5 space-y-6">
          <ProfilePreferencesCard
            geminiApiKey={geminiApiKey}
            setGeminiApiKey={setGeminiApiKey}
          />

          <ProfileSubscriptionCard
            subscriptionState={subscriptionState}
            onOpenSubscriptionModal={onOpenSubscriptionModal}
          />
        </div>
      </div>
    </div>
  );
}
