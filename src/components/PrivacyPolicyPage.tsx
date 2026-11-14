/* Draft: review with a qualified legal professional before publishing. */

import React from 'react';

interface PrivacyPolicyPageProps {
  onNavigate?: (route: 'privacy' | 'terms' | 'contact' | 'refund' | 'pricing') => void;
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Privacy Policy
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
              This Privacy Policy explains how <strong className="text-slate-900 dark:text-slate-100">{`{{LEGAL_ENTITY_NAME}}`}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and safeguards information when you use the CrestFlow platform (&quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              2. Data We Collect
            </h2>
            <p className="mb-2">
              We collect information strictly necessary to provide freelance workflow and invoicing services:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li><strong className="text-slate-800 dark:text-slate-200">Account Identity:</strong> Google account profile information (email, full name, profile picture) during Google OAuth sign-in.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Freelancer Profile:</strong> Professional title, business bio, portfolio links, and freelance start date.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Invoicing &amp; Payout Rails:</strong> Personal UPI ID (VPA) and optional bank account details entered by you to render on your client invoices.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Workflow Entities:</strong> Client contact details, work item logs, deliverables, and invoice line items.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              3. How Your Information Is Used
            </h2>
            <p className="mb-2">
              Collected information is used solely to operate the core platform:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Generating professional invoices with dynamic QR codes for direct client payment.</li>
              <li>Hosting branded client review portals for deliverable review and sign-off.</li>
              <li>Automating delivery scheduling via connected Google Workspace integrations (when authorized by you).</li>
              <li>Processing Pro subscription orders and webhooks via Razorpay.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              4. Payment Processing via Razorpay
            </h2>
            <p>
              Subscription payments for CrestFlow Pro are processed through Razorpay. We do not process, receive, or store your credit card numbers, CVVs, or net banking passwords. Transaction data is secured under Razorpay&apos;s PCI-DSS compliant payment gateway standards.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              5. Data Retention and Deletion
            </h2>
            <p>
              Your account data and workspace records are retained as long as your account remains active. Upon written request for account deletion, your profile and workspace records are purged from active databases {`{{DATA_RETENTION_PERIOD}}`}, except where retention is legally mandated under Indian accounting and financial compliance laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              6. User Rights and Controls
            </h2>
            <p className="mb-2">
              As a CrestFlow user, you maintain full control over your information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>You may update or remove client, invoice, or UPI details directly within your dashboard at any time.</li>
              <li>You may revoke Google permissions via your Google Security account settings.</li>
              <li>You may request an export or complete deletion of your records by contacting support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              7. Governing Law (India)
            </h2>
            <p>
              This Privacy Policy is governed by the laws of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. Disputes shall be subject to the exclusive jurisdiction of courts located in <strong className="text-slate-900 dark:text-slate-100">{`{{GOVERNING_STATE_AND_CITY}}`}</strong>, India.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              8. Contact &amp; Grievance Officer
            </h2>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-slate-100">{`{{LEGAL_ENTITY_NAME}}`}</strong></p>
              <p>Support Email: <a href={`mailto:{{SUPPORT_EMAIL}}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{`{{SUPPORT_EMAIL}}`}</a></p>
              <p>Address: {`{{COMPANY_ADDRESS}}`}</p>
              <p>Grievance Officer: {`{{GRIEVANCE_OFFICER_NAME}}`} (<a href={`mailto:{{GRIEVANCE_OFFICER_EMAIL}}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{`{{GRIEVANCE_OFFICER_EMAIL}}`}</a>)</p>
              <p className="mt-2">
                Response SLA: Support requests are acknowledged {`{{SUPPORT_RESPONSE_TIME}}`}. You can also reach us via the{' '}
                <a href="/contact" onClick={handleContactLink} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Contact Us form
                </a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
