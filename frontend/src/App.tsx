import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';

// Auth Guards & Layouts
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Public Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Private Pages
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import BusinessTestCasesPage from './pages/BusinessTestCasesPage';
import AutomationTestsPage from './pages/AutomationTestsPage';
import VisualTestBuilderPage from './pages/VisualTestBuilderPage';
import PlaywrightRecorderPage from './pages/PlaywrightRecorderPage';
import ObjectRepositoryPage from './pages/ObjectRepositoryPage';
import TestDataPage from './pages/TestDataPage';
import ExecutionsPage from './pages/ExecutionsPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import FailuresPage from './pages/FailuresPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

// Style imports
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Main routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard / Root */}
            <Route index element={<DashboardPage />} />

            {/* Projects */}
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/business-tests" element={<BusinessTestCasesPage />} />
            <Route path="projects/:id/automation-tests" element={<AutomationTestsPage />} />
            <Route path="projects/:id/automation-tests/:testId/builder" element={<VisualTestBuilderPage />} />
            <Route path="projects/:id/recorder" element={<PlaywrightRecorderPage />} />
            <Route path="projects/:id/objects" element={<ObjectRepositoryPage />} />
            <Route path="projects/:id/test-data" element={<TestDataPage />} />
            <Route path="projects/:id/executions" element={<ExecutionsPage />} />
            <Route path="projects/:id/executions/:runId" element={<ExecutionDetailPage />} />
            <Route path="projects/:id/failures" element={<FailuresPage />} />
            <Route path="projects/:id/reports" element={<ReportsPage />} />

            {/* Profile & settings */}
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
