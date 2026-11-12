import React, { useState, useEffect, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, SubscriptionState } from '../types';
import ProfileNavSidebar, { SettingsSectionId } from './profile/ProfileNavSidebar';
import ProfilePublicSection from './profile/ProfilePublicSection';
import ProfileInvoicingSection from './profile/ProfileInvoicingSection';
import ProfilePreferencesCard from './profile/ProfilePreferencesCard';
import ProfileSubscriptionSection from './profile/ProfileSubscriptionSection';
import { getUserHandle, cleanUsername } from '../lib/userHandle';

interface ProfilePageProps {
  user: FirebaseUser;
  profile: UserProfile | null;
  onSave: (updatedProfile: UserProfile) => Promise<void>;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

/**
 * Account & Creator Settings Page.
 * Styled after modern high-productivity settings interfaces with responsive sidebar navigation,
 * split section headers, live unsaved change indicators, and per-section save/discard flows.
 * Adheres strictly to GEMINI.md design standards: slate neutrals, steel blue accents, no green.
 */
export default function ProfilePage({
  user,
  profile,
  onSave,
  subscriptionState,
  onOpenSubscriptionModal,
}: ProfilePageProps) {
  // Live form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState(''); const [upiId, setUpiId] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('Freelancer');
  const [servicesDescription, setServicesDescription] = useState('Freelance Services');
  const [geminiApiKey, setGeminiApiKey] = useState(''); const [freelanceStartDate, setFreelanceStartDate] = useState('');
  const [workExperienceBio, setWorkExperienceBio] = useState('');

  // Saved snapshot for dirty checking and discarding
  const [savedSnapshot, setSavedSnapshot] = useState({
    name: '', username: '', phone: '', upiId: '',
    professionalTitle: 'Freelancer', servicesDescription: 'Freelance Services',
    geminiApiKey: '', freelanceStartDate: '', workExperienceBio: '',
  });

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSection, setSavedSection] = useState<SettingsSectionId | null>(null);
  const [error, setError] = useState(''); const [upiError, setUpiError] = useState('');

