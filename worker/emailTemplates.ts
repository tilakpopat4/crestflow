/**
 * CrestFlow Server-Side Email Template Registry
 * Strict schemas, zero emojis, and restrained styling conforming to GEMINI.md.
 */

export interface EmailTemplateRenderResult {
  subject: string;
  html: string;
  text: string;
}

export type SupportedEventType =
  | 'contact_submission'
  | 'welcome_freelancer'
  | 'payment_charged'
  | 'work_milestone'
  | 'new_client_request'
  | 'scheduled_reminder';

/**
 * Escapes HTML characters to prevent XSS and template injection.
 */
export function escapeHtml(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Common HTML wrapper adhering to CrestFlow's flat, restrained design system.
 * Zero emojis, clean typography, neutral borders, and support contact footer.
 */
export function wrapEmailHtml(title: string, contentHtml: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; line-height: 1.5; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px; }
    .brand { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 24px; letter-spacing: -0.02em; }
    h1 { font-size: 20px; font-weight: 600; color: #0F172A; margin-top: 0; margin-bottom: 16px; }
    p { font-size: 14px; color: #475569; margin: 0 0 16px 0; }
    .table-wrap { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .table-wrap td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; color: #334155; }
    .table-wrap td.label { font-weight: 500; color: #64748B; width: 35%; }
    .btn { display: inline-block; background-color: #4F46E5; color: #FFFFFF !important; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 18px; border-radius: 6px; margin: 12px 0 20px 0; }
    .footer { font-size: 12px; color: #94A3B8; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">CrestFlow</div>
    ${contentHtml}
    <div class="footer">
      This is an automated operational notification from CrestFlow. Need help? Contact our team at <a href="mailto:support.crestflow@gmail.com" style="color: #64748B;">support.crestflow@gmail.com</a>.
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Contact Form Submission (Sent to CrestFlow Support or Freelancer)
 */
export function renderContactSubmissionTemplate(data: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): EmailTemplateRenderResult {
  const name = escapeHtml(data.senderName);
  const email = escapeHtml(data.senderEmail);
  const subj = escapeHtml(data.subject);
  const msg = escapeHtml(data.message).replace(/\n/g, '<br>');

  const emailSubject = `Contact Inquiry: ${data.subject}`;
  const text = `Contact Inquiry from ${data.senderName} (${data.senderEmail})\n\nSubject: ${data.subject}\n\nMessage:\n${data.message}\n\n— CrestFlow System`;
  const html = wrapEmailHtml(
    emailSubject,
    `<h1>New Contact Form Submission</h1>
     <p>A new message has been submitted through the CrestFlow contact form:</p>
     <table class="table-wrap">
       <tr><td class="label">Sender Name</td><td>${name}</td></tr>
       <tr><td class="label">Email Address</td><td><a href="mailto:${email}">${email}</a></td></tr>
       <tr><td class="label">Subject</td><td>${subj}</td></tr>
     </table>
     <p><strong>Message:</strong></p>
     <p style="background: #F8FAFC; padding: 14px; border: 1px solid #E2E8F0; border-radius: 6px; white-space: pre-wrap;">${msg}</p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 2. Welcome Freelancer Onboarding
 */
export function renderWelcomeFreelancerTemplate(data: {
  name?: string;
  workspaceUrl?: string;
}): EmailTemplateRenderResult {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : 'Hello,';
  const url = escapeHtml(data.workspaceUrl || 'https://crestflow.app/profile');

  const emailSubject = 'Welcome to CrestFlow';
  const text = `${data.name ? `Hi ${data.name},` : 'Hello,'}\n\nWelcome to CrestFlow — your independent client manager and invoicing workspace.\n\nHere are 3 quick steps to get fully set up:\n1. Configure your UPI ID in Profile Settings for zero-touch invoice QR generation.\n2. Share your public client intake link with prospective clients.\n3. Log your first active deliverable or client contract.\n\nOpen Workspace: ${data.workspaceUrl || 'https://crestflow.app/profile'}\n\nIf you have any questions, our support team is available at support.crestflow@gmail.com.\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>Welcome to CrestFlow</h1>
     <p>${greeting}</p>
     <p>Welcome to CrestFlow — your focused workspace for client relationship management, video deliverables, and direct UPI invoicing.</p>
     <p>Here are three quick steps to get started:</p>
     <ol style="font-size: 14px; color: #475569; padding-left: 20px; line-height: 1.8;">
       <li><strong>Configure your UPI ID:</strong> Add your payment handle in Profile Settings to enable instant QR code invoices.</li>
       <li><strong>Share your intake link:</strong> Send your public onboarding link to prospective clients to capture new leads automatically.</li>
       <li><strong>Log your first project:</strong> Track your deliverables and client billing cycles with ease.</li>
     </ol>
     <p><a href="${url}" class="btn">Complete Your Profile</a></p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 3. Monthly Payment Cycle Receipt
 */
export function renderPaymentChargedTemplate(data: {
  name?: string;
  planName: string;
  amountFormatted: string;
  periodStart: string;
  periodEnd: string;
  nextBillingDate?: string;
  invoiceId?: string;
}): EmailTemplateRenderResult {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : 'Hello,';
  const plan = escapeHtml(data.planName);
  const amount = escapeHtml(data.amountFormatted);
  const pStart = escapeHtml(data.periodStart);
  const pEnd = escapeHtml(data.periodEnd);
  const nextDate = escapeHtml(data.nextBillingDate || data.periodEnd);
  const inv = escapeHtml(data.invoiceId || 'N/A');

  const emailSubject = `Payment Confirmation: CrestFlow ${data.planName}`;
  const text = `${data.name ? `Hi ${data.name},` : 'Hello,'}\n\nYour payment of ${data.amountFormatted} for CrestFlow ${data.planName} has been processed successfully.\n\nBilling Summary:\n- Plan: CrestFlow ${data.planName}\n- Amount: ${data.amountFormatted}\n- Period: ${data.periodStart} to ${data.periodEnd}\n- Next Renewal Date: ${data.nextBillingDate || data.periodEnd}\n- Reference ID: ${data.invoiceId || 'N/A'}\n\nYour access remains active uninterrupted.\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>Payment Confirmed</h1>
     <p>${greeting}</p>
     <p>Thank you for your payment. Your recurring subscription has renewed successfully.</p>
     <table class="table-wrap">
       <tr><td class="label">Plan</td><td>CrestFlow ${plan}</td></tr>
       <tr><td class="label">Amount Paid</td><td><strong>${amount}</strong></td></tr>
       <tr><td class="label">Coverage Period</td><td>${pStart} – ${pEnd}</td></tr>
       <tr><td class="label">Next Billing Date</td><td>${nextDate}</td></tr>
       <tr><td class="label">Reference ID</td><td><code>${inv}</code></td></tr>
     </table>
     <p><a href="https://crestflow.app/profile" class="btn">View Subscription</a></p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 4. Work Days Milestone Celebration
 */
export function renderWorkMilestoneTemplate(data: {
  name?: string;
  milestoneTitle: string;
  daysWorked: number;
  durationFormatted: string;
}): EmailTemplateRenderResult {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : 'Hello,';
  const title = escapeHtml(data.milestoneTitle);
  const days = data.daysWorked;
  const duration = escapeHtml(data.durationFormatted);

  const emailSubject = `Milestone Reached: ${data.milestoneTitle}`;
  const text = `${data.name ? `Hi ${data.name},` : 'Hello,'}\n\nCongratulations on reaching a major milestone in your freelancing career: ${data.milestoneTitle} (${data.daysWorked} days worked, ${data.durationFormatted}).\n\nYour dedication and consistent client delivery continue to build a lasting independent business.\n\nKeep building,\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>Milestone Reached</h1>
     <p>${greeting}</p>
     <p>Congratulations on reaching an inspiring career milestone:</p>
     <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 16px 0; text-align: center;">
       <div style="font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 6px;">${title}</div>
       <div style="font-size: 13px; color: #64748B;">${days} active days of freelancing &bull; ${duration}</div>
     </div>
     <p>Every logged deliverable, client invoice, and completed project reflects your mastery as an independent professional. We are proud to support your workflow.</p>
     <p><a href="https://crestflow.app/dashboard" class="btn">View Dashboard</a></p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 5. New Client Onboarding Request
 */
export function renderNewClientRequestTemplate(data: {
  freelancerName?: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  instagram?: string;
  proposedRate?: number;
  projectDetails: string;
  reviewUrl?: string;
}): EmailTemplateRenderResult {
  const greeting = data.freelancerName ? `Hi ${escapeHtml(data.freelancerName)},` : 'Hello,';
  const cName = escapeHtml(data.clientName);
  const contact = escapeHtml(data.contactName);
  const email = escapeHtml(data.contactEmail);
  const phone = escapeHtml(data.contactPhone);
  const ig = data.instagram ? escapeHtml(data.instagram) : 'N/A';
  const rate = data.proposedRate ? `₹${data.proposedRate}` : 'Not specified';
  const details = escapeHtml(data.projectDetails).replace(/\n/g, '<br>');
  const reviewUrl = escapeHtml(data.reviewUrl || 'https://crestflow.app/clients');

  const emailSubject = `New Client Request: ${data.clientName}`;
  const text = `${data.freelancerName ? `Hi ${data.freelancerName},` : 'Hello,'}\n\nA prospective client just submitted an onboarding request through your CrestFlow portfolio link.\n\nClient Details:\n- Client: ${data.clientName}\n- Contact: ${data.contactName} (${data.contactPhone}, ${data.contactEmail})\n- Instagram: ${data.instagram || 'N/A'}\n- Proposed Rate: ${data.proposedRate ? `₹${data.proposedRate}` : 'Not specified'}\n\nProject Scope:\n${data.projectDetails}\n\nReview Request: ${data.reviewUrl || 'https://crestflow.app/clients'}\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>New Client Request Received</h1>
     <p>${greeting}</p>
     <p>A new prospective client has submitted an onboarding request through your CrestFlow link:</p>
     <table class="table-wrap">
       <tr><td class="label">Client / Brand</td><td><strong>${cName}</strong></td></tr>
       <tr><td class="label">Contact Person</td><td>${contact}</td></tr>
       <tr><td class="label">Contact Phone</td><td>${phone}</td></tr>
       <tr><td class="label">Contact Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
       <tr><td class="label">Instagram</td><td>${ig}</td></tr>
       <tr><td class="label">Proposed Rate</td><td>${rate}</td></tr>
     </table>
     <p><strong>Project Scope &amp; Details:</strong></p>
     <p style="background: #F8FAFC; padding: 14px; border: 1px solid #E2E8F0; border-radius: 6px; white-space: pre-wrap;">${details}</p>
     <p><a href="${reviewUrl}" class="btn">Review in CrestFlow</a></p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 6. Scheduled Reminder / Administrative Notice
 */
export function renderScheduledReminderTemplate(data: {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}): EmailTemplateRenderResult {
  const title = escapeHtml(data.title);
  const msg = escapeHtml(data.message).replace(/\n/g, '<br>');
  const url = data.actionUrl ? escapeHtml(data.actionUrl) : undefined;
  const label = escapeHtml(data.actionLabel || 'View in CrestFlow');

  const emailSubject = data.title;
  const text = `${data.title}\n\n${data.message}\n\n${data.actionUrl ? `Link: ${data.actionUrl}\n\n` : ''}— The CrestFlow Team`;

  const buttonHtml = url ? `<p><a href="${url}" class="btn">${label}</a></p>` : '';
  const html = wrapEmailHtml(
    emailSubject,
    `<h1>${title}</h1>
     <p style="white-space: pre-wrap;">${msg}</p>
     ${buttonHtml}`
  );

  return { subject: emailSubject, html, text };
}

/**
 * Master dispatcher that renders any supported event type with schema validation.
 */
export function renderEmailTemplate(eventType: SupportedEventType, data: any): EmailTemplateRenderResult {
  switch (eventType) {
    case 'contact_submission':
      return renderContactSubmissionTemplate(data);
    case 'welcome_freelancer':
      return renderWelcomeFreelancerTemplate(data);
    case 'payment_charged':
      return renderPaymentChargedTemplate(data);
    case 'work_milestone':
      return renderWorkMilestoneTemplate(data);
    case 'new_client_request':
      return renderNewClientRequestTemplate(data);
    case 'scheduled_reminder':
      return renderScheduledReminderTemplate(data);
    default:
      throw new Error(`Unsupported email event type: ${eventType}`);
  }
}
