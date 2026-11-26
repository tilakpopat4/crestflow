import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { SubscriptionState } from '../../hooks/useSubscription';
import { useAccess } from '../../hooks/useAccess';

interface ProfileSubscriptionSectionProps {
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
}

/**
 * Membership and plan settings section aligned with server entitlements.
 */
export const ProfileSubscriptionSection: React.FC<ProfileSubscriptionSectionProps> = ({
  onOpenSubscriptionModal,
}) => {
  const access = useAccess();
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const handleCancel = async () => {
    const formattedDate = access.validUntil
      ? new Date(access.validUntil).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'the end of your billing cycle';

    if (
      !window.confirm(
        `Cancel auto-renewal?\n\nYou will keep full Pro access until ${formattedDate}, then your data remains readable and exportable.`,
      )
    ) {
      return;
    }

    setCancelling(true);
    setCancelMessage(null);
    try {
      await access.cancelSubscription();
      setCancelMessage(`Auto-renewal cancelled. Pro access continues until ${formattedDate}.`);
    } catch (err: any) {
      alert(`Error cancelling subscription: ${err.message || err}`);
    } finally {
      setCancelling(false);
    }
  };

  const isTrial = access.state === 'trialing';
  const isPaidActive = access.state === 'active' || access.state === 'grace';
  const cycleLabel =
    access.billingCycle === 'yearly'
      ? 'Yearly'
      : access.billingCycle === 'quarterly'
      ? 'Quarterly'
      : 'Monthly';

  const statusText = isTrial
    ? 'Trial active'
    : access.state === 'grace'
    ? 'Grace period'
    : access.isLifetime
    ? 'Lifetime'
    : isPaidActive
    ? access.cancelAtPeriodEnd
      ? 'Cancels at period end'
      : 'Active'
    : access.state === 'none'
    ? 'Exploring sample data'
    : 'Expired';

  const formattedValidUntil = access.validUntil
    ? new Date(access.validUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <section id="section-billing" className="grid grid-cols-1 gap-x-8 gap-y-4 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h2 className="text-base font-semibold text-[#F7F7F8]">
          Membership &amp; plan
        </h2>
        <p className="mt-1 text-xs text-[#A1A1AA] leading-relaxed">
          Plan status and billing cycle.
        </p>
      </div>

      <div className="rounded-xl bg-[#131318] border border-[#2A2A33] overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#F7F7F8]">
                  {isTrial
                    ? 'CrestFlow Pro (7-Day Free Trial)'
                    : access.isLifetime
                    ? 'CrestFlow Pro (Lifetime)'
                    : isPaidActive
                    ? `CrestFlow Pro (${cycleLabel})`
                    : access.state === 'none'
                    ? 'CrestFlow Explorer'
                    : 'Plan Expired'}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    access.isExpired
                      ? 'text-[#F0607A]'
                      : isTrial
                      ? 'text-[#FFC145]'
                      : isPaidActive
                      ? 'text-[#2DD4A0]'
                      : 'text-[#A1A1AA]'
                  }`}
                >
                  &bull; {statusText}
                </span>
              </div>

              <p className="text-xs text-[#A1A1AA] mt-1">
                {isTrial && formattedValidUntil
                  ? `Trial Day ${access.trialDay} of 7 · Ends ${formattedValidUntil}. No card stored, no automatic charge.`
                  : access.isLifetime
                  ? 'Lifetime Pro account granted.'
                  : isPaidActive && formattedValidUntil
                  ? access.checkoutMode === 'order' || access.cancelAtPeriodEnd
                    ? `Access active until ${formattedValidUntil} (no auto-renewal).`
                    : `Renews automatically on ${formattedValidUntil}.`
                  : access.state === 'none'
                  ? '7-day free trial, no card needed, no automatic charge.'
                  : 'Your data stays safe and exportable. Reactivate anytime to resume editing.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isPaidActive && !access.isLifetime ? (
                !access.cancelAtPeriodEnd && access.checkoutMode !== 'order' && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleCancel}
                    className="h-9 px-3.5 rounded-lg text-xs font-semibold text-[#F0607A] bg-[#1B1B22] hover:bg-[#2A2A33] border border-[#2A2A33] cursor-pointer"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel auto-renewal'}
                  </button>
                )
              ) : !access.isLifetime ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenSubscriptionModal
                      ? onOpenSubscriptionModal()
                      : access.openUpgradeSheet({ action: 'upgrade' })
                  }
                  className="h-9 px-4 rounded-lg text-xs font-semibold cf-btn-primary text-white cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>{access.isExpired ? 'Reactivate' : 'View plans'}</span>
                  <ArrowUpRight size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {cancelMessage && (
            <div className="p-3 text-xs rounded-lg bg-[#1B1B22] border border-[#2A2A33] text-[#F7F7F8]">
              {cancelMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProfileSubscriptionSection;
