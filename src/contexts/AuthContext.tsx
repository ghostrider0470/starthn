import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import authService, {
  type LoginDto,
  type RegisterDto,
  type ExternalAuthDto
} from '@/services/auth.service';
import profileService from '@/services/profile.service';
import { roleService } from '@/services/role.service';
import { hasPermission as checkPermission, setRolePermissions } from '@/lib/rbac';
import { useAnalyticsIdentify } from '@/hooks/useAnalytics';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  isOptedOut: boolean;
  roles: string[];
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  avatarUrl?: string;
  bio?: string;
  profession?: string;
  expertise?: string[];
  socialLinks?: { linkedIn?: string; twitter?: string; gitHub?: string; website?: string };
  slug?: string;
  pageContent?: string;
}

interface AuthContextType {
  user: ProfileData | null; // 'user' now points to full profile data
  profile: ProfileData | null; // Keep for backward compatibility, same as user
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  externalLogin: (data: ExternalAuthDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: string | null;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccessAdmin: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isIndividual: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Defer auth check to after hydration so SSR and client initial render both see false
  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  // Query to get full profile data (this is now our primary user data)
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => profileService.getProfile(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  // Sync role-permission mapping from API for admin users
  const { data: apiRoles } = useQuery({
    queryKey: ['role-permissions-sync'],
    queryFn: () => roleService.fetchAdminRoles(),
    enabled: isAuthenticated && checkPermission(profile?.roles ?? [], 'view:admin'),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    if (apiRoles) {
      const map: Record<string, string[]> = {}
      for (const role of apiRoles) {
        map[role.name] = role.permissions
      }
      setRolePermissions(map)
    }
  }, [apiRoles]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginDto) => authService.login(data),
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Login failed');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterDto) => authService.register(data),
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Registration failed');
    },
  });

  // External login mutation
  const externalLoginMutation = useMutation({
    mutationFn: (data: ExternalAuthDto) => authService.externalLogin(data),
    onSuccess: () => {
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'External login failed');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/';
    },
  });

  // Check token expiry on mount and set up interval
  useEffect(() => {
    const checkTokenExpiry = () => {
      const valid = authService.isAuthenticated();
      setIsAuthenticated(valid);
      if (!valid) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [queryClient]);

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
  };

  const value: AuthContextType = {
    user: profile || null, // user now points to full profile
    profile: profile || null, // kept for backward compatibility
    isLoading,
    isAuthenticated,
    login: async (data) => {
      await loginMutation.mutateAsync(data);
    },
    register: async (data) => {
      await registerMutation.mutateAsync(data);
    },
    externalLogin: async (data) => {
      await externalLoginMutation.mutateAsync(data);
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    refreshProfile,
    error,
    hasRole: (role: string) => profile?.roles?.includes(role) || false,
    hasPermission: (permission: string) => checkPermission(profile?.roles ?? [], permission),
    hasAnyRole: (roles: string[]) => roles.some(role => profile?.roles?.includes(role)) || false,
    canAccessAdmin: checkPermission(profile?.roles ?? [], 'view:admin'),
    isAdmin: profile?.roles?.includes('MasterAdmin') || false,
    isOwner: profile?.roles?.includes('Owner') || false,
    isEmployee: profile?.roles?.includes('Employee') || false,
    isIndividual: profile?.roles?.includes('Individual') || false,
  };

  // Identify user for analytics (runs inside AuthProvider, so useAuth is available)
  useAnalyticsIdentify(profile || null);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}