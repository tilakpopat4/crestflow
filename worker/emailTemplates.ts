/**
 * CrestFlow Server-Side Email Template Registry
 * Strict schemas, zero emojis, and restrained styling conforming to GEMINI.md.
 */

import {
  escapeHtml,
  wrapEmailHtml,
} from './emailWrapper';

export {
  escapeHtml,
  wrapEmailHtml,
};

export interface EmailTemplateRenderResult {
  subject: string;
  html: string;
  text: string;
}

export type SupportedEventType =
  | 'contact_submission'
  | 'contact_auto_reply'
  | 'welcome_freelancer'
  | 'payment_charged'
  | 'work_milestone'
  | 'payment_due_today'
  | 'new_client_request'
  | 'scheduled_reminder';

/**
 * 1. Contact Form Submission (Sent to CrestFlow Support)
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
 * 2. Contact Form Auto-Reply (Guaranteed 48h Response SLA)
 */
export function renderContactAutoReplyTemplate(data: {
  senderName: string;
  subject: string;
  originalMessage?: string;
}): EmailTemplateRenderResult {
  const name = escapeHtml(data.senderName);
  const subj = escapeHtml(data.subject);
  const msg = data.originalMessage ? escapeHtml(data.originalMessage).replace(/\n/g, '<br>') : '';

  const emailSubject = `We received your message — Our team will contact you within 48 hours | CrestFlow`;
  const text = `Hi ${data.senderName},\n\nThank you for getting in touch with CrestFlow.\n\nWe have received your message regarding "${data.subject}". Our team will contact you within 48 hours.\n\n${data.originalMessage ? `Your inquiry:\n${data.originalMessage}\n\n` : ''}If you have any urgent follow-up details, please reply directly to this email at support.crestflow@gmail.com.\n\nBest regards,\n— The CrestFlow Support Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>We Received Your Message</h1>
     <p>Hi ${name},</p>
     <p>Thank you for reaching out to CrestFlow. We have received your inquiry regarding <strong>${subj}</strong>.</p>
     <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin: 16px 0;">
       <p style="font-size: 14px; font-weight: 600; color: #0F172A; margin: 0 0 6px 0;">Our Team Will Contact You Within 48 Hours</p>
       <p style="font-size: 13px; color: #64748B; margin: 0;">A member of our support team is reviewing your message and will get back to you shortly.</p>
     </div>
     ${msg ? `<p style="font-size: 12px; color: #64748B; margin-bottom: 4px;"><strong>Summary of your message:</strong></p>
     <p style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; font-size: 13px; color: #334155; white-space: pre-wrap;">${msg}</p>` : ''}
     <p>If you have any further questions or attachments in the meantime, reply directly to this email at <a href="mailto:support.crestflow@gmail.com" style="color: #4F46E5;">support.crestflow@gmail.com</a>.</p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 3. Welcome Freelancer Onboarding ("Congrats You've Started Your Journey")
 */
export function renderWelcomeFreelancerTemplate(data: {
  name?: string;
  workspaceUrl?: string;
}): EmailTemplateRenderResult {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : 'Hello,';
  const url = escapeHtml(data.workspaceUrl || 'https://crestflow.app/profile');

  const emailSubject = "Congrats You've Started Your Journey | CrestFlow";
  const text = `${data.name ? `Hi ${data.name},` : 'Hello,'}\n\nCongrats! You've started your journey with CrestFlow — your independent client manager and invoicing workspace.\n\nHere are 3 quick steps to get fully set up:\n1. Configure your UPI ID in Profile Settings for zero-touch invoice QR generation.\n2. Share your public client intake link with prospective clients.\n3. Log your first active deliverable or client contract.\n\nOpen Workspace: ${data.workspaceUrl || 'https://crestflow.app/profile'}\n\nIf you have any questions, our support team is available at support.crestflow@gmail.com.\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>Congrats You've Started Your Journey</h1>
     <p>${greeting}</p>
     <p>Congratulations on taking the leap into independent freelancing. CrestFlow is built to keep your deliverables, client relationships, and direct UPI invoicing organized in one place.</p>
     <p>Here are three quick steps to get started:</p>
     <ol style="font-size: 14px; color: #475569; padding-left: 20px; line-height: 1.8;">
       <li><strong>Configure your UPI ID:</strong> Add your payment handle in Profile Settings to enable instant QR code invoices.</li>
       <li><strong>Share your intake link:</strong> Send your public onboarding link to prospective clients to capture new leads automatically.</li>
       <li><strong>Log your first project:</strong> Track your deliverables and client billing cycles with ease.</li>
     </ol>
     <p><a href="${url}" class="btn">Open Your Workspace</a></p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 4. Monthly Payment Cycle Receipt
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
 * 5. Work Days Milestone Celebration
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

  const emailSubject = `Milestone Reached: ${data.milestoneTitle} | CrestFlow`;
  const text = `${data.name ? `Hi ${data.name},` : 'Hello,'}\n\nCongratulations on reaching a major career milestone: ${data.milestoneTitle} (${data.daysWorked} days worked, ${data.durationFormatted}).\n\nYour dedication and consistent client delivery continue to build a lasting independent business.\n\nKeep building,\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>Milestone Reached</h1>
     <p>${greeting}</p>
     <p>Congratulations on reaching an inspiring milestone in your freelancing journey:</p>
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
 * 6. Client Payment Due Today Notifier
 */
export function renderPaymentDueTodayTemplate(data: {
  freelancerName?: string;
  clientName: string;
  amountDueFormatted: string;
  paymentBasis?: string;
  dueDateFormatted: string;
  invoiceId?: string;
  workspaceUrl?: string;
}): EmailTemplateRenderResult {
  const greeting = data.freelancerName ? `Hi ${escapeHtml(data.freelancerName)},` : 'Hello,';
  const client = escapeHtml(data.clientName);
  const amount = escapeHtml(data.amountDueFormatted);
  const basis = escapeHtml(data.paymentBasis || 'Monthly Retainer');
  const dueDate = escapeHtml(data.dueDateFormatted);
  const inv = data.invoiceId ? escapeHtml(data.invoiceId) : 'Scheduled Cycle';
  const url = escapeHtml(data.workspaceUrl || 'https://crestflow.app/invoices');

  const emailSubject = `Payment Due Today: ${data.clientName} (${data.amountDueFormatted})`;
  const text = `${data.freelancerName ? `Hi ${data.freelancerName},` : 'Hello,'}\n\nThis is an automated notification that your client ${data.clientName} has a payment due today (${data.dueDateFormatted}).\n\nPayment Details:\n- Client: ${data.clientName}\n- Amount Due: ${data.amountDueFormatted}\n- Billing Basis: ${data.paymentBasis || 'Monthly Retainer'}\n- Due Date: ${data.dueDateFormatted}\n- Reference: ${data.invoiceId || 'Scheduled Cycle'}\n\nYou can review this invoice or send a friendly reminder directly from your CrestFlow workspace: ${data.workspaceUrl || 'https://crestflow.app/invoices'}\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    emailSubject,
    `<h1>Payment Due Today</h1>
     <p>${greeting}</p>
     <p>This is a reminder that <strong>${client}</strong> has a payment due today (${dueDate}).</p>
     <table class="table-wrap">
       <tr><td class="label">Client</td><td><strong>${client}</strong></td></tr>
       <tr><td class="label">Amount Due</td><td><strong>${amount}</strong></td></tr>
       <tr><td class="label">Billing Basis</td><td>${basis}</td></tr>
       <tr><td class="label">Due Date</td><td>${dueDate}</td></tr>
       <tr><td class="label">Reference</td><td><code>${inv}</code></td></tr>
     </table>
     <p>You can follow up with your client or share their UPI invoice QR code directly from your dashboard.</p>
     <p><a href="${url}" class="btn">View Invoice in CrestFlow</a></p>`
  );

  return { subject: emailSubject, html, text };
}

/**
 * 7. New Client Onboarding Request
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
 * 8. Scheduled Reminder / Administrative Notice
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
    case 'contact_auto_reply':
      return renderContactAutoReplyTemplate(data);
    case 'welcome_freelancer':
      return renderWelcomeFreelancerTemplate(data);
    case 'payment_charged':
      return renderPaymentChargedTemplate(data);
    case 'work_milestone':
      return renderWorkMilestoneTemplate(data);
    case 'payment_due_today':
      return renderPaymentDueTodayTemplate(data);
    case 'new_client_request':
      return renderNewClientRequestTemplate(data);
    case 'scheduled_reminder':
      return renderScheduledReminderTemplate(data);
    default:
      throw new Error(`Unsupported email event type: ${eventType}`);
  }
}
