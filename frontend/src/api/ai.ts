import client from './client';

export interface AIStep {
  action: string;
  target: string;
  value?: string;
  description?: string;
  wait_timeout?: number;
}

export const aiApi = {
  status: () =>
    client.get<{ enabled: boolean }>('/ai/status/').then(r => r.data),

  generateSteps: (description: string, context = '') =>
    client.post<{ steps: AIStep[] }>('/ai/generate-steps/', { description, context }).then(r => r.data),

  failureSummary: (data: { expected: string; actual: string; error_message?: string; console_logs?: string }) =>
    client.post<{ summary: string }>('/ai/failure-summary/', data).then(r => r.data),
};
