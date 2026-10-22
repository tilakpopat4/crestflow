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
  const [professionalTitle, setProfessionalTitle] = useState('Video Editor');
  const [servicesDescription, setServicesDescription] = useState('Video Editing Services');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [freelanceStartDate, setFreelanceStartDate] = useState('');
  const [workExperienceBio, setWorkExperienceBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const isInitializedRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const hasLoadedInitialKeyRef = useRef(false);

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
        if (profile.geminiApiKey) {
          hasLoadedInitialKeyRef.current = true;
        }
      } else if (user) {
        setName(user.displayName || '');
      }
    } else if (!hasLoadedInitialKeyRef.current && profile?.geminiApiKey) {
      // If private credentials resolve after initial render, populate key once
      setGeminiApiKey(profile.geminiApiKey);
      hasLoadedInitialKeyRef.current = true;
    }
  }, [profile, user]);

  const wrapInput = (setter: (val: string) => void) => (val: string) => {
    hasUserEditedRef.current = true;
    if (error) setError('');
    setter(val);
  };

  const handleSave = async () => {
    const trimmedName = name.trim() || user.displayName || 'Creator';
    const trimmedUpi = upiId.trim();

    if (trimmedUpi && !trimmedUpi.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. username@bank).');
      return;
    }

    setIsSaving(true);
    setIsSaved(false);
    setError('');

    try {
      const updatedProfile: UserProfile = {
        id: user.uid,
        name: trimmedName,
        phone: phone.trim(),
        upiId: trimmedUpi,
        professionalTitle: professionalTitle.trim() || 'Video Editor',
        servicesDescription: servicesDescription.trim() || 'Video Editing Services',
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
      console.error('Failed to save profile changes:', err);
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
            setName={wrapInput(setName)}
            professionalTitle={professionalTitle}
            setProfessionalTitle={wrapInput(setProfessionalTitle)}
            servicesDescription={servicesDescription}
            setServicesDescription={wrapInput(setServicesDescription)}
            freelanceStartDate={freelanceStartDate}
            setFreelanceStartDate={wrapInput(setFreelanceStartDate)}
            workExperienceBio={workExperienceBio}
            setWorkExperienceBio={wrapInput(setWorkExperienceBio)}
          />

          <ProfileInvoicingCard
            upiId={upiId}
            setUpiId={wrapInput(setUpiId)}
            phone={phone}
            setPhone={wrapInput(setPhone)}
            userId={user.uid}
          />
        </div>

        {/* Right Column: Preferences, AI & SaaS Plan */}
        <div className="lg:col-span-5 space-y-6">
          <ProfilePreferencesCard
            geminiApiKey={geminiApiKey}
            setGeminiApiKey={wrapInput(setGeminiApiKey)}
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
