import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-insecure-key-change-in-production';

export function decryptToken(encrypted: string, key?: string): string {
  try {
    const decipher = crypto.createDecipher('aes192', key || ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    throw new Error('Failed to decrypt token');
  }
}

export function encryptToken(token: string, key?: string): string {
  const cipher = crypto.createCipher('aes192', key || ENCRYPTION_KEY);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export async function refreshAccessToken(refreshToken: string, clientId?: string, clientSecret?: string): Promise<string> {
  const GOOGLE_CLIENT_ID = clientId || process.env.GOOGLE_CLIENT_ID || '';
  const GOOGLE_CLIENT_SECRET = clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

