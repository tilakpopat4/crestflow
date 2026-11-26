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
        <h1 className="text-2xl md:text-3xl font-bold text-[#F7F7F8] dark:text-[#F7F7F8] tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs md:text-sm text-[#A1A1AA] dark:text-[#A1A1AA] mt-1.5 mb-8">
          Last updated: October 2026 &bull; Review Status: Pending Legal Verification
        </p>

        <div className="space-y-6 text-base text-[#A1A1AA] dark:text-[#A1A1AA] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, registering for, or using the CrestFlow application (&quot;Service&quot;), operated by <strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Tilak Popat Films</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              2. Account Responsibilities
            </h2>
            <p className="mb-2">
              To access the features of CrestFlow, you must authenticate through a valid Google account. You agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#A1A1AA] dark:text-[#A1A1AA]">
              <li>You are responsible for maintaining the confidentiality of your credentials and account access.</li>
              <li>You are entirely responsible for all activities, data entries, and communications conducted under your account.</li>
              <li>You will provide accurate, current, and complete business information when setting up your profile, UPI details, and invoices.</li>
              <li>You will promptly notify us of any unauthorized use or security compromise regarding your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              3. Acceptable Use
            </h2>
            <p className="mb-2">
              You agree to use CrestFlow strictly for lawful professional client management purposes. You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#A1A1AA] dark:text-[#A1A1AA]">
              <li>Use the Gmail API or messaging integration to transmit unsolicited commercial messages, bulk spam, or fraudulent claims.</li>
              <li>Attempt to reverse-engineer, decompile, or disrupt the integrity or security of the Service or its underlying database.</li>
              <li>Impersonate any person or business entity, or misrepresent your affiliation with another entity.</li>
              <li>Store or distribute illegal, infringing, or defamatory materials through work logs or invoice attachments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              4. User Content and Ownership
            </h2>
            <p>
              You retain full, exclusive ownership of all data, client lists, work descriptions, rates, invoices, media assets, and files that you input into CrestFlow (&quot;User Content&quot;). We do not claim any intellectual property rights or ownership over your User Content. You grant us only the limited, non-exclusive license necessary to store, display, and transmit your User Content solely to operate the Service on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              5. Subscription Billing and Payments via Razorpay
            </h2>
            <p className="mb-2">
              Paid subscriptions for CrestFlow Pro are billed and renewed through our authorized payment gateway partner, Razorpay:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#A1A1AA] dark:text-[#A1A1AA]">
              <li>All subscription fees are stated and charged in Indian Rupees (INR) inclusive of applicable taxes.</li>
              <li>Subscriptions renew automatically according to the selected billing cycle (monthly, quarterly, 6-month, or yearly) unless cancelled prior to renewal.</li>
              <li>Cancellation and refund terms are subject to our dedicated <a href="/refund" onClick={(e) => { e.preventDefault(); onNavigate?.('refund'); }} className="text-[#FF2D4A] dark:text-[#FF2D4A] hover:underline">Cancellation &amp; Refund Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall CrestFlow, its operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption, arising out of or related to your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              7. Governing Law and Jurisdiction (India)
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any legal dispute, claim, or proceeding arising out of or related to these Terms shall be instituted exclusively in the competent courts located in <strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Gandhinagar, Gujarat</strong>, India.
            </p>
          </section>

          <section className="pt-4 border-t border-[#2A2A33] dark:border-[#2A2A33]">
            <h2 className="text-lg font-bold text-[#F7F7F8] dark:text-[#F7F7F8] mb-2.5">
              8. Contact &amp; Grievance Redressal
            </h2>
            <p>
              If you have any questions about these Terms of Service or require support, please contact:
            </p>
            <div className="mt-3 space-y-1.5 text-[#A1A1AA] dark:text-[#A1A1AA]">
              <p><strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Product:</strong> CrestFlow</p>
              <p><strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Company:</strong> Tilak Popat Films</p>
              <p><strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Support Email:</strong> <a href="mailto:support.crestflow@gmail.com" className="text-[#FF2D4A] dark:text-[#FF2D4A] hover:underline">support.crestflow@gmail.com</a></p>
              <p><strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Registered Address:</strong> Uvarsad, Gandhinagar, Gujarat, INDIA.</p>
              <p><strong className="text-[#F7F7F8] dark:text-[#F7F7F8]">Response Time:</strong> 24-48 working hours.</p>
              <p className="pt-1 text-xs text-[#A1A1AA] dark:text-[#A1A1AA]">
                <strong>Grievance Officer:</strong> There is no separate Grievance Officer; all matters and legal concerns are handled directly by the Founder: <strong className="text-[#A1A1AA] dark:text-[#A1A1AA]">Tilak Popat</strong>.
              </p>
              <p className="mt-2 text-xs">
                You may also submit inquiries through our{' '}
                <a href="/contact" onClick={handleContactLink} className="text-[#FF2D4A] dark:text-[#FF2D4A] hover:underline font-medium">
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
