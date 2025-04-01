import React from 'react';
import { ConnectWallet } from '@newm.io/cardano-dapp-wallet-connector';
import { useWalletState } from '../store/wallet-state';

const WalletInfo: React.FC = () => {

  const { walletAddress, balance, wallet } = useWalletState(state => ({
    walletAddress: state.walletAddress,
    balance: state.balance,
    wallet: state.wallet
  }));

  if (!walletAddress) {
    return <ConnectWallet />;
  }

  return (
    <div className="wallet-info">
      <div className="connected-status">
        <span className="status-dot" />
        Connected to {wallet?.name || 'Wallet'}
      </div>

      <div className="wallet-details">
        <p>Address: {walletAddress}</p>
        <p>Balance: {balance} ₳</p>
      </div>

    </div>
  );
};

export default WalletInfo;