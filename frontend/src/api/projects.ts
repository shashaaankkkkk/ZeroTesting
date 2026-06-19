import client from './client';
import type { Project, Environment, ProjectStats } from '../types/project';
import type { PaginatedResponse } from '../types/common';

export const projectsApi = {
  list: (params?: Record<string, string>) =>
    client.get<PaginatedResponse<Project>>('/projects/', { params }).then(r => r.data),

  get: (id: string) =>
    client.get<Project>(`/projects/${id}/`).then(r => r.data),

  create: (data: { name: string; description: string }) =>
    client.post<Project>('/projects/', data).then(r => r.data),

  update: (id: string, data: Partial<Project>) =>
    client.patch<Project>(`/projects/${id}/`, data).then(r => r.data),

  delete: (id: string) =>
    client.delete(`/projects/${id}/`),

  stats: (id: string) =>
    client.get<ProjectStats>(`/projects/${id}/stats/`).then(r => r.data),

  // Environments
  listEnvironments: (projectId: string) =>
    client.get<Environment[]>(`/projects/${projectId}/environments/`).then(r => r.data),

  createEnvironment: (projectId: string, data: Partial<Environment>) =>
    client.post<Environment>(`/projects/${projectId}/environments/`, data).then(r => r.data),

  updateEnvironment: (id: string, data: Partial<Environment>) =>
    client.patch<Environment>(`/environments/${id}/`, data).then(r => r.data),

  deleteEnvironment: (id: string) =>
    client.delete(`/environments/${id}/`),
};
