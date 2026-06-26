import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Profile, Site } from '../types/domain';

export const portfolioKeys = {
  profile: ['profile'] as const,
  site: ['site'] as const
};

export function useProfile() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: portfolioKeys.profile, queryFn: () => api.getProfile(token) });
}

export function useSite() {
  const token = useAuthStore((state) => state.token);
  return useQuery({ queryKey: portfolioKeys.site, queryFn: () => api.getSite(token) });
}

export function useUpdateProfile() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) => api.updateProfile(patch, token),
    onSuccess: (profile) => queryClient.setQueryData(portfolioKeys.profile, profile)
  });
}

export function useUpdateSite() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, patch }: { siteId: string; patch: Partial<Site> }) => api.updateSite(siteId, patch, token),
    onSuccess: (site) => queryClient.setQueryData(portfolioKeys.site, site)
  });
}

export function usePublishSite() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (siteId: string) => api.publishSite(siteId, token),
    onSuccess: (site) => queryClient.setQueryData(portfolioKeys.site, site)
  });
}
