import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProviderWithUI } from './providers/WalletProvider';
import { NavigationMenu } from './components/NavigationMenu';
import Home from './components/Home';
import History from './components/History';
import Preferences from './components/Preferences';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WalletProviderWithUI
        autoConnect={false}
        onConnect={(wallet) => console.log('Wallet connected:', wallet)}
        onDisconnect={() => console.log('Wallet disconnected')}
        onError={(error) => console.error('Wallet error:', error)}
        mainButtonStyle={{
          position: 'absolute',
          top: '0.5rem',
          right: '1rem',
          background: 'transparent',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '12px',
          zIndex: '100',
          maxWidth: '10rem',
          maxHeight: '2rem',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
        }}
      >
        <NavigationMenu />
        <Routes>
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </WalletProviderWithUI>
    </BrowserRouter>
  );
};

export default App;
