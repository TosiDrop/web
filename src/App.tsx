import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import ClaimPage from './pages/ClaimPage';
import HistoryPage from './pages/HistoryPage';
import PreferencesPage from './pages/PreferencesPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<ClaimPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
