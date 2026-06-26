import type {
  AuthSession,
  Profile,
  PublicPortfolio,
  Site,
  User
} from '../types/domain';
import { demoProfile, demoPublicPortfolio, demoSite } from './mockData';

const STORAGE_KEY = 'profileforge:frontend-v2';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const USE_MOCK_API = String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() === 'true';

type DemoState = {
  profile: Profile;
  site: Site;
  user: User;
};

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDemoState(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DemoState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const initial: DemoState = {
    profile: clone(demoProfile),
    site: clone(demoSite),
    user: { id: 'demo-user-1', email: 'demo@profileforge.app' }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveDemoState(next: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = body?.detail ?? body?.message ?? 'Не удалось выполнить запрос. Проверьте доступность API Gateway.';
    throw new ApiError(message, response.status);
  }

  return unwrap<T>(body);
}

function buildSession(email: string): AuthSession {
  const state = getDemoState();
  const next = { ...state, user: { ...state.user, email } };
  saveDemoState(next);
  return { accessToken: 'demo-profileforge-token', user: next.user };
}

export const api = {
  mode: USE_MOCK_API ? 'demo' : 'gateway',

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    if (USE_MOCK_API) return buildSession(input.email);
    return request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async register(input: { email: string; password: string }): Promise<AuthSession> {
    if (USE_MOCK_API) return buildSession(input.email);
    return request<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async getCurrentUser(token?: string | null): Promise<User> {
    if (USE_MOCK_API) return getDemoState().user;
    return request<User>('/api/auth/me', {}, token);
  },

  async getProfile(token?: string | null): Promise<Profile> {
    if (USE_MOCK_API) return clone(getDemoState().profile);
    return request<Profile>('/api/profiles/me', {}, token);
  },

  async updateProfile(patch: Partial<Profile>, token?: string | null): Promise<Profile> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next: DemoState = {
        ...state,
        profile: {
          ...state.profile,
          ...patch,
          links: { ...state.profile.links, ...(patch.links ?? {}) }
        }
      };
      saveDemoState(next);
      return clone(next.profile);
    }

    return request<Profile>('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }, token);
  },

  async checkUsername(username: string, token?: string | null): Promise<{ available: boolean }> {
    if (USE_MOCK_API) {
      const current = getDemoState().profile.username;
      return { available: username === current || !['admin', 'profileforge', 'test'].includes(username.toLowerCase()) };
    }
    return request<{ available: boolean }>(`/api/profiles/check-username/${encodeURIComponent(username)}`, {}, token);
  },

  async getSite(token?: string | null): Promise<Site> {
    if (USE_MOCK_API) return clone(getDemoState().site);
    return request<Site>('/api/sites/me', {}, token);
  },

  async createSite(input: Partial<Site>, token?: string | null): Promise<Site> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next = { ...state, site: { ...state.site, ...input } };
      saveDemoState(next);
      return clone(next.site);
    }
    return request<Site>('/api/sites', {
      method: 'POST',
      body: JSON.stringify(input)
    }, token);
  },

  async updateSite(siteId: string, patch: Partial<Site>, token?: string | null): Promise<Site> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next = { ...state, site: { ...state.site, ...patch } };
      saveDemoState(next);
      return clone(next.site);
    }

    return request<Site>(`/api/sites/${encodeURIComponent(siteId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }, token);
  },

  async publishSite(siteId: string, token?: string | null): Promise<Site> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next = { ...state, site: { ...state.site, isPublished: true } };
      saveDemoState(next);
      return clone(next.site);
    }

    return request<Site>(`/api/sites/${encodeURIComponent(siteId)}/publish`, { method: 'POST' }, token);
  },

  async getPublicPortfolio(slug: string): Promise<PublicPortfolio> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      if (slug !== state.site.slug && slug !== state.profile.username) return clone(demoPublicPortfolio);
      return { profile: clone(state.profile), site: clone(state.site) };
    }
    return request<PublicPortfolio>(`/api/public/${encodeURIComponent(slug)}`);
  }
};
