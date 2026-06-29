import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { AuthSession, PortfolioProject, Profile, Site } from '../types/domain';

export const portfolioKeys = {
  profile: ['profile'] as const,
  site: ['site'] as const,
  projects: ['projects'] as const,
  templates: ['templates'] as const,
  dashboard: ['dashboard'] as const,
  publicPortfolio: (slug: string) => ['publicPortfolio', slug] as const
};

type AuthContext = {
  token: string | null;
  refreshToken: string | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

function useAuthContext(): AuthContext {
  return {
    token: useAuthStore((state) => state.token),
    refreshToken: useAuthStore((state) => state.refreshToken),
    setSession: useAuthStore((state) => state.setSession),
    clearSession: useAuthStore((state) => state.clearSession)
  };
}

async function withTokenRefresh<T>(
  auth: AuthContext,
  operation: (token: string | null) => Promise<T>
): Promise<T> {
  try {
    return await operation(auth.token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !auth.refreshToken) {
      throw error;
    }

    try {
      const session = await api.refreshSession(auth.refreshToken);
      auth.setSession(session);
      return await operation(session.accessToken);
    } catch (refreshError) {
      auth.clearSession();
      throw refreshError;
    }
  }
}

export function useProfile(enabled = true) {
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.profile,
    queryFn: () => withTokenRefresh(auth, (token) => api.getProfile(token)),
    enabled
  });
}

export function useSite(enabled = true) {
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.site,
    queryFn: () => withTokenRefresh(auth, (token) => api.getSite(token)),
    enabled
  });
}

export function useProjects(enabled = true) {
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.projects,
    queryFn: () => withTokenRefresh(auth, (token) => api.getProjects(token)),
    enabled
  });
}

export function useTemplates() {
  return useQuery({ queryKey: portfolioKeys.templates, queryFn: () => api.getTemplates() });
}

export function useDashboardSummary() {
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.dashboard,
    queryFn: () => withTokenRefresh(auth, (token) => api.getDashboardSummary(token))
  });
}

export function usePublicPortfolio(slug?: string) {
  return useQuery({
    queryKey: portfolioKeys.publicPortfolio(slug ?? ''),
    queryFn: () => api.getPublicPortfolio(slug ?? ''),
    enabled: Boolean(slug)
  });
}

export function useUpdateProfile() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) => withTokenRefresh(auth, (token) => api.updateProfile(patch, token)),
    onSuccess: (profile) => {
      queryClient.setQueryData(portfolioKeys.profile, profile);
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.dashboard });
    }
  });
}

export function useCreateProject() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: Partial<PortfolioProject>) => withTokenRefresh(auth, (token) => api.createProject(project, token)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.projects });
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.site });
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.dashboard });
    }
  });
}

export function useToggleProjectSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const projects = queryClient.getQueryData<PortfolioProject[]>(portfolioKeys.projects) ?? [];
      return api.toggleProjectSelection(projectId, projects);
    },
    onSuccess: (projects) => {
      queryClient.setQueryData(portfolioKeys.projects, projects);
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.site });
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.dashboard });
    }
  });
}

export function useUpdateSite() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, patch }: { siteId: string; patch: Partial<Site> }) => (
      withTokenRefresh(auth, (token) => api.updateSite(siteId, patch, token))
    ),
    onSuccess: (site) => {
      queryClient.setQueryData(portfolioKeys.site, site);
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.dashboard });
    }
  });
}

export function usePublishSite() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (siteId: string) => withTokenRefresh(auth, (token) => api.publishSite(siteId, token)),
    onSuccess: (site) => {
      queryClient.setQueryData(portfolioKeys.site, site);
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.dashboard });
    }
  });
}
