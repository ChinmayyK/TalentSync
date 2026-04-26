/**
 * Real Microsoft OAuth / Azure AD Provider
 * Implements OAuth2 flow with Microsoft's APIs
 */

export interface MicrosoftUserInfo {
  email: string;
  displayName: string;
  id: string; // Microsoft user ID
  userPrincipalName?: string;
  mail?: string;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

const MS_AUTH_URL_TEMPLATE =
  'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize';
const MS_TOKEN_URL_TEMPLATE =
  'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token';
const MS_GRAPH_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me';

export class MicrosoftProvider {
  /**
   * Generate Microsoft OAuth authorization URL
   * Redirects user to login.microsoftonline.com
   */
  static generateAuthUrl(config: {
    clientId?: string;
    redirectUri?: string;
    scopes?: string[];
    state?: string;
    tenantId?: string; // Azure AD tenant (can be 'common', 'organizations', or specific tenant ID)
  }): string {
    if (!config.clientId) {
      throw new Error('Microsoft OAuth requires clientId');
    }
    if (!config.redirectUri) {
      throw new Error('Microsoft OAuth requires redirectUri');
    }

    const tenant = config.tenantId || 'common';
    const authUrl = MS_AUTH_URL_TEMPLATE.replace('{tenant}', tenant);

    const url = new URL(authUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'scope',
      (
        config.scopes || [
          'openid',
          'email',
          'profile',
          'User.Read',
          'offline_access',
        ]
      ).join(' '),
    );
    url.searchParams.set('response_mode', 'query');

    if (config.state) {
      url.searchParams.set('state', config.state);
    }

    return url.toString();
  }

  /**
   * Exchange authorization code for tokens
   * Calls Microsoft's token endpoint
   */
  static async exchangeCodeForToken(
    code: string,
    config: {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      tenantId?: string;
    },
  ): Promise<MicrosoftTokenResponse> {
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new Error(
        'Microsoft OAuth requires clientId, clientSecret, and redirectUri',
      );
    }

    const tenant = config.tenantId || 'common';
    const tokenUrl = MS_TOKEN_URL_TEMPLATE.replace('{tenant}', tenant);

    console.log('[MICROSOFT] Exchanging code for token...');

    const response = await fetch(tokenUrl, {
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
      console.error('[MICROSOFT] Token exchange failed:', error);
      throw new Error(`Microsoft token exchange failed: ${error}`);
    }

    const data = await response.json();
    console.log('[MICROSOFT] Token exchange successful');

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      id_token: data.id_token,
    };
  }

  /**
   * Fetch user info from Microsoft Graph
   * Calls graph.microsoft.com/v1.0/me
   */
  static async fetchUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    console.log('[MICROSOFT] Fetching user info from Graph API...');

    const response = await fetch(MS_GRAPH_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MICROSOFT] Graph API call failed:', error);
      throw new Error(`Failed to fetch Microsoft user info: ${error}`);
    }

    const data = await response.json();
    console.log(
      '[MICROSOFT] User info fetched:',
      data.mail || data.userPrincipalName,
    );

    return {
      email: data.mail || data.userPrincipalName,
      displayName: data.displayName,
      id: data.id,
      userPrincipalName: data.userPrincipalName,
      mail: data.mail,
    };
  }

  /**
   * Validate Microsoft token by fetching user info
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

// Export as MockMicrosoftProvider for backward compatibility
export const MockMicrosoftProvider = MicrosoftProvider;
