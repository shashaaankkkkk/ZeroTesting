import client from './client';
import type { FailureRecord } from '../types/failure';
import type { PaginatedResponse } from '../types/common';

export const failuresApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    client.get<PaginatedResponse<FailureRecord>>(`/projects/${projectId}/failures/`, { params }).then(r => r.data),

  get: (id: string) =>
    client.get<FailureRecord>(`/failures/${id}/`).then(r => r.data),

  update: (id: string, data: { status?: string; notes?: string }) =>
    client.patch(`/failures/${id}/update/`, data),
};
