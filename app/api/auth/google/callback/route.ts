import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { encryptToken, exchangeCodeForTokens, getUserInfo, decryptToken } from '@/app/lib/google-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      // Redirect to calendar settings with error
      const errorUrl = new URL(request.nextUrl.origin);
      errorUrl.pathname = '/admin/calendar-settings';
      errorUrl.searchParams.set('error', 'missing_code');
      return NextResponse.redirect(errorUrl);
    }

    // Get credentials from database or env
    const masterKey = process.env.ENCRYPTION_KEY || 'default-master-key-change-in-production';
    let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    let GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    let GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`;

    try {
      const result = await sql`
        SELECT * FROM setup_config WHERE tenant_id = 'default'
      `;

      if (result.length > 0) {
        const config = result[0] as any;
        const decryptedClientId = decryptToken(config.client_id_encrypted, masterKey);
        const decryptedClientSecret = decryptToken(config.client_secret_encrypted, masterKey);
        const decryptedRedirectUri = config.redirect_uri_encrypted
          ? decryptToken(config.redirect_uri_encrypted, masterKey)
          : null;
        
        if (decryptedClientId) GOOGLE_CLIENT_ID = decryptedClientId;
        if (decryptedClientSecret) GOOGLE_CLIENT_SECRET = decryptedClientSecret;
        if (decryptedRedirectUri) GOOGLE_REDIRECT_URI = decryptedRedirectUri;
      }
    } catch (err: any) {
      console.log('Database lookup failed, using env vars:', err.message);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      // Redirect to calendar settings with error
      const errorUrl = new URL(request.nextUrl.origin);
      errorUrl.pathname = '/admin/calendar-settings';
      errorUrl.searchParams.set('error', 'credentials_not_configured');
      return NextResponse.redirect(errorUrl);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    const userInfo = await getUserInfo(tokens.access_token);

    // Store the connection in database
    const encryptedRefresh = encryptToken(tokens.refresh_token);
    const encryptedAccess = encryptToken(tokens.access_token);

    // Calculate expiration time (subtract 300 seconds for safety margin)
    const expiresInSeconds = tokens.expires_in - 300;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const result = await sql`
      INSERT INTO google_connections (tenant_id, account_email, refresh_token_encrypted, access_token_encrypted, scopes, expires_at)
      VALUES ('default', ${userInfo.email}, ${encryptedRefresh}, ${encryptedAccess}, 'calendar', ${expiresAt})
      ON CONFLICT (tenant_id) DO UPDATE 
      SET account_email = EXCLUDED.account_email, 
          refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
          access_token_encrypted = EXCLUDED.access_token_encrypted,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      RETURNING id, account_email
    `;

    // Redirect to admin settings with success message
    const successUrl = new URL(request.nextUrl.origin);
    successUrl.pathname = '/admin/calendar-settings';
    successUrl.searchParams.set('status', 'connected');

    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    
    // Redirect to calendar settings with error message
    const errorUrl = new URL(request.nextUrl.origin);
    errorUrl.pathname = '/admin/calendar-settings';
    
    // Provide specific error codes
    if (error.message?.includes('Token exchange failed')) {
      errorUrl.searchParams.set('error', 'token_exchange_failed');
    } else if (error.message?.includes('Failed to get user info')) {
      errorUrl.searchParams.set('error', 'user_info_failed');
    } else if (error.message?.includes('credentials not configured')) {
      errorUrl.searchParams.set('error', 'credentials_not_configured');
    } else {
      errorUrl.searchParams.set('error', 'oauth_failed');
    }
    
    return NextResponse.redirect(errorUrl);
  }
}

