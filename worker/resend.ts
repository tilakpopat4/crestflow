import { Env } from './types';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  replyTo?: string;
}

/**
 * Sends a transactional email using the Resend REST API.
 */
export async function sendResendEmail(
  env: Env,
  params: EmailParams
): Promise<{ success: boolean; id?: string; error?: string; statusCode?: number }> {
  if (!env.RESEND_API_KEY) {
    console.warn('[Resend] RESEND_API_KEY is not configured. Skipping email.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const fromEmail = env.RESEND_FROM_EMAIL || 'CrestFlow <billing@crestflow.com>';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  };

  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        reply_to: params.replyTo || 'support.crestflow@gmail.com',
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Resend Error] ${res.status}: ${errorText}`);
      return { success: false, error: errorText, statusCode: res.status };
    }

    const data = (await res.json()) as { id: string };
    return { success: true, id: data.id, statusCode: res.status };
  } catch (err: any) {
    console.error('[Resend Network Error]', err);
    return { success: false, error: err.message, statusCode: 599 };
  }
}

/**
 * Common HTML wrapper adhering to CrestFlow's flat, restrained design system.
 */
function wrapEmailHtml(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 24px; line-height: 1.5; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px; }
    .brand { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 24px; letter-spacing: -0.02em; }
    h1 { font-size: 20px; font-weight: 600; color: #0F172A; margin-top: 0; margin-bottom: 16px; }
    p { font-size: 14px; color: #475569; margin: 0 0 16px 0; }
    .btn { display: inline-block; background-color: #4F46E5; color: #FFFFFF !important; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 18px; border-radius: 6px; margin: 8px 0 20px 0; }
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
 * 1. Day 5 of Trial Notification
 */
export async function sendTrialDay5Email(
  env: Env,
  toEmail: string,
  name?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl = env.BASE_URL || 'https://crestflow.app';
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const subject = 'Your CrestFlow Pro trial ends in 2 days';
  const text = `${greeting}\n\nYou have 2 days remaining on your 7-day CrestFlow Pro trial.\n\nAll your client portals, automated 6 AM delivery schedules, and direct UPI payment links will continue uninterrupted. When your trial ends, your selected recurring subscription will seamlessly activate.\n\nIf you need to make any adjustments or cancel before your billing cycle starts, you can manage your subscription directly in your account settings.\n\nManage Subscription: ${baseUrl}/billing\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    subject,
    `<h1>Your Pro trial ends in 2 days</h1>
     <p>${greeting}</p>
     <p>You have <strong>2 days remaining</strong> on your 7-day CrestFlow Pro trial.</p>
     <p>All your client portals, automated 6 AM delivery schedules, and direct UPI payment links will continue uninterrupted. When your trial ends, your selected recurring subscription will seamlessly activate.</p>
     <p>If you need to make adjustments or cancel before your primary billing begins, you can do so anytime in your dashboard:</p>
     <p><a href="${baseUrl}/billing" class="btn">Manage Subscription</a></p>`
  );

  return sendResendEmail(env, { to: toEmail, subject, text, html });
}

/**
 * 2. 24h Before First Charge Notification
 */
export async function sendCharge24hEmail(
  env: Env,
  toEmail: string,
  name?: string,
  planName = 'Pro'
): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl = env.BASE_URL || 'https://crestflow.app';
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const subject = 'Reminder: Your CrestFlow subscription begins tomorrow';
  const text = `${greeting}\n\nThis is a reminder that your 7-day ₹1 trial is ending tomorrow. Your ${planName} subscription will be charged to your payment method automatically in 24 hours.\n\nYou will continue having full access to unlimited clients, unlimited invoices, and automated delivery features.\n\nView or update your subscription at: ${baseUrl}/billing\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    subject,
    `<h1>Your subscription begins tomorrow</h1>
     <p>${greeting}</p>
     <p>This is a reminder that your 7-day &#8377;1 trial is ending tomorrow. Your <strong>${planName}</strong> subscription will be charged to your payment method automatically in 24 hours.</p>
     <p>You will continue to have full access to unlimited clients, unlimited invoices, direct UPI payments, and automated deliveries.</p>
     <p><a href="${baseUrl}/billing" class="btn">View Subscription</a></p>`
  );

  return sendResendEmail(env, { to: toEmail, subject, text, html });
}

/**
 * 3. Charge Failed Notification (Grace Period Active)
 */
export async function sendChargeFailedEmail(
  env: Env,
  toEmail: string,
  name?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl = env.BASE_URL || 'https://crestflow.app';
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const subject = 'Action Required: Payment failed for your CrestFlow subscription';
  const text = `${greeting}\n\nWe were unable to process the recurring payment for your CrestFlow subscription.\n\nA 3-day grace period has been applied to your account. Your write access (creating invoices, updating client delivery dates) remains active for the next 3 days while payment is retried.\n\nPlease update your payment details promptly to avoid your account switching to read-only mode.\n\nUpdate Payment Method: ${baseUrl}/billing\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    subject,
    `<h1>Payment attempt failed</h1>
     <p>${greeting}</p>
     <p>We were unable to process the recurring payment for your CrestFlow subscription.</p>
     <p>A <strong>3-day grace period</strong> has been applied to your account. Your workspace remains fully active while payment is retried.</p>
     <p>Please review and update your payment method to avoid your account switching to read-only mode:</p>
     <p><a href="${baseUrl}/billing" class="btn">Update Payment Method</a></p>`
  );

  return sendResendEmail(env, { to: toEmail, subject, text, html });
}

/**
 * 4. Subscription Expired Notification (Read-Only Mode)
 */
export async function sendExpiredEmail(
  env: Env,
  toEmail: string,
  name?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl = env.BASE_URL || 'https://crestflow.app';
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const subject = 'Your CrestFlow subscription has expired';
  const text = `${greeting}\n\nYour CrestFlow subscription access period has expired, and your account has transitioned into read-only mode.\n\nYou can still log in, review past work, and download or export all existing client and invoice records anytime.\n\nTo restore write access and resume creating new invoices or managing active projects, you can renew your subscription at: ${baseUrl}/billing\n\n— The CrestFlow Team`;

  const html = wrapEmailHtml(
    subject,
    `<h1>Your subscription has expired</h1>
     <p>${greeting}</p>
     <p>Your CrestFlow subscription access period has expired. Your workspace has been placed in <strong>read-only mode</strong>.</p>
     <p>You can still log in, review your dashboard, and download or export all existing client records and invoices at any time.</p>
     <p>To restore write access and resume creating invoices, reactivate your subscription below:</p>
     <p><a href="${baseUrl}/billing" class="btn">Reactivate Subscription</a></p>`
  );

  return sendResendEmail(env, { to: toEmail, subject, text, html });
}
