import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { MainLayout } from '@/layouts/MainLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ClaimPage from '@/pages/ClaimPage';

const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const DepositPage = lazy(() => import('@/pages/DepositPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const ApiTesterPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/ApiTesterPage'))
  : null;

function PageFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading page">
      <div className="skeleton-shimmer h-9 w-56 rounded-lg" />
      <div className="skeleton-shimmer h-4 w-80 max-w-full rounded" />
      <div className="skeleton-shimmer mt-8 h-48 rounded-2xl" />
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <MainLayout>
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<ClaimPage />} />
                <Route path="/deposit" element={<DepositPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/new" element={<OnboardingPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/history" element={<Navigate to="/profile?tab=history" replace />} />
                <Route path="/preferences" element={<Navigate to="/profile?tab=settings" replace />} />
                {ApiTesterPage && <Route path="/api-tester" element={<ApiTesterPage />} />}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </MainLayout>
      </BrowserRouter>
    </AppProviders>
  );
}
