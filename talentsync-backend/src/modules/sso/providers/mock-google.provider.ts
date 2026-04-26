/**
 * Real Google OAuth Provider
 * Implements OAuth2 flow with Google's APIs
 */

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub: string; // Google user ID
  email_verified?: boolean;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export class GoogleProvider {
  /**
   * Generate Google OAuth authorization URL
   * Redirects user to accounts.google.com for authentication
   */
  static generateAuthUrl(config: {
    clientId?: string;
    redirectUri?: string;
    scopes?: string[];
    state?: string;
  }): string {
    if (!config.clientId) {
      throw new Error('Google OAuth requires clientId');
    }
    if (!config.redirectUri) {
      throw new Error('Google OAuth requires redirectUri');
    }

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'scope',
      (config.scopes || ['openid', 'email', 'profile']).join(' '),
    );
    url.searchParams.set('access_type', 'offline'); // Get refresh token
    url.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

    if (config.state) {
      url.searchParams.set('state', config.state);
    }

    return url.toString();
  }

  /**
   * Exchange authorization code for tokens
   * Calls Google's token endpoint
   */
  static async exchangeCodeForToken(
    code: string,
    config: { clientId?: string; clientSecret?: string; redirectUri?: string },
  ): Promise<GoogleTokenResponse> {
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new Error(
        'Google OAuth requires clientId, clientSecret, and redirectUri',
      );
    }

    console.log('[GOOGLE] Exchanging code for token...');

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GOOGLE] Token exchange failed:', error);
      throw new Error(`Google token exchange failed: ${error}`);
    }

    const data = await response.json();
    console.log('[GOOGLE] Token exchange successful');

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      id_token: data.id_token,
    };
  }

  /**
   * Fetch user info from Google
   * Calls Google's userinfo endpoint
   */
  static async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    console.log('[GOOGLE] Fetching user info...');

    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GOOGLE] Userinfo fetch failed:', error);
      throw new Error(`Failed to fetch Google user info: ${error}`);
    }

    const data = await response.json();
    console.log('[GOOGLE] User info fetched:', data.email);

    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
      sub: data.id,
      email_verified: data.verified_email,
    };
  }

  /**
   * Validate Google token by fetching user info
   */
  static async validateToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string }> {
    try {
      const userInfo = await this.fetchUserInfo(token);
      return { valid: true, email: userInfo.email };
    } catch {
      return { valid: false };
    }
  }
}

// Export as MockGoogleProvider for backward compatibility
export const MockGoogleProvider = GoogleProvider;
