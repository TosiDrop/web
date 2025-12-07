import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';

const ClaimPage = lazy(() => import('./pages/ClaimPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const PreferencesPage = lazy(() => import('./pages/PreferencesPage'));

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-white">Loading...</div></div>}>
          <Routes>
            <Route path="/" element={<ClaimPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
