/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';

interface TermsOfServicePageProps {
  onNavigate?: (route: 'privacy' | 'terms' | 'contact') => void;
}

export default function TermsOfServicePage({ onNavigate }: TermsOfServicePageProps) {
  const handleContactLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    window.history.pushState({}, '', '/contact');
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (onNavigate) {
      onNavigate('contact');
    }
  };

  return (
    <div className="w-full py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-8">
          Last updated: October 12, 2026
        </p>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, registering for, or using the CrestFlow application ("Service"), operated by <strong className="text-slate-900 dark:text-slate-100">{'{{BUSINESS_NAME}}'}</strong> ("we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              2. Account Responsibilities
            </h2>
            <p className="mb-2">
              To access the features of CrestFlow, you must authenticate through a valid Google account. You agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>You are responsible for maintaining the confidentiality of your credentials and account access.</li>
              <li>You are entirely responsible for all activities, data entries, and communications conducted under your account.</li>
              <li>You will provide accurate, current, and complete business information when setting up your profile and invoices.</li>
              <li>You will promptly notify us of any unauthorized use or security compromise regarding your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              3. Acceptable Use
            </h2>
            <p className="mb-2">
              You agree to use CrestFlow strictly for lawful professional client management purposes. You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Use the Gmail API integration to transmit unsolicited commercial messages, bulk spam, fraudulent billing claims, or malicious software.</li>
              <li>Attempt to reverse-engineer, decompile, or disrupt the integrity or security of the Service or its underlying database.</li>
              <li>Impersonate any person or business entity, or misrepresent your affiliation with another entity.</li>
              <li>Store or distribute illegal, infringing, or defamatory materials through work logs or invoice attachments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              4. User Content and Ownership
            </h2>
            <p>
              You retain full, exclusive ownership of all data, client lists, work descriptions, rates, invoices, media assets, and files that you input or upload into CrestFlow ("User Content"). We do not claim any intellectual property rights or ownership over your User Content. You grant us only the limited, non-exclusive license necessary to store, display, and transmit your User Content solely to operate the Service on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              5. Third-Party Integrations
            </h2>
            <p className="mb-2">
              CrestFlow integrates with several third-party services:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Google APIs:</strong> CrestFlow's use of information received from Google APIs complies with the Google API Services User Data Policy, including the Limited Use requirements.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Google Drive & Gmail:</strong> By connecting your Google account, you agree to comply with Google's Terms of Service and Acceptable Use Policies.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Cloud Infrastructure:</strong> CrestFlow relies on Firebase and cloud hosting. We are not responsible for service outages or changes originating directly from third-party infrastructure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              6. Availability and Changes to the Service
            </h2>
            <p>
              We strive to keep CrestFlow reliable and available. However, the Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. We reserve the right to modify, enhance, update, or discontinue features of the application at any time with or without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall CrestFlow, its operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or business interruption, arising out of or related to your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              8. Termination
            </h2>
            <p>
              You may terminate your agreement with these Terms at any time by ceasing use of the application and requesting account deletion. We reserve the right to suspend or block access to accounts that violate these Terms, engage in abusive practices, or jeopardize platform security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              9. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of <strong className="text-slate-900 dark:text-slate-100">{'{{GOVERNING_LAW_JURISDICTION}}'}</strong>, without regard to its conflict of law principles. Any legal suit, action, or proceeding arising out of or related to these Terms shall be instituted exclusively in the competent courts of that jurisdiction.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              10. Contact
            </h2>
            <p>
              If you have any questions about these Terms of Service, please contact:
            </p>
            <div className="mt-3 space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-slate-100">{'{{BUSINESS_NAME}}'}</strong></p>
              <p>Email: <a href="mailto:{{SUPPORT_EMAIL}}" className="text-slate-900 dark:text-slate-100 hover:underline">{'{{SUPPORT_EMAIL}}'}</a></p>
              <p>Address: {'{{BUSINESS_ADDRESS}}'}</p>
              <p className="mt-2">
                You may also submit inquiries through our{' '}
                <a href="/contact" onClick={handleContactLink} className="text-slate-900 dark:text-slate-100 hover:underline font-medium">
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
