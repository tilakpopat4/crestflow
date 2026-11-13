import { Env } from './types';
import { ServiceAccountCredentials, getSubscriptionFromFirestore } from './firestore';

export interface GmailConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  senderEmail?: string;
}

export interface DirectEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  senderName?: string;
}

let cachedGmailToken: { token: string; expiresAt: number } | null = null;

/**
 * Encodes a string as RFC 4648 Base64URL without padding.
 */
function toBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Retrieves a fresh Google OAuth2 access token using the stored refresh token.
 */
export async function getGmailAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGmailToken && cachedGmailToken.expiresAt > now + 60) {
    return cachedGmailToken.token;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google OAuth token (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedGmailToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return data.access_token;
}

/**
 * Dispatches an email directly via the official Gmail REST API.
 * The email is delivered by Google's servers and appears in the user's Sent folder.
 */
export async function sendGmailDirect(
  config: GmailConfig,
  params: DirectEmailParams
): Promise<{ success: boolean; id?: string; error?: string; statusCode?: number }> {
  const clientId = config.clientId;
  const clientSecret = config.clientSecret;
  const refreshToken = config.refreshToken;
  const senderEmail = config.senderEmail || 'support.crestflow@gmail.com';
  const senderName = params.senderName || 'CrestFlow';

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      success: false,
      error: 'Direct Gmail is not configured. Missing Client ID, Client Secret, or Refresh Token.',
      statusCode: 400,
    };
  }

  try {
    const accessToken = await getGmailAccessToken(clientId, clientSecret, refreshToken);

    const subjectEncoded = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;
    const mimeLines = [
      `From: "${senderName}" <${senderEmail}>`,
      `To: ${params.to}`,
      `Subject: ${subjectEncoded}`,
      `Reply-To: ${params.replyTo || senderEmail}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      params.html || params.text || '',
    ];

    const rawMime = mimeLines.join('\r\n');
    const rawBase64 = toBase64Url(rawMime);

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawBase64 }),
    });

    if (!gmailRes.ok) {
      const errText = await gmailRes.text();
      return {
        success: false,
        error: `Gmail API ${gmailRes.status}: ${errText}`,
        statusCode: gmailRes.status,
      };
    }

    const sendData = (await gmailRes.json()) as { id: string; threadId?: string };
    return {
      success: true,
      id: sendData.id || `gmail_${Date.now()}`,
      statusCode: 200,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Direct Gmail dispatch error',
      statusCode: 500,
    };
  }
}

