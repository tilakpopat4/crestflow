/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';
import { TRIAL_PROMISE_COPY } from '../shared/pricing';

interface RefundPolicyPageProps {
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing') => void;
}

export default function RefundPolicyPage({ onNavigate }: RefundPolicyPageProps) {
  const handleContactLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (onNavigate) {
      onNavigate('contact');
      return;
    }
    window.history.pushState({}, '', '/contact');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="w-full py-8 md:py-12 px-4 md:px-6 text-[#F7F7F8]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-[#F7F7F8] tracking-tight">
          Cancellation &amp; Refund Policy
        </h1>
        <p className="text-xs md:text-sm text-[#A1A1AA] mt-1.5 mb-8">
          Last updated: November 2026 &bull; Review Status: Pending Legal Verification
        </p>

        <div className="space-y-6 text-sm md:text-base text-[#A1A1AA] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[#F7F7F8] mb-2.5">1. Overview</h2>
            <p>
              This Cancellation and Refund Policy applies to all subscriptions and digital services offered on{' '}
              <strong className="text-[#F7F7F8]">CrestFlow</strong>, operated by{' '}
              <strong className="text-[#F7F7F8]">Tilak Popat Films</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F7F7F8] mb-2.5">
              2. Trial &amp; Paid Plans
            </h2>
            <p className="mb-2">
              New accounts can explore CrestFlow with sample data and activate a single-use trial:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>7-Day Free Trial: &#8377;0 ({TRIAL_PROMISE_COPY})</li>
              <li>Pro Monthly: &#8377;79 per month</li>
              <li>Pro Quarterly: &#8377;199 per quarter</li>
              <li>Pro Yearly: &#8377;699 per year</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F7F7F8] mb-2.5">3. Cancellation Terms</h2>
            <p className="mb-2">
              You may cancel auto-renewal anytime from Settings or Billing:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cancellation stops future automatic renewals.</li>
              <li>You keep full Pro access until the end of your current paid period.</li>
              <li>After expiry, all your workspace data stays readable and exportable (JSON &amp; CSV) anytime.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F7F7F8] mb-2.5">4. Refund Conditions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-[#F7F7F8]">7-Day Refund Window:</strong> You may request a refund within{' '}
                <strong className="text-[#F7F7F8]">7 calendar days</strong> of your initial paid subscription charge.
              </li>
              <li>
                <strong className="text-[#F7F7F8]">Duplicate Charges:</strong> Verified duplicate transactions caused by network retries are refunded in full.
              </li>
              <li>
                <strong className="text-[#F7F7F8]">Renewal Notice:</strong> Renewal charges are non-refundable once the renewal cycle starts; cancel prior to the renewal date to prevent the next charge.
              </li>
              <li>
                <strong className="text-[#F7F7F8]">Processing Timeline:</strong> Approved refunds are returned via Razorpay to the original payment method within 5&ndash;7 business days.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#F7F7F8] mb-2.5">5. Contact</h2>
            <p>
              To request a refund or ask billing questions, email{' '}
              <a href="mailto:support.crestflow@gmail.com" className="text-[#F7F7F8] underline">
                support.crestflow@gmail.com
              </a>{' '}
              or visit our{' '}
              <a href="/contact" onClick={handleContactLink} className="text-[#F7F7F8] underline">
                Contact Page
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
