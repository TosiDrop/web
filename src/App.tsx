import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProviderWithUI } from './providers/WalletProvider';
import { MainLayout } from './layouts/MainLayout';
import ClaimPage from './pages/ClaimPage';
import HistoryPage from './pages/HistoryPage';
import PreferencesPage from './pages/PreferencesPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WalletProviderWithUI
        autoConnect={false}
        onConnect={(wallet) => console.log('Wallet connected:', wallet)}
        onDisconnect={() => console.log('Wallet disconnected')}
        onError={(error) => console.error('Wallet error:', error)}
        mainButtonStyle={{
          position: 'fixed',
          top: '0.75rem',
          right: '1rem',
          background: 'transparent',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          zIndex: '100',
          maxWidth: '12rem',
          maxHeight: '2.5rem',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
        }}
      >
        <MainLayout>
          <Routes>
            <Route path="/" element={<ClaimPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
          </Routes>
        </MainLayout>
      </WalletProviderWithUI>
    </BrowserRouter>
  );
};

export default App;
