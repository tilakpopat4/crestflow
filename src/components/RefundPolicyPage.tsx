/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';

interface RefundPolicyPageProps {
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund') => void;
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
          Last updated: October 21, 2026
        </p>

        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              1. Overview
            </h2>
            <p>
              This Cancellation and Refund Policy applies to subscriptions and software services provided by{' '}
              <strong className="text-slate-900 dark:text-slate-100">Tilak Popat Films</strong> (&quot;CrestFlow&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              By purchasing a subscription to CrestFlow Pro, you agree to the terms outlined below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              2. Subscription Plans &amp; Billing
            </h2>
            <p className="mb-2">
              CrestFlow offers a Free tier with core limits (up to 2 clients and 3 invoices/month) and a premium Pro plan:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong className="text-slate-900 dark:text-slate-100">CrestFlow Pro Monthly:</strong> &#8377;79 per month (billed monthly).</li>
              <li><strong className="text-slate-900 dark:text-slate-100">CrestFlow Pro Yearly:</strong> &#8377;799 per year (billed annually).</li>
            </ul>
            <p className="mt-2">
              Subscriptions automatically renew at the end of each billing cycle unless cancelled prior to the renewal date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              3. Cancellation Policy
            </h2>
            <p className="mb-2">
              You can cancel your subscription at any time without penalty or cancellation fees:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>You may cancel directly inside your CrestFlow account under <strong className="text-slate-900 dark:text-slate-100">Settings &gt; Profile &gt; Subscription</strong> by clicking &quot;Cancel Subscription&quot;.</li>
              <li>When you cancel, your Pro access remains active until the end of your current paid billing period.</li>
              <li>No further automatic recurring renewals or deductions will take place once cancellation is confirmed.</li>
              <li>After your billing period concludes, your account reverts to the Free tier with your existing data preserved.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              4. Refund Policy
            </h2>
            <p className="mb-2">
              We stand behind the quality and reliability of CrestFlow:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong className="text-slate-900 dark:text-slate-100">7-Day Money-Back Guarantee:</strong> If you are not satisfied with CrestFlow Pro, you can request a full refund within 7 calendar days of your initial subscription purchase or subsequent renewal.</li>
              <li><strong className="text-slate-900 dark:text-slate-100">Requests after 7 days:</strong> Refund requests made after 7 calendar days from the transaction date are not eligible for a refund, but you will retain full Pro access until your current period expires.</li>
              <li><strong className="text-slate-900 dark:text-slate-100">Duplicate Transactions:</strong> If you were accidentally charged twice for the same billing cycle due to a technical error, we will promptly refund the duplicate transaction in full upon notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              5. Direct Invoice UPI Payments (Third-Party Client Payments)
            </h2>
            <p>
              CrestFlow features direct UPI QR code generation on invoices to allow freelancers to collect funds directly from their own clients into their personal or business bank accounts.
              CrestFlow does not act as a payment gateway, escrow service, or merchant of record for transactions between you and your clients.
              Disputes, chargebacks, or refund requests between freelancers and their clients must be handled directly between the freelancer and their client.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              6. How to Request a Refund
            </h2>
            <p className="mb-2">
              To request a refund for your CrestFlow Pro subscription, please reach out to us with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Your registered account email address.</li>
              <li>Your Razorpay payment ID or invoice number (available in your email receipt).</li>
              <li>A brief explanation of why the service did not meet your expectations (optional, but helps us improve).</li>
            </ul>
            <p className="mt-3">
              Approved refunds are initiated via Razorpay to your original method of payment within 24 to 48 hours. Depending on your bank or card issuer, funds typically reflect in your account within 5 to 7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              7. Contact Information
            </h2>
            <p>
              If you have any questions about this Cancellation &amp; Refund Policy, please contact our support team:
            </p>
            <div className="mt-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 space-y-1 text-sm">
              <p><strong className="text-slate-900 dark:text-slate-100">Email:</strong> tilakpopatfilms@gmail.com</p>
              <p><strong className="text-slate-900 dark:text-slate-100">Support Hours:</strong> Monday – Saturday, 10:00 AM – 7:00 PM IST</p>
              <p>
                <a
                  href="/contact"
                  onClick={handleContactLink}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-block mt-1"
                >
                  Visit Contact Page &rarr;
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
