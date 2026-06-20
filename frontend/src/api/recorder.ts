import client from './client';

export const recorderApi = {
  start: (baseUrl: string) =>
    client.post<{ session_id: string; status: string }>('/recorder/start/', { base_url: baseUrl }).then(r => r.data),

  stop: (sessionId: string) =>
    client.post(`/recorder/${sessionId}/stop/`).then(r => r.data),

  status: (sessionId: string) =>
    client.get<{ session_id: string; status: string; url: string; step_count: number }>(`/recorder/${sessionId}/status/`).then(r => r.data),

  steps: (sessionId: string) =>
    client.get<{ session_id: string; status: string; steps: Array<{ action: string; target: string; value: string; description: string }> }>(`/recorder/${sessionId}/steps/`).then(r => r.data),

  updateSteps: (sessionId: string, steps: any[]) =>
    client.put<{ session_id: string; status: string; steps: any[] }>(`/recorder/${sessionId}/steps/`, { steps }).then(r => r.data),

  getScreenshot: (sessionId: string) =>
    client.get<{ screenshot: string }>(`/recorder/${sessionId}/screenshot/`).then(r => r.data),

  sendInteraction: (sessionId: string, data: { action: string; x?: number; y?: number; text?: string; key?: string; url?: string }) =>
    client.post<{ status: string }>(`/recorder/${sessionId}/interact/`, data).then(r => r.data),
};
