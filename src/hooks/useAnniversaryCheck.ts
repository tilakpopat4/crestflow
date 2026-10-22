import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { calculateWorkJourney, isAnniversaryDismissed, dismissAnniversary } from '../lib/anniversary';

export function useAnniversaryCheck(user: User | null, freelanceStartDate?: string) {
  const [isAnniversaryModalOpen, setIsAnniversaryModalOpen] = useState(false);
  const journey = calculateWorkJourney(freelanceStartDate);

  useEffect(() => {
    if (!user || !freelanceStartDate) return;
    const stats = calculateWorkJourney(freelanceStartDate);
    if (stats?.currentAnniversary && !isAnniversaryDismissed(user.uid, stats.currentAnniversary.id)) {
      setIsAnniversaryModalOpen(true);
    }
  }, [user?.uid, freelanceStartDate]);

  const closeAnniversaryModal = () => {
    if (user && journey?.currentAnniversary) {
      dismissAnniversary(user.uid, journey.currentAnniversary.id);
    }
    setIsAnniversaryModalOpen(false);
  };

  return {
    journey,
    isAnniversaryModalOpen,
    openAnniversaryModal: () => setIsAnniversaryModalOpen(true),
    closeAnniversaryModal,
  };
}
