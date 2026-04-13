import api from './api';

export type OAuthProvider = 'Microsoft' | 'Google' | 'Facebook';

export type OAuthTokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

class OAuthService {
  private async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return { codeVerifier, codeChallenge };
  }

  async exchangeCodeForTokens(code: string, provider: OAuthProvider, state: string): Promise<OAuthTokenResponse> {
    const redirectUri = window.location.origin + '/auth/callback';

    const payload: Record<string, string> = {
      code,
      provider,
      redirectUri,
    };

    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
    if (codeVerifier) {
      payload.codeVerifier = codeVerifier;
      sessionStorage.removeItem('oauth_code_verifier');
    }

    const response = await api.post('/auth/exchange-code', payload);
    return response.data;
  }

  async initiateGoogleLogin() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('openid profile email');
    const nonce = Math.random().toString(36).substring(7);
    const state = `Google_${nonce}`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  }

  async initiateMicrosoftLogin() {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    if (!clientId) throw new Error('VITE_MICROSOFT_CLIENT_ID is not configured');

    const { codeVerifier, codeChallenge } = await this.generatePKCE();
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);

    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('openid profile email');
    const nonce = Math.random().toString(36).substring(7);
    const state = `Microsoft_${nonce}`;

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256&` +
      `prompt=select_account`;

    window.location.href = authUrl;
  }

  clearOAuthData(): void {
    // No client-side storage to clear
  }
}

export default new OAuthService();
