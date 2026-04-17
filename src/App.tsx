import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { MainLayout } from '@/layouts/MainLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ClaimPage from '@/pages/ClaimPage';
import HistoryPage from '@/pages/HistoryPage';

const PreferencesPage = lazy(() => import('@/pages/PreferencesPage'));
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
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/preferences" element={<PreferencesPage />} />
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
