import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { decryptToken } from '@/app/lib/google-utils';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email'
];

export async function GET(request: NextRequest) {
  try {
    // Try to get config from database first
    const masterKey = process.env.ENCRYPTION_KEY || 'default-master-key-change-in-production';
    let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    let GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`;

    // Check for client ID in headers (for testing from setup wizard)
    const headerClientId = request.headers.get('X-Google-Client-Id');
    if (headerClientId) {
      GOOGLE_CLIENT_ID = headerClientId;
    }

    try {
      const result = await sql`
        SELECT * FROM setup_config WHERE tenant_id = 'default'
      `;

      if (result.length > 0) {
        const config = result[0] as any;
        const decryptedClientId = decryptToken(config.client_id_encrypted, masterKey);
        const decryptedRedirectUri = config.redirect_uri_encrypted
          ? decryptToken(config.redirect_uri_encrypted, masterKey)
          : null;
        
        if (decryptedClientId) {
          GOOGLE_CLIENT_ID = decryptedClientId;
        }

        if (decryptedRedirectUri) {
          GOOGLE_REDIRECT_URI = decryptedRedirectUri;
        }
      }
    } catch (err: any) {
      console.log('Database lookup failed, using env vars:', err.message);
    }

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google Client ID not configured. Please complete setup wizard.' },
        { status: 500 }
      );
    }

    // Generate a simple state token for CSRF protection
    const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Redirect to Google OAuth (Next.js uses 307 by default, which is fine for OAuth)
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    console.error('OAuth start error:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow', message: error.message },
      { status: 500 }
    );
  }
}

