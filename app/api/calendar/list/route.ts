import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { decryptToken, refreshAccessToken, encryptToken } from '@/app/lib/crypto-utils';
import { listCalendars, decryptToken as decryptTokenWithKey } from '@/app/lib/google-utils';

export async function GET() {
  try {
    // Get stored connection
    const connections = await sql`
      SELECT * FROM google_connections WHERE tenant_id = 'default'
    `;

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'No Google connection found. Please connect first.' },
        { status: 404 }
      );
    }

    const connection = connections[0] as any;
    const decryptedRefresh = decryptToken(connection.refresh_token_encrypted);
    const currentAccessToken = decryptToken(connection.access_token_encrypted);

    if (!decryptedRefresh || !currentAccessToken) {
      return NextResponse.json(
        { error: 'Failed to decrypt tokens' },
        { status: 500 }
      );
    }

    // Get Google credentials from database or env for token refresh
    const masterKey = process.env.ENCRYPTION_KEY || 'default-master-key-change-in-production';
    let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    let GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    try {
      const configResult = await sql`
        SELECT * FROM setup_config WHERE tenant_id = 'default'
      `;
      if (configResult.length > 0) {
        const config = configResult[0] as any;
        const decryptedClientId = decryptTokenWithKey(config.client_id_encrypted, masterKey);
        const decryptedClientSecret = decryptTokenWithKey(config.client_secret_encrypted, masterKey);
        if (decryptedClientId) GOOGLE_CLIENT_ID = decryptedClientId;
        if (decryptedClientSecret) GOOGLE_CLIENT_SECRET = decryptedClientSecret;
      }
    } catch (err: any) {
      console.log('Database lookup failed, using env vars:', err.message);
    }

    // Check if token is expired and refresh if needed
    let accessToken = currentAccessToken;
    if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
      accessToken = await refreshAccessToken(decryptedRefresh, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      const encryptedAccess = encryptToken(accessToken);
      
      await sql`
        UPDATE google_connections 
        SET access_token_encrypted = ${encryptedAccess}, expires_at = NOW() + INTERVAL '3600 seconds'
        WHERE tenant_id = 'default'
      `;
    }

    // List calendars
    const calendars = await listCalendars(accessToken);

    return NextResponse.json({
      success: true,
      accountEmail: connection.account_email,
      calendars: calendars.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary || false
      }))
    });

  } catch (error: any) {
    console.error('List calendars error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list calendars',
        message: error.message
      },
      { status: 500 }
    );
  }
}

