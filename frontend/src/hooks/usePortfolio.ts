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
  /** Reads auth state once per hook call so query functions can refresh tokens. */
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
  /** Retries one protected operation after refreshing an expired access token. */
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
  /** Loads the editable profile for the current authenticated user. */
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.profile,
    queryFn: () => withTokenRefresh(auth, (token) => api.getProfile(token)),
    enabled
  });
}

export function useSite(enabled = true) {
  /** Loads the current site with blocks and projects for editor/public views. */
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.site,
    queryFn: () => withTokenRefresh(auth, (token) => api.getSite(token)),
    enabled
  });
}

export function useProjects(enabled = true) {
  /** Loads portfolio projects with local public-page selection state applied. */
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.projects,
    queryFn: () => withTokenRefresh(auth, (token) => api.getProjects(token)),
    enabled
  });
}

export function useTemplates() {
  /** Loads the list of templates available for portfolio rendering. */
  return useQuery({ queryKey: portfolioKeys.templates, queryFn: () => api.getTemplates() });
}

export function useDashboardSummary() {
  /** Loads aggregated dashboard readiness data through API Gateway. */
  const auth = useAuthContext();
  return useQuery({
    queryKey: portfolioKeys.dashboard,
    queryFn: () => withTokenRefresh(auth, (token) => api.getDashboardSummary(token))
  });
}

export function usePublicPortfolio(slug?: string) {
  /** Loads a read-only public portfolio by username or slug. */
  return useQuery({
    queryKey: portfolioKeys.publicPortfolio(slug ?? ''),
    queryFn: () => api.getPublicPortfolio(slug ?? ''),
    enabled: Boolean(slug)
  });
}

export function useUpdateProfile() {
  /** Updates profile data and refreshes dependent dashboard state. */
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
  /** Creates a project and refreshes project/site/dashboard queries. */
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
  /** Toggles whether a project is included in the public portfolio snapshot. */
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
  /** Updates site metadata such as slug or selected template. */
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
  /** Publishes the site and refreshes dashboard/site state. */
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
