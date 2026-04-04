import api from './api';

export type LoginDto = {
  email: string;
  password: string;
}

export type RegisterDto = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type TokenDto = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export type AuthResponse = {
  message: string;
  token: TokenDto;
}

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export type ExternalAuthDto = {
  provider: string;
  idToken: string;
}

// Two-Factor Authentication Types
export type TwoFactorSetupDto = {
  sharedKey: string;
  authenticatorUri: string;
  qrCodeBase64: string;
  recoveryCodes: string[];
}

export type Enable2FADto = {
  code: string;
}

export type Disable2FADto = {
  password: string;
}

export type TwoFactorLoginDto = {
  email: string;
  code: string;
  rememberDevice?: boolean;
}

export type RecoveryCodesDto = {
  recoveryCodes: string[];
  remainingCodes: number;
}

export type TwoFactorSetupResponse = {
  message: string;
  setup: TwoFactorSetupDto;
}

export type TwoFactorStatusResponse = {
  twoFactorEnabled: boolean;
}

class AuthService {
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    this.saveTokens(response.data.token);
    return response.data;
  }

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    this.saveTokens(response.data.token);
    return response.data;
  }

  // Removed registerCompany - now using unified register method

  async refreshToken(refreshToken: string): Promise<TokenDto> {
    const response = await api.post<AuthResponse>('/auth/refresh-token', { refreshToken });
    this.saveTokens(response.data.token);
    return response.data.token;
  }

  async externalLogin(data: ExternalAuthDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/external-login', data);
    this.saveTokens(response.data.token);
    return response.data;
  }

  async confirmEmail(userId: string, token: string): Promise<{ message: string }> {
    const response = await api.get<{ message: string }>('/auth/confirm-email', {
      params: { userId, token }
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/revoke-token');
    } catch (error) {
      console.error('Failed to revoke token:', error);
    } finally {
      this.clearTokens();
    }
  }

  private saveTokens(token: TokenDto): void {
    localStorage.setItem('accessToken', token.accessToken);
    localStorage.setItem('refreshToken', token.refreshToken);
    localStorage.setItem('tokenExpiry', token.expiresAt);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (!token || !expiry) {
      return false;
    }
    
    return new Date(expiry) > new Date();
  }

  // Decode JWT to get user info
  getCurrentUser(): User | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Handle roles - can be string or array
      const roles = Array.isArray(payload.role) 
        ? payload.role 
        : payload.role 
          ? [payload.role]
          : [];
      
      // Handle permissions - can be string or array
      const permissions = Array.isArray(payload.permission)
        ? payload.permission
        : payload.permission
          ? [payload.permission]
          : [];

      return {
        id: payload.nameid || payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        roles,
        permissions,
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  // Helper methods for role/permission checking
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return roles.some(role => user?.roles?.includes(role)) || false;
  }

  isAdmin(): boolean {
    return this.hasRole('MasterAdmin');
  }

  isOwner(): boolean {
    return this.hasRole('Owner');
  }

  isEmployee(): boolean {
    return this.hasRole('Employee');
  }

  isIndividual(): boolean {
    return this.hasRole('Individual');
  }

  // Two-Factor Authentication Methods
  async getTwoFactorSetup(): Promise<TwoFactorSetupResponse> {
    const response = await api.get<TwoFactorSetupResponse>('/auth/2fa/setup');
    return response.data;
  }

  async enableTwoFactor(data: Enable2FADto): Promise<{ message: string; recoveryCodes: RecoveryCodesDto }> {
    const response = await api.post<{ message: string; recoveryCodes: RecoveryCodesDto }>('/auth/2fa/enable', data);
    return response.data;
  }

  async disableTwoFactor(data: Disable2FADto): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/2fa/disable', data);
    return response.data;
  }

  async verifyTwoFactorCode(data: TwoFactorLoginDto): Promise<AuthResponse> {
    const response = await api.post<{ message: string; token: TokenDto }>('/auth/2fa/verify', data);
    this.saveTokens(response.data.token);
    return { message: response.data.message, token: response.data.token };
  }

  async getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
    const response = await api.get<TwoFactorStatusResponse>('/auth/2fa/status');
    return response.data;
  }

  async getRecoveryCodes(): Promise<{ message: string; recoveryCodes: RecoveryCodesDto }> {
    const response = await api.get<{ message: string; recoveryCodes: RecoveryCodesDto }>('/auth/2fa/recovery-codes');
    return response.data;
  }

  async regenerateRecoveryCodes(): Promise<{ message: string; recoveryCodes: RecoveryCodesDto }> {
    const response = await api.post<{ message: string; recoveryCodes: RecoveryCodesDto }>('/auth/2fa/regenerate-recovery-codes');
    return response.data;
  }
}

export default new AuthService();