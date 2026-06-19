import client from './client';
import type { BusinessTestCase, AutomationTestCase, AutomationStep, ObjectRepositoryItem, TestDataItem, ExcelImportResult, ScriptOutput } from '../types/testcase';
import type { PaginatedResponse } from '../types/common';

export const testcasesApi = {
  // Business Test Cases
  listBusinessTests: (projectId: string, params?: Record<string, string>) =>
    client.get<PaginatedResponse<BusinessTestCase>>(`/projects/${projectId}/business-tests/`, { params }).then(r => r.data),

  getBusinessTest: (id: string) =>
    client.get<BusinessTestCase>(`/business-tests/${id}/`).then(r => r.data),

  createBusinessTest: (projectId: string, data: Partial<BusinessTestCase>) =>
    client.post<BusinessTestCase>(`/projects/${projectId}/business-tests/`, data).then(r => r.data),

  updateBusinessTest: (id: string, data: Partial<BusinessTestCase>) =>
    client.patch<BusinessTestCase>(`/business-tests/${id}/`, data).then(r => r.data),

  deleteBusinessTest: (id: string) =>
    client.delete(`/business-tests/${id}/`),

  importExcel: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<ExcelImportResult>(`/projects/${projectId}/business-tests/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // Automation Test Cases
  listAutomationTests: (projectId: string, params?: Record<string, string>) =>
    client.get<PaginatedResponse<AutomationTestCase>>(`/projects/${projectId}/automation-tests/`, { params }).then(r => r.data),

  getAutomationTest: (id: string) =>
    client.get<AutomationTestCase>(`/automation-tests/${id}/`).then(r => r.data),

  createAutomationTest: (projectId: string, data: Partial<AutomationTestCase> & { steps?: Partial<AutomationStep>[] }) =>
    client.post<AutomationTestCase>(`/projects/${projectId}/automation-tests/`, data).then(r => r.data),

  updateAutomationTest: (id: string, data: Partial<AutomationTestCase>) =>
    client.patch<AutomationTestCase>(`/automation-tests/${id}/`, data).then(r => r.data),

  deleteAutomationTest: (id: string) =>
    client.delete(`/automation-tests/${id}/`),

  getScript: (id: string) =>
    client.get<ScriptOutput>(`/automation-tests/${id}/script/`).then(r => r.data),

  // Steps
  addStep: (testId: string, data: Partial<AutomationStep>) =>
    client.post<AutomationStep>(`/automation-tests/${testId}/steps/`, data).then(r => r.data),

  updateStep: (id: string, data: Partial<AutomationStep>) =>
    client.patch<AutomationStep>(`/steps/${id}/`, data).then(r => r.data),

  deleteStep: (id: string) =>
    client.delete(`/steps/${id}/`),

  reorderSteps: (testId: string, stepIds: string[]) =>
    client.put(`/automation-tests/${testId}/steps/reorder/`, { step_ids: stepIds }),

  // Object Repository
  listObjects: (projectId: string, params?: Record<string, string>) =>
    client.get<PaginatedResponse<ObjectRepositoryItem>>(`/projects/${projectId}/objects/`, { params }).then(r => r.data),

  createObject: (projectId: string, data: Partial<ObjectRepositoryItem>) =>
    client.post<ObjectRepositoryItem>(`/projects/${projectId}/objects/`, data).then(r => r.data),

  updateObject: (id: string, data: Partial<ObjectRepositoryItem>) =>
    client.patch<ObjectRepositoryItem>(`/objects/${id}/`, data).then(r => r.data),

  deleteObject: (id: string) =>
    client.delete(`/objects/${id}/`),

  // Test Data
  listTestData: (projectId: string, params?: Record<string, string>) =>
    client.get<PaginatedResponse<TestDataItem>>(`/projects/${projectId}/test-data/`, { params }).then(r => r.data),

  createTestData: (projectId: string, data: Partial<TestDataItem>) =>
    client.post<TestDataItem>(`/projects/${projectId}/test-data/`, data).then(r => r.data),

  updateTestData: (id: string, data: Partial<TestDataItem>) =>
    client.patch<TestDataItem>(`/test-data/${id}/`, data).then(r => r.data),

  deleteTestData: (id: string) =>
    client.delete(`/test-data/${id}/`),

  generateValue: (generator: string) =>
    client.post<{ value: string }>('/test-data/generate/', { generator }).then(r => r.data),

  listGenerators: () =>
    client.get<{ generators: string[] }>('/test-data/generators/').then(r => r.data),
};
