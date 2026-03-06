import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { MainLayout } from '@/layouts/MainLayout';
import ClaimPage from '@/pages/ClaimPage';
import HistoryPage from '@/pages/HistoryPage';
import PreferencesPage from '@/pages/PreferencesPage';
import ApiTesterPage from '@/pages/ApiTesterPage';

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<ClaimPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
            <Route path="/api-tester" element={<ApiTesterPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AppProviders>
  );
}
