const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob';
  signal?: AbortSignal;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Mimics the shape of an axios error so call-sites that access
 * `err.response?.data?.message` or `err.response?.status` keep working.
 */
export class ApiError extends Error {
  response?: {
    data: any;
    status: number;
    headers: Headers;
  };

  constructor(message: string, response?: ApiError['response']) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = `${API_BASE_URL}${path}`;
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `${url}?${qs}` : url;
}

// ---------------------------------------------------------------------------
// Token refresh (shared promise prevents concurrent 401s from racing)
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  const json = await res.json();
  const { accessToken, refreshToken: newRefreshToken } = json.token;

  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  }

  return accessToken;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(
  method: string,
  path: string,
  body?: any,
  config: RequestConfig = {},
  _retry = false,
): Promise<ApiResponse<T>> {
  const isAuthEndpoint = path.startsWith('/auth/');
  const token = getAccessToken();

  const headers: Record<string, string> = {};

  // Set Content-Type for non-FormData bodies
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Auth header (skip for /auth/ endpoints)
  if (token && !isAuthEndpoint) {
    headers['X-Authorization'] = `Bearer ${token}`;
  }

  // Merge caller-supplied headers (e.g. multipart override)
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      // For FormData the browser must set the Content-Type with the correct
      // boundary.  When callers pass 'multipart/form-data' explicitly (the old
      // axios pattern), we drop it so the browser generates the boundary.
      if (key.toLowerCase() === 'content-type' && value === 'multipart/form-data') {
        delete headers['Content-Type'];
        continue;
      }
      headers[key] = value;
    }
  }

  const url = buildUrl(path, config.params);

  const fetchInit: RequestInit = {
    method,
    headers,
    signal: config.signal,
  };

  if (body !== undefined) {
    fetchInit.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchInit);

  // ---- Handle 401 with token refresh (skip auth endpoints & retries) ----
  if (res.status === 401 && !_retry && !isAuthEndpoint) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;

      // Retry the original request with the fresh token
      return request<T>(method, path, body, config, true);
    } catch {
      refreshPromise = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      throw new ApiError('Session expired', {
        data: { message: 'Session expired' },
        status: 401,
        headers: res.headers,
      });
    }
  }

  // ---- Parse response body ----
  let data: any;
  if (config.responseType === 'blob') {
    data = await res.blob();
  } else {
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
  }

  // ---- Error handling ----
  if (!res.ok) {
    const message =
      (typeof data === 'object' && data?.message) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, {
      data,
      status: res.status,
      headers: res.headers,
    });
  }

  return { data, status: res.status, headers: res.headers };
}

// ---------------------------------------------------------------------------
// ApiClient — drop-in replacement for the old axios instance
// ---------------------------------------------------------------------------

class ApiClient {
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>('GET', url, undefined, config);
  }

  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>('POST', url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>('PUT', url, data, config);
  }

  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>('PATCH', url, data, config);
  }

  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return request<T>('DELETE', url, undefined, config);
  }
}

const api = new ApiClient();
export default api;
