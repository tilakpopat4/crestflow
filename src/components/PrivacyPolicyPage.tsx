/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';

interface PrivacyPolicyPageProps {
  onNavigate?: (route: 'privacy' | 'terms' | 'contact') => void;
}

export default function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
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
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-8">
          Last updated: October 12, 2026
        </p>

        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              1. Information We Collect
            </h2>
            <p className="mb-2">
              We collect information that you provide directly when setting up and using your CrestFlow account:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Account Details:</strong> When you authenticate via Google Sign-In, we receive your name, email address, profile picture URL, and unique Google account identifier.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">User Profile Settings:</strong> Your freelance business name, professional title, contact phone number, default billing basis, UPI payment ID, payment QR code data, and freelance career start date.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Client Records:</strong> Client names, email addresses, billing addresses, phone numbers, payment basis (monthly retainer or per-deliverable), payment cycle intervals, agreed rates, notes, and sub-client structures.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Work Log Entries:</strong> Deliverable titles, descriptions, completion dates, quantities, applied rates, sub-client tags, and invoice association status.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Invoices:</strong> Invoice numbers, line item deliverables, issue dates, due dates, discount and expense line items, payment statuses, and recorded payment dates.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Uploaded Video Links and Media Files:</strong> Google Drive shareable URLs, YouTube or Vimeo video links, uploaded thumbnail and media file metadata associated with your work items.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Client Reviews:</strong> Client submitter names, ratings, written reviews, and timestamps collected through your client portal or feedback forms.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              2. How We Use Information
            </h2>
            <p className="mb-2">
              We use the collected information strictly to operate, maintain, and provide the features of CrestFlow:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>To authenticate your account and securely isolate your workspace data.</li>
              <li>To manage your client directory, track logged deliverables, and calculate financial balances.</li>
              <li>To generate PDF invoices and receipts directly in your web browser.</li>
              <li>To compose and send invoice emails with PDF attachments via your authorized Gmail account, strictly upon your explicit user action.</li>
              <li>To generate optional AI work summaries using the Google Gemini API when initiated by you.</li>
              <li>To provide payment cycle reminders via browser push notifications.</li>
              <li>To serve the client portal and public booking profile configured by you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              3. Data Storage and Third-Party Services
            </h2>
            <p className="mb-2">
              CrestFlow relies on trusted infrastructure providers to store and process data:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Authentication & Cloud Database:</strong> Google Firebase Authentication and Google Cloud Firestore. Your database records are stored in secure Firestore collections protected by user-level security rules.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Google Drive:</strong> Used via the Google Drive API (Drive v3) when you upload files directly to your personal Drive or link Drive preview videos.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Gmail:</strong> Used via authorized OAuth scopes (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">gmail.send</code> and <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">gmail.compose</code>) exclusively to compose and send invoices from your email account upon your explicit click. We do not read your inbox, access private messages, or store your email logs.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">AI Summarization:</strong> Google Gemini API (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">@google/genai</code>) used strictly for processing work log text when you click "Summarize Work".
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Push Notifications:</strong> Firebase Cloud Messaging (FCM) to deliver payment reminders to registered browser sessions.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Hosting:</strong> Vercel and cloud web hosting infrastructure delivering application assets over HTTPS.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              4. Data Sharing
            </h2>
            <p>
              We do not sell, rent, trade, or share your personal data, client records, or Google user data with any third-party advertisers, data brokers, or marketing platforms. Data is processed solely by the infrastructure providers mentioned above to execute the service functions you request.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              5. Cookies and Local Storage
            </h2>
            <p className="mb-2">
              CrestFlow does not use tracking cookies or third-party advertising cookies. We use:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Session Cookies:</strong> Maintained securely by Firebase Authentication to keep you signed in.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Local Storage:</strong> Browser localStorage is used strictly for offline performance and preference persistence:
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">theme</code>: Stores your light or dark display preference.</li>
                  <li><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">crestflow_profile_*</code>: Local cache of your user profile to prevent layout shift on load.</li>
                  <li><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">crestflow_profile_completed_*</code>: Records completion of initial onboarding.</li>
                  <li><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">crestflow_anniversary_dismissed_*</code>: Records dismissed milestone alerts.</li>
                  <li><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">fcm_token</code>: Caches your browser push notification token.</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              6. Data Retention and Deletion
            </h2>
            <p>
              Your data is retained for as long as your account is active. You can delete individual client profiles, work log entries, and invoice records at any time directly through the dashboard. If you wish to permanently delete your entire account, profile, and all associated Firestore records, you may submit a request to <a href="mailto:work.tilakpopatfilms@gmail.com" className="text-slate-900 dark:text-slate-100 hover:underline font-medium">work.tilakpopatfilms@gmail.com</a> or via our <a href="/contact" onClick={handleContactLink} className="text-slate-900 dark:text-slate-100 hover:underline font-medium">Contact Us</a> page. We process deletion requests within 30 business days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              7. Security
            </h2>
            <p>
              We implement industry-standard safeguards to protect your information. User data is isolated and protected by Cloud Firestore security rules requiring user authentication for document access. All data transmission between your browser and our servers occurs over encrypted HTTPS/TLS connections. We do not store Google account passwords on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              8. Your Rights and Choices
            </h2>
            <p className="mb-2">
              You maintain full ownership and control over your records:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong className="text-slate-800 dark:text-slate-200">Access and Correction:</strong> You can review, update, or edit your account information and records directly in the application.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Export:</strong> You can export work logs via CSV and download invoices as standard PDF files.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Revoke Permissions:</strong> You can revoke CrestFlow's access to your Google account (Gmail and Drive) at any time through your Google Account Security Settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When updates are published, the "Last updated" date at the top of this document will be revised accordingly. Continued use of the application after changes constitute acceptance of the updated policy.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              10. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-slate-100">Tilak Popat Films</strong></p>
              <p>Email: <a href="mailto:work.tilakpopatfilms@gmail.com" className="text-slate-900 dark:text-slate-100 hover:underline">work.tilakpopatfilms@gmail.com</a></p>
              <p>Address: Gandhinagar, Gujarat, 382421</p>
              <p className="mt-2">
                Or send us a message directly via our{' '}
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
