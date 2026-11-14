import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { calculateWorkJourney, isAnniversaryDismissed, dismissAnniversary } from '../lib/anniversary';

// Module-level in-memory lock to block concurrent dispatches in the same browser session
const activeMilestoneDispatches = new Set<string>();

export function useAnniversaryCheck(user: User | null, freelanceStartDate?: string) {
  const [isAnniversaryModalOpen, setIsAnniversaryModalOpen] = useState(false);
  const journey = calculateWorkJourney(freelanceStartDate);

  useEffect(() => {
    if (!user || !freelanceStartDate) return;
    const stats = calculateWorkJourney(freelanceStartDate);
    if (stats?.currentAnniversary) {
      if (!isAnniversaryDismissed(user.uid, stats.currentAnniversary.id)) {
        setIsAnniversaryModalOpen(true);
      }

      // Automated milestone celebration email dispatch (idempotent per user per milestone)
      const emailSentKey = `crestflow_milestone_email_${user.uid}_${stats.currentAnniversary.id}`;
      if (!localStorage.getItem(emailSentKey) && !activeMilestoneDispatches.has(emailSentKey)) {
        // Mark both in-memory and in localStorage IMMEDIATELY before async operations
        activeMilestoneDispatches.add(emailSentKey);
        localStorage.setItem(emailSentKey, 'true');

        user.getIdToken().then((token) => {
          fetch('/api/notify/milestone', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              milestoneId: stats.currentAnniversary!.id,
              milestoneTitle: stats.currentAnniversary!.title,
              daysWorked: stats.workedDays,
              durationFormatted: stats.formattedDuration,
            }),
          })
            .then((r) => r.json())
            .catch((err) => {
              console.warn('Milestone notification dispatch error:', err);
            });
        }).catch((err) => {
          console.warn('Failed to retrieve token for milestone dispatch:', err);
        });
      }
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
