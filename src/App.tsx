import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { MainLayout } from '@/layouts/MainLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ClaimPage from '@/pages/ClaimPage';

const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const ApiTesterPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/ApiTesterPage'))
  : null;

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <MainLayout>
          <ErrorBoundary>
            <Suspense fallback={<div className="animate-pulse text-gray-400 p-8">Loading...</div>}>
              <Routes>
                <Route path="/" element={<ClaimPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/history" element={<Navigate to="/profile" replace />} />
                <Route path="/preferences" element={<Navigate to="/profile" replace />} />
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
