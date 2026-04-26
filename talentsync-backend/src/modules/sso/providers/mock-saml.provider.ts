/**
 * Mock SAML Provider
 * Stub implementation for SAML 2.0 SSO - no real SAML parsing
 */

export interface SAMLUserClaims {
  email: string;
  firstName: string;
  lastName: string;
  nameId?: string;
}

export class MockSAMLProvider {
  /**
   * Generate mock SAML redirect URL
   * In production, this would construct a real SAML AuthnRequest
   */
  static generateAuthRequest(config: {
    samlSsoUrl?: string;
    samlEntityId?: string;
    samlAcsUrl?: string;
  }): string {
    // Return mock URL - no real SAML request generated
    const mockUrl = new URL(
      config.samlSsoUrl || 'https://mock-idp.example.com/sso',
    );
    mockUrl.searchParams.set('SAMLRequest', 'MOCK_SAML_REQUEST_BASE64');
    mockUrl.searchParams.set('RelayState', 'mock-relay-state');
    return mockUrl.toString();
  }

  /**
   * Parse SAML Response (mock)
   * In production, this would decode and validate real SAML XML
   */
  static parseSAMLResponse(samlResponse: string): SAMLUserClaims {
    // Always return mock user claims
    console.log(
      '[MOCK SAML] Parsing response (stub):',
      samlResponse?.substring(0, 50),
    );

    return {
      email: 'user@acme-corp.com',
      firstName: 'John',
      lastName: 'Doe',
      nameId: 'mock-name-id-12345',
    };
  }

  /**
   * Validate SAML Assertion (mock)
   * In production, this would verify signatures and conditions
   */
  static validateSAMLAssertion(
    assertion: string,
    certificate?: string,
  ): { valid: boolean; error?: string } {
    console.log(
      '[MOCK SAML] Validating assertion (stub) - always returns valid',
    );

    // Always return valid in mock mode
    return { valid: true };
  }

  /**
   * Generate mock logout URL
   */
  static generateLogoutRequest(config: {
    samlLogoutUrl?: string;
    nameId?: string;
  }): string {
    const mockUrl = new URL(
      config.samlLogoutUrl || 'https://mock-idp.example.com/logout',
    );
    mockUrl.searchParams.set('SAMLRequest', 'MOCK_LOGOUT_REQUEST');
    return mockUrl.toString();
  }
}