  const isInitializedRef = useRef(false);
  const hasLoadedInitialKeyRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      if (profile) {
        const initialHandle = profile.username || getUserHandle(profile, user);
        const initial = {
          name: profile.name || user.displayName || '',
          username: initialHandle,
          phone: profile.phone || '',
          upiId: profile.upiId || '',
          professionalTitle: profile.professionalTitle || 'Freelancer',
          servicesDescription: profile.servicesDescription || 'Freelance Services',
          geminiApiKey: profile.geminiApiKey || '',
          freelanceStartDate: profile.freelanceStartDate || '',
          workExperienceBio: profile.workExperienceBio || '',
        };
        setName(initial.name); setUsername(initial.username); setPhone(initial.phone); setUpiId(initial.upiId);
        setProfessionalTitle(initial.professionalTitle); setServicesDescription(initial.servicesDescription);
        setGeminiApiKey(initial.geminiApiKey); setFreelanceStartDate(initial.freelanceStartDate);
        setWorkExperienceBio(initial.workExperienceBio); setSavedSnapshot(initial);
        isInitializedRef.current = true;
        if (profile.geminiApiKey) hasLoadedInitialKeyRef.current = true;
      } else if (user) {
        const defaultName = user.displayName || '';
        const defaultHandle = getUserHandle(null, user);
        setName(defaultName); setUsername(defaultHandle);
        setSavedSnapshot((prev) => ({ ...prev, name: defaultName, username: defaultHandle }));
      }
    } else {
      // Sync incoming profile fields from Firestore if updated remotely and pristine locally
      if (
        profile?.freelanceStartDate !== undefined &&
        freelanceStartDate === savedSnapshot.freelanceStartDate &&
        profile.freelanceStartDate !== savedSnapshot.freelanceStartDate
      ) {
        setFreelanceStartDate(profile.freelanceStartDate || '');
        setSavedSnapshot((prev) => ({ ...prev, freelanceStartDate: profile.freelanceStartDate || '' }));
      }
      if (!hasLoadedInitialKeyRef.current && profile?.geminiApiKey) {
        setGeminiApiKey(profile.geminiApiKey);
        setSavedSnapshot((prev) => ({ ...prev, geminiApiKey: profile.geminiApiKey! }));
        hasLoadedInitialKeyRef.current = true;
      }
    }
  }, [profile, user]);

  // Dirty state checks per section
  const isProfileDirty =
    name !== savedSnapshot.name ||
    username !== savedSnapshot.username ||
    professionalTitle !== savedSnapshot.professionalTitle ||
    freelanceStartDate !== savedSnapshot.freelanceStartDate ||
    workExperienceBio !== savedSnapshot.workExperienceBio;

  const isInvoicingDirty =
    upiId !== savedSnapshot.upiId ||
    phone !== savedSnapshot.phone ||
    servicesDescription !== savedSnapshot.servicesDescription;

  const isAiDirty = geminiApiKey !== savedSnapshot.geminiApiKey;

  // Discard handlers
  const handleDiscardProfile = () => {
    setName(savedSnapshot.name); setUsername(savedSnapshot.username); setProfessionalTitle(savedSnapshot.professionalTitle);
    setFreelanceStartDate(savedSnapshot.freelanceStartDate); setWorkExperienceBio(savedSnapshot.workExperienceBio);
    if (error) setError('');
  };

  const handleDiscardInvoicing = () => {
    setUpiId(savedSnapshot.upiId); setPhone(savedSnapshot.phone); setServicesDescription(savedSnapshot.servicesDescription);
    setUpiError(''); if (error) setError('');
  };

  const handleDiscardAi = () => {
    setGeminiApiKey(savedSnapshot.geminiApiKey);
    if (error) setError('');
  };

  // Save handler
  const handleSaveSection = async (section: SettingsSectionId) => {
    const trimmedName = name.trim() || user.displayName || 'Creator';
    const trimmedUpi = upiId.trim();

    if (section === 'invoicing') {
      if (trimmedUpi && !trimmedUpi.includes('@')) {
        setUpiError('Please enter a valid UPI ID (e.g. username@bank).');
        setActiveSection('invoicing');
        document.getElementById('section-invoicing')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    setUpiError('');
    setError('');
    setIsSaving(true);
    setSavedSection(null);

    try {
      const cleanHandle = cleanUsername(username) || getUserHandle(profile, user);
      const snapshotData = {
        name: trimmedName,
        username: cleanHandle,
        phone: phone.trim(),
        upiId: trimmedUpi,
        professionalTitle: professionalTitle.trim() || 'Freelancer',
        servicesDescription: servicesDescription.trim() || 'Freelance Services',
        geminiApiKey: geminiApiKey.trim(),
        freelanceStartDate: freelanceStartDate.trim(),
        workExperienceBio: workExperienceBio.trim(),
      };
      await onSave({
        ...snapshotData,
        id: user.uid,
        geminiApiKey: geminiApiKey.trim() || undefined,
        freelanceStartDate: freelanceStartDate.trim() || undefined,
        workExperienceBio: workExperienceBio.trim() || undefined,
        isPublicProfile: true,
        createdAt: profile?.createdAt || Date.now(),
      });
      setSavedSnapshot(snapshotData);

      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 3000);
    } catch (err: any) {
      console.error('Failed to save profile settings:', err);
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoSaveStartDate = async (newDate: string) => {
    const trimmed = newDate.trim();
    setFreelanceStartDate(trimmed);
    try {
      const cleanHandle = cleanUsername(username) || getUserHandle(profile, user);
      await onSave({
        ...(profile || {}), id: user.uid, name: name.trim() || user.displayName || 'Creator',
        username: cleanHandle, phone: phone.trim(), upiId: upiId.trim(),
        professionalTitle: professionalTitle.trim() || 'Freelancer',
        servicesDescription: servicesDescription.trim() || 'Freelance Services',
        geminiApiKey: geminiApiKey.trim() || undefined, freelanceStartDate: trimmed || undefined,
        workExperienceBio: workExperienceBio.trim() || undefined, isPublicProfile: true, createdAt: profile?.createdAt || Date.now(),
      } as UserProfile);
      setSavedSnapshot((prev) => ({ ...prev, freelanceStartDate: trimmed }));
      setSavedSection('profile');
      setTimeout(() => setSavedSection(null), 3000);
    } catch (err) {
      console.warn('Auto-save start date error:', err);
    }
  };

  const handleSelectNav = (id: SettingsSectionId) => {
    setActiveSection(id);
    const targetElement = document.getElementById(`section-${id}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 w-full min-w-0 flex-1">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Your creator identity, client invoicing rails, AI integrations, and CrestFlow membership.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Main Grid: Navigation Sidebar on Left, Form Sections on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <ProfileNavSidebar
          activeSection={activeSection}
          onSelectSection={handleSelectNav}
          hasSubscription={Boolean(subscriptionState?.isSubscriptionFeatureEnabled)}
        />

        <div className="min-w-0 divide-y divide-slate-200 dark:divide-slate-800 space-y-8">
          <ProfilePublicSection
            user={user}
            name={name}
            setName={setName}
            username={username}
            setUsername={setUsername}
            professionalTitle={professionalTitle}
            setProfessionalTitle={setProfessionalTitle}
            bio={workExperienceBio}
            setBio={setWorkExperienceBio}
            freelanceStartDate={freelanceStartDate}
            setFreelanceStartDate={setFreelanceStartDate}
            onAutoSaveDate={handleAutoSaveStartDate}
            isSaving={isSaving}
            isSaved={savedSection === 'profile'}
            isDirty={isProfileDirty}
            onSave={() => handleSaveSection('profile')}
            onDiscard={handleDiscardProfile}
          />

          <ProfileInvoicingSection
            userId={user.uid}
            handle={cleanUsername(username) || getUserHandle(profile, user)}
            upiId={upiId}
            setUpiId={setUpiId}
            upiError={upiError}
            phone={phone}
            setPhone={setPhone}
            servicesDescription={servicesDescription}
            setServicesDescription={setServicesDescription}
            isSaving={isSaving}
            isSaved={savedSection === 'invoicing'}
            isDirty={isInvoicingDirty}
            onSave={() => handleSaveSection('invoicing')}
            onDiscard={handleDiscardInvoicing}
          />

          <ProfilePreferencesCard
            apiKey={geminiApiKey}
            setApiKey={setGeminiApiKey}
            isSaving={isSaving}
            isSaved={savedSection === 'ai'}
            isDirty={isAiDirty}
            onSave={() => handleSaveSection('ai')}
            onDiscard={handleDiscardAi}
          />

          {subscriptionState && (
            <ProfileSubscriptionSection
              subscriptionState={subscriptionState}
              onOpenSubscriptionModal={onOpenSubscriptionModal}
            />
          )}
        </div>
      </div>
    </div>
  );
}
