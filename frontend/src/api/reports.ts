import client from './client';
import type { Report } from '../types/report';
import type { PaginatedResponse } from '../types/common';

export const reportsApi = {
  list: (projectId: string) =>
    client.get<PaginatedResponse<Report>>(`/projects/${projectId}/reports/`).then(r => r.data),

  get: (id: string) =>
    client.get<Report>(`/reports/${id}/`).then(r => r.data),

  generate: (projectId: string, data: { report_type: string; format: string; filters?: Record<string, unknown> }) =>
    client.post<Report>(`/projects/${projectId}/reports/generate/`, data).then(r => r.data),

  download: (id: string) =>
    client.get(`/reports/${id}/download/`, { responseType: 'blob' }).then(r => r.data),
};
