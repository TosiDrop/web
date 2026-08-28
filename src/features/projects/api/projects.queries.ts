import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { TokenMap } from '@/features/history/api/history.queries';
import type { Project, ProjectInput } from '@/shared/projects';

export interface SignedProjectRequest {
  ownerAddress: string;
  project: ProjectInput;
  signature: string;
  key: string;
  message: string;
}

export interface ProjectsResponse {
  projects: Project[];
  /** True when storage was unreachable: the list is unknown, not empty. */
  degraded: boolean;
}

export function useOwnerProjects(owner: string | null) {
  return useQuery<ProjectsResponse, Error>({
    queryKey: ['projects', DEPLOYMENT_NETWORK, owner],
    enabled: !!owner,
    staleTime: 60_000,
    queryFn: async () => {
      if (!owner) throw new Error('owner is required');
      const res = await apiClient.get<ProjectsResponse>(
        `/api/projects?owner=${encodeURIComponent(owner)}`,
      );
      return { projects: res.projects, degraded: res.degraded === true };
    },
  });
}

export function useTokenMap() {
  return useQuery<TokenMap, Error>({
    queryKey: ['tokens', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<TokenMap>('/api/getTokens'),
    staleTime: 60 * 60 * 1000,
  });
}

export function useRegisterProject() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, SignedProjectRequest>({
    mutationFn: (body) => apiClient.post<{ id: string }>('/api/projects', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, SignedProjectRequest & { id: string }>({
    mutationFn: ({ id, ...body }) =>
      apiClient.put<{ id: string }>(`/api/projects/${encodeURIComponent(id)}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
