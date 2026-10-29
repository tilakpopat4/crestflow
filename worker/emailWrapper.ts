/**
 * CrestFlow Email HTML Wrapper and Core Template Types
 * Conforms strictly to GEMINI.md: zero emojis, restrained palette, neutral borders.
 */

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
