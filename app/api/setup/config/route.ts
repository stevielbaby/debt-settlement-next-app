import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { encryptToken, decryptToken } from '@/app/lib/google-utils';
import crypto from 'crypto';

function encryptTokenWithKey(token: string, key: string): string {
  const cipher = crypto.createCipher('aes192', key);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export async function GET() {
  try {
    const masterKey = process.env.ENCRYPTION_KEY || 'default-master-key-change-in-production';

    // Try to get config from database
    let result: any[] = [];
    try {
      result = await sql`
        SELECT * FROM setup_config WHERE tenant_id = 'default'
      `;
    } catch (err: any) {
      // Table might not exist yet
      console.log('setup_config table not found, using env vars');
      result = [];
    }

    if (result && result.length > 0) {
      const config = result[0] as any;
      const clientId = decryptToken(config.client_id_encrypted, masterKey);
      const clientSecret = decryptToken(config.client_secret_encrypted, masterKey);
      const encryptionKey = decryptToken(config.encryption_key_encrypted, masterKey);

      return NextResponse.json({
        source: 'database',
        clientId: clientId,
        clientSecret: clientSecret,
        encryptionKey: encryptionKey,
        hasConfig: !!(clientId && clientSecret && encryptionKey)
      });
    }

    // Fall back to environment variables
    const envClientId = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const envEncryptionKey = process.env.ENCRYPTION_KEY;

    return NextResponse.json({
      source: 'environment',
      clientId: envClientId,
      clientSecret: envClientSecret,
      encryptionKey: envEncryptionKey,
      hasConfig: !!(envClientId && envClientSecret && envEncryptionKey)
    });
  } catch (err: any) {
    console.error('Error getting setup config:', err);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret, encryptionKey, adminPassword } = await request.json();

    if (!clientId || !clientSecret || !encryptionKey || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (encryptionKey.length < 32) {
      return NextResponse.json(
        { error: 'Encryption key must be at least 32 characters' },
        { status: 400 }
      );
    }

    // Create setup_config table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS setup_config (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL UNIQUE,
        client_id_encrypted TEXT NOT NULL,
        client_secret_encrypted TEXT NOT NULL,
        encryption_key_encrypted TEXT NOT NULL,
        admin_password_encrypted TEXT NOT NULL,
        redirect_uri_encrypted TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Use a master encryption key for storing the setup config
    const masterKey = process.env.ENCRYPTION_KEY || 'default-master-key-change-in-production';

    const encryptedClientId = encryptTokenWithKey(clientId, masterKey);
    const encryptedClientSecret = encryptTokenWithKey(clientSecret, masterKey);
    const encryptedEncryptionKey = encryptTokenWithKey(encryptionKey, masterKey);
    const encryptedAdminPassword = encryptTokenWithKey(adminPassword, masterKey);

    // Get redirect URI from request origin
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    const encryptedRedirectUri = encryptTokenWithKey(redirectUri, masterKey);

    // Save to database
    const result = await sql`
      INSERT INTO setup_config (tenant_id, client_id_encrypted, client_secret_encrypted, encryption_key_encrypted, admin_password_encrypted, redirect_uri_encrypted)
      VALUES ('default', ${encryptedClientId}, ${encryptedClientSecret}, ${encryptedEncryptionKey}, ${encryptedAdminPassword}, ${encryptedRedirectUri})
      ON CONFLICT (tenant_id) DO UPDATE 
      SET 
        client_id_encrypted = EXCLUDED.client_id_encrypted,
        client_secret_encrypted = EXCLUDED.client_secret_encrypted,
        encryption_key_encrypted = EXCLUDED.encryption_key_encrypted,
        admin_password_encrypted = EXCLUDED.admin_password_encrypted,
        redirect_uri_encrypted = EXCLUDED.redirect_uri_encrypted,
        updated_at = NOW()
      RETURNING id, tenant_id, created_at
    `;

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      configId: result[0].id
    });
  } catch (err: any) {
    console.error('Error saving setup config:', err);
    return NextResponse.json(
      { error: 'Failed to save configuration', details: err.message },
      { status: 500 }
    );
  }
}

