import { Env } from './types';
import {
  jsonResponse,
  resolveCorsOrigin,
  getBearerToken,
  handleCreateSubscription,
  handleGetMe,
  handleCancelSubscription,
  handleChangePlan,
  handleVerifyPayment,
} from './routes/subscription';
import { handleCreateOrder } from './routes/order';
import { handleActivateTrial } from './routes/trial';
import { handleRazorpayWebhook } from './routes/webhook';
import { handleCronReconciliation } from './reconcile';
import { constantTimeCompare } from './razorpay';
import {
  handleNotifyContact,
  handleNotifyWelcome,
  handleNotifyNewClientRequest,
  handleNotifyMilestone,
  handleNotifyPaymentDueToday,
  handleScheduleEmail,
  handleCancelEmail,
  handleProcessEmailQueue,
  handleNotifyTestEmail,
} from './routes/notifications';
import { handleAdminGrantSubscription, handleAdminRevokeSubscription } from './routes/adminSubscriptions';
import { handleGetAdminEmailHistory, handleRetryAdminEmail } from './routes/adminEmailHistory';
import { handleAdminSendCampaign } from './routes/adminCampaignRoutes';
import { handleGetGmailConfig, handleSaveGmailConfig, handleClearAdminEmailHistory } from './routes/adminGmailRoutes';
import { handleSeoRoutes } from './routes/seo';
import { processDueEmailJobs } from './emailDispatcher';
import { handleStaticAsset } from './staticHandler';
import { handleCreateClient, handleCreateInvoice } from './routes/limits';
import { handleAdminSettings, handleGetPricingConfig, handleGetHeroConfig, handleGetFooterConfig } from './routes/adminSettings';
import { handleGetPublicProfile } from './routes/publicProfile';
import { handleDeleteAccount } from './routes/account';
import { handleDriveRoutes } from './routes/drive';
import {
  handleCreateInvoiceShare,
  handleRevokeInvoiceShare,
  handleGetPublicInvoice,
  handleClaimPublicInvoicePaid,
} from './routes/publicInvoice';
import {
  handlePublishPortal,
  handleAuthorizeAiAction,
  handleAuthorizeInvoiceSend,
} from './routes/entitlementActions';
import {
  handleLandingMediaUpload,
  handleGetLandingVideo,
  handleGetLandingPoster,
  handleDeleteLandingMedia,
} from './routes/landingMedia';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': resolveCorsOrigin(request, env),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-razorpay-signature',
          'Vary': 'Origin',
        },
      });
    }

    if (url.pathname === '/google8efa91a9e5ebef0d.html') {
      return new Response('google-site-verification: google8efa91a9e5ebef0d.html', {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const baseUrl = env.BASE_URL || url.origin;
    const seoResponse = handleSeoRoutes(url, baseUrl);
    if (seoResponse) return seoResponse;

    if (!url.pathname.startsWith('/api/')) {
      return await handleStaticAsset(request, env);
    }

    try {
      // Billing, Trial & Entitlement Endpoints
      if (url.pathname === '/api/create-subscription' && request.method === 'POST') {
        return await handleCreateSubscription(request, env);
      }
      if (url.pathname === '/api/create-order' && request.method === 'POST') {
        return await handleCreateOrder(request, env);
      }
      if (url.pathname === '/api/verify-payment' && request.method === 'POST') {
        return await handleVerifyPayment(request, env);
      }
      if (url.pathname === '/api/activate-trial' && request.method === 'POST') {
        return await handleActivateTrial(request, env);
      }
      if (url.pathname === '/api/me' && request.method === 'GET') {
        return await handleGetMe(request, env);
      }
      if (url.pathname === '/api/cancel-subscription' && request.method === 'POST') {
        return await handleCancelSubscription(request, env);
      }
      if (url.pathname === '/api/change-plan' && request.method === 'POST') {
        return await handleChangePlan(request, env);
      }
      if (url.pathname === '/api/razorpay-webhook' && request.method === 'POST') {
        return await handleRazorpayWebhook(request, env);
      }

      // Public Token-Scoped Invoice & Public Profile Endpoints
      if (url.pathname === '/api/invoices/share' && request.method === 'POST') {
        return await handleCreateInvoiceShare(request, env);
      }
      if (url.pathname === '/api/invoices/revoke' && request.method === 'POST') {
        return await handleRevokeInvoiceShare(request, env);
      }
      if (url.pathname === '/api/public-invoice' && request.method === 'GET') {
        return await handleGetPublicInvoice(request, env);
      }
      if (url.pathname === '/api/public-invoice/claim-paid' && request.method === 'POST') {
        return await handleClaimPublicInvoicePaid(request, env);
      }
      if (url.pathname === '/api/public-profile' && request.method === 'GET') {
        return await handleGetPublicProfile(request, env);
      }

      // Server-Enforced Entitlement Gates for Portal, AI Summarizer, Invoice Send
      if (url.pathname === '/api/portal/publish' && request.method === 'POST') {
        return await handlePublishPortal(request, env);
      }
      if (url.pathname === '/api/ai/authorize' && request.method === 'POST') {
        return await handleAuthorizeAiAction(request, env);
      }
      if (url.pathname === '/api/invoices/authorize-send' && request.method === 'POST') {
        return await handleAuthorizeInvoiceSend(request, env);
      }
      if (url.pathname === '/api/create-client' && request.method === 'POST') {
        return await handleCreateClient(request, env);
      }
      if (url.pathname === '/api/create-invoice' && request.method === 'POST') {
        return await handleCreateInvoice(request, env);
      }

      // Admin Endpoints
      if (url.pathname === '/api/admin/grant-subscription' && request.method === 'POST') {
        return await handleAdminGrantSubscription(request, env);
      }
      if (url.pathname === '/api/admin/revoke-subscription' && request.method === 'POST') {
        return await handleAdminRevokeSubscription(request, env);
      }
      if (
        (url.pathname === '/api/reconcile-cron' || url.pathname === '/api/admin/reconcile') &&
        request.method === 'POST'
      ) {
        const authHeaderToken = getBearerToken(request);
        const customHeaderSecret = request.headers.get('x-cron-secret');
        const providedSecret = customHeaderSecret || authHeaderToken || '';
        const expectedSecret = env.CRON_SECRET || '';
        if (!expectedSecret || !providedSecret || !constantTimeCompare(providedSecret, expectedSecret)) {
          return jsonResponse({ error: 'Unauthorized' }, 401, request, env);
        }
        const stats = await handleCronReconciliation(env);
        return jsonResponse({ success: true, stats }, 200, request, env);
      }

      // Notification & Reminder Endpoints
      if (url.pathname === '/api/notify/contact' && request.method === 'POST') {
        return await handleNotifyContact(request, env);
      }
      if (url.pathname === '/api/notify/welcome' && request.method === 'POST') {
        return await handleNotifyWelcome(request, env);
      }
      if (url.pathname === '/api/notify/test-email' && request.method === 'POST') {
        return await handleNotifyTestEmail(request, env);
      }
      if (url.pathname === '/api/notify/new-client-request' && request.method === 'POST') {
        return await handleNotifyNewClientRequest(request, env);
      }
      if (url.pathname === '/api/notify/milestone' && request.method === 'POST') {
        return await handleNotifyMilestone(request, env);
      }
      if (url.pathname === '/api/notify/payment-due-today' && request.method === 'POST') {
        return await handleNotifyPaymentDueToday(request, env);
      }
      if (url.pathname === '/api/email/schedule' && request.method === 'POST') {
        return await handleScheduleEmail(request, env);
      }
      if (url.pathname === '/api/email/cancel' && request.method === 'POST') {
        return await handleCancelEmail(request, env);
      }
      if (url.pathname === '/api/email/process-queue' && request.method === 'POST') {
        return await handleProcessEmailQueue(request, env);
      }

      // Admin Email & Settings Routes
      if (url.pathname === '/api/admin/email-history' && request.method === 'GET') {
        return await handleGetAdminEmailHistory(request, env);
      }
      if (url.pathname === '/api/admin/email-retry' && request.method === 'POST') {
        return await handleRetryAdminEmail(request, env);
      }
      if (url.pathname === '/api/admin/send-campaign' && request.method === 'POST') {
        return await handleAdminSendCampaign(request, env);
      }
      if (url.pathname === '/api/admin/gmail/config' && request.method === 'GET') {
        return await handleGetGmailConfig(request, env);
      }
      if (url.pathname === '/api/admin/gmail/config' && request.method === 'POST') {
        return await handleSaveGmailConfig(request, env);
      }
      if (url.pathname === '/api/admin/clear-email-history' && request.method === 'POST') {
        return await handleClearAdminEmailHistory(request, env);
      }
      if (url.pathname === '/api/admin/settings' && request.method === 'POST') {
        return await handleAdminSettings(request, env);
      }
      if (url.pathname === '/api/pricing-config' && request.method === 'GET') {
        return await handleGetPricingConfig(env);
      }
      if (url.pathname === '/api/hero-config' && request.method === 'GET') {
        return await handleGetHeroConfig(env);
      }
      if (url.pathname === '/api/footer-config' && request.method === 'GET') {
        return await handleGetFooterConfig(env);
      }

      if (url.pathname === '/api/delete-account' && request.method === 'POST') {
        return await handleDeleteAccount(request, env);
      }

      if (url.pathname.startsWith('/api/drive/')) {
        const driveRes = await handleDriveRoutes(request, url, env);
        if (driveRes) return driveRes;
      }

      if (url.pathname === '/api/admin/landing-media/upload' && request.method === 'POST') {
        return await handleLandingMediaUpload(request, env);
      }
      if (url.pathname === '/api/media/landing-video' && (request.method === 'GET' || request.method === 'OPTIONS')) {
        return await handleGetLandingVideo(request, env);
      }
      if (url.pathname === '/api/media/landing-poster' && (request.method === 'GET' || request.method === 'OPTIONS')) {
        return await handleGetLandingPoster(request, env);
      }
      if (url.pathname === '/api/admin/landing-media' && request.method === 'DELETE') {
        return await handleDeleteLandingMedia(request, env);
      }

      return jsonResponse({ error: 'Endpoint not found' }, 404, request, env);
    } catch (err: any) {
      console.error('[Worker API Error]', err?.message || err);
      return jsonResponse({ error: 'Internal Server Error' }, 500, request, env);
    }
  },

  async scheduled(controller: any, env: Env, ctx: any): Promise<void> {
    const runCron = async () => {
      await handleCronReconciliation(env);
      await processDueEmailJobs(env, 10);
    };
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(runCron());
    } else {
      await runCron();
    }
  },
};
