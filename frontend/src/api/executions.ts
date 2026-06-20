import client from './client';
import type { ExecutionRun, DashboardStats, TrendPoint } from '../types/execution';
import type { PaginatedResponse } from '../types/common';

export const executionsApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    client.get<PaginatedResponse<ExecutionRun>>(`/projects/${projectId}/executions/`, { params }).then(r => r.data),

  get: (id: string) =>
    client.get<ExecutionRun>(`/executions/${id}/`).then(r => r.data),

  getStatus: (id: string) =>
    client.get<ExecutionRun>(`/executions/${id}/status/`).then(r => r.data),

  trigger: (testCaseId: string, environmentId: string) =>
    client.post<ExecutionRun>('/executions/run/', {
      test_case_id: testCaseId,
      environment_id: environmentId,
    }).then(r => r.data),

  cancel: (id: string) =>
    client.post(`/executions/${id}/cancel/`),

  // Dashboard
  dashboardStats: () =>
    client.get<DashboardStats>('/dashboard/stats/').then(r => r.data),

  trends: (days = 30) =>
    client.get<TrendPoint[]>('/dashboard/trends/', { params: { days } }).then(r => r.data),

  recentExecutions: () =>
    client.get<ExecutionRun[]>('/dashboard/recent-executions/').then(r => r.data),

  recentFailures: () =>
    client.get<ExecutionRun[]>('/dashboard/recent-failures/').then(r => r.data),

  createTicket: () =>
    client.post<{ ticket: string }>('/tickets/create/').then(r => r.data),
};
