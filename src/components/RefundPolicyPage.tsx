/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';

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
    <div className="w-full py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Cancellation &amp; Refund Policy
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-8">
          Last updated: October 2026 &bull; Review Status: Pending Legal Verification
        </p>

        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              1. Overview
            </h2>
            <p>
              This Cancellation and Refund Policy applies to all digital subscriptions and services offered on CrestFlow, operated by <strong className="text-slate-900 dark:text-slate-100">{`{{LEGAL_ENTITY_NAME}}`}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              2. Subscription Plans and Billing
            </h2>
            <p className="mb-2">
              CrestFlow provides a perpetual Free tier with basic limits alongside premium Pro memberships billed through Razorpay:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Free Plan: Up to 2 clients and 3 invoices per calendar month.</li>
              <li>Pro Monthly: &#8377;79 per month (billed monthly).</li>
              <li>Pro Quarterly: &#8377;199 per quarter (billed quarterly).</li>
              <li>Pro 6-Month: &#8377;449 per 6 months (billed semi-annually).</li>
              <li>Pro Yearly: &#8377;899 per year (billed annually).</li>
              <li>7-Day Trial: Introductory single-use trial access ({`{{TRIAL_PRICE}}`}).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              3. Cancellation Terms
            </h2>
            <p className="mb-2">
              You may cancel your CrestFlow Pro subscription at any time directly from your Settings or Billing page:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Cancellation halts future automated renewals on Razorpay.</li>
              <li>You will retain full Pro access until the conclusion of your current prepaid billing period.</li>
              <li>No further recurring charges will be initiated after successful cancellation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              4. Refund Conditions
            </h2>
            <p className="mb-2">
              Refunds are reviewed on a case-by-case basis according to the following guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong className="text-slate-800 dark:text-slate-200">Initial Charge Window:</strong> If you are dissatisfied with CrestFlow Pro, you may request a refund within <strong className="text-slate-900 dark:text-slate-100">{`{{REFUND_REQUEST_WINDOW_DAYS}}`}</strong> of your initial billing date.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Duplicate or Overcharged Transactions:</strong> Unintended duplicate charges caused by network timeouts will be refunded in full upon verification.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Trial Fees:</strong> Nominal trial verification fees ({`{{TRIAL_PRICE}}`}) are non-refundable unless duplicate billing occurred.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Processing Timeline:</strong> Approved refunds are credited to the original payment source via Razorpay within 5 to 7 business days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              5. Governing Law (India)
            </h2>
            <p>
              This policy is governed by Indian law and the Consumer Protection (E-Commerce) Rules, 2020. Disputes fall within the exclusive jurisdiction of the courts of <strong className="text-slate-900 dark:text-slate-100">{`{{GOVERNING_STATE_AND_CITY}}`}</strong>, India.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              6. How to Request a Refund
            </h2>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p>Email your refund request to <a href={`mailto:{{SUPPORT_EMAIL}}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{`{{SUPPORT_EMAIL}}`}</a> with your registered Google email and Razorpay payment ID.</p>
              <p>Entity: <strong className="text-slate-900 dark:text-slate-100">{`{{LEGAL_ENTITY_NAME}}`}</strong></p>
              <p>Support SLA: Requests are acknowledged and processed {`{{SUPPORT_RESPONSE_TIME}}`}.</p>
              <p className="mt-2">
                You may also reach us via our{' '}
                <a href="/contact" onClick={handleContactLink} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Contact page
                </a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
