export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch timestamp in milliseconds
  scope?: string;
  tokenType?: string;
}
