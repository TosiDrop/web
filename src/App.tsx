import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProviderWithUI } from './providers/WalletProvider';
import { NavigationMenuDemo } from './components/NavigationMenuDemo';
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
          top: '20px',
          left: '20px',
          background: 'rgba(31, 41, 55, 0.9)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          zIndex: '50',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
        }}
      >
        <NavigationMenuDemo />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/preferences" element={<Preferences />} />
        </Routes>
      </WalletProviderWithUI>
    </BrowserRouter>
  );
};

export default App;
