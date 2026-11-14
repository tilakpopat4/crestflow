/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';

interface TermsOfServicePageProps {
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing') => void;
}

export default function TermsOfServicePage({ onNavigate }: TermsOfServicePageProps) {
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
          Terms of Service
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-8">
          Last updated: October 2026 &bull; Review Status: Pending Legal Verification
        </p>

        <div className="space-y-6 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, registering for, or using the CrestFlow application (&quot;Service&quot;), operated by <strong className="text-slate-900 dark:text-slate-100">{`{{LEGAL_ENTITY_NAME}}`}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              2. Account Responsibilities
            </h2>
            <p className="mb-2">
              To access the features of CrestFlow, you must authenticate through a valid Google account. You agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>You are responsible for maintaining the confidentiality of your credentials and account access.</li>
              <li>You are entirely responsible for all activities, data entries, and communications conducted under your account.</li>
              <li>You will provide accurate, current, and complete business information when setting up your profile, UPI details, and invoices.</li>
              <li>You will promptly notify us of any unauthorized use or security compromise regarding your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              3. Acceptable Use
            </h2>
            <p className="mb-2">
              You agree to use CrestFlow strictly for lawful professional client management purposes. You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Use the Gmail API or messaging integration to transmit unsolicited commercial messages, bulk spam, or fraudulent claims.</li>
              <li>Attempt to reverse-engineer, decompile, or disrupt the integrity or security of the Service or its underlying database.</li>
              <li>Impersonate any person or business entity, or misrepresent your affiliation with another entity.</li>
              <li>Store or distribute illegal, infringing, or defamatory materials through work logs or invoice attachments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              4. User Content and Ownership
            </h2>
            <p>
              You retain full, exclusive ownership of all data, client lists, work descriptions, rates, invoices, media assets, and files that you input into CrestFlow (&quot;User Content&quot;). We do not claim any intellectual property rights or ownership over your User Content. You grant us only the limited, non-exclusive license necessary to store, display, and transmit your User Content solely to operate the Service on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              5. Subscription Billing and Payments via Razorpay
            </h2>
            <p className="mb-2">
              Paid subscriptions for CrestFlow Pro are billed and renewed through our authorized payment gateway partner, Razorpay:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>All subscription fees are stated and charged in Indian Rupees (INR) inclusive of applicable taxes.</li>
              <li>Subscriptions renew automatically according to the selected billing cycle ({`{{SUBSCRIPTION_BILLING_CYCLES}}`}) unless cancelled prior to renewal.</li>
              <li>Cancellation and refund terms are subject to our dedicated <a href="/refund" onClick={(e) => { e.preventDefault(); onNavigate?.('refund'); }} className="text-indigo-600 dark:text-indigo-400 hover:underline">Cancellation &amp; Refund Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall CrestFlow, its operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption, arising out of or related to your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              7. Governing Law and Jurisdiction (India)
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any legal dispute, claim, or proceeding arising out of or related to these Terms shall be instituted exclusively in the competent courts located in <strong className="text-slate-900 dark:text-slate-100">{`{{GOVERNING_STATE_AND_CITY}}`}</strong>, India.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              8. Contact &amp; Grievance Redressal
            </h2>
            <p>
              If you have any questions about these Terms of Service or require support, please contact:
            </p>
            <div className="mt-3 space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-slate-100">{`{{LEGAL_ENTITY_NAME}}`}</strong></p>
              <p>Support Email: <a href={`mailto:{{SUPPORT_EMAIL}}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{`{{SUPPORT_EMAIL}}`}</a></p>
              <p>Registered Address: {`{{COMPANY_ADDRESS}}`}</p>
              <p>Grievance Officer: {`{{GRIEVANCE_OFFICER_NAME}}`} (<a href={`mailto:{{GRIEVANCE_OFFICER_EMAIL}}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{`{{GRIEVANCE_OFFICER_EMAIL}}`}</a>)</p>
              <p className="mt-2">
                Response SLA: Inquiries are addressed {`{{SUPPORT_RESPONSE_TIME}}`}. You may also submit inquiries through our{' '}
                <a href="/contact" onClick={handleContactLink} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Contact Us page
                </a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
