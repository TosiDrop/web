import React, { FC, ReactNode, useEffect, useState } from 'react';
import { ConnectWallet, EnabledWallet } from '@newm.io/cardano-dapp-wallet-connector';
import { useWalletConnector } from '../hooks/useWalletConnector';
import { useWalletState } from '../store/wallet-state';


interface WalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  defaultWalletId?: string;
  className?: string;
}

export const WalletProvider: FC<WalletProviderProps> = ({
  children,
  autoConnect = false,
  defaultWalletId,
}) => {

  const { wallet, connect, error } = useWalletConnector();
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  const { wallet: storeWallet, walletAddress, isConnecting, error: storeError, balance, networkId } = useWalletState();

  useEffect(() => {
    if (autoConnect && defaultWalletId && !wallet && !autoConnectAttempted) {
      connect(defaultWalletId);
      setAutoConnectAttempted(true);
    }
  }, [autoConnect, defaultWalletId, wallet, connect, autoConnectAttempted]);

  useEffect(() => {
    if (wallet) {
      console.log('Wallet connected:');
    }
  }, [wallet]);

  useEffect(() => {
    if (error) {
      console.error('Wallet connection error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (storeWallet && balance) {
      console.log({
        wallet: storeWallet,
        walletAddress,
        isConnecting,
        error: storeError,
        balance,
        networkId
      });
    }
  }, [storeWallet, walletAddress, isConnecting, storeError, balance, networkId]);


  return (
    <>
      {children}
    </>
  );
};

export const WalletProviderWithUI: FC<WalletProviderProps & {
  className?: string;
  modalStyle?: React.CSSProperties;
  modalHeaderStyle?: React.CSSProperties;
  mainButtonStyle?: React.CSSProperties;
  disconnectButtonStyle?: React.CSSProperties;
  fontFamily?: string;
  isInverted?: boolean;
  omitWallets?: string[];
  onClickButton?: (event: React.MouseEvent) => void;
  onCloseModal?: (event: React.MouseEvent) => void;
  onConnect?: (wallet: EnabledWallet) => void;
  onDisconnect?: () => void;
  onError?: (message: string) => void;
}> = ({
  children,
  defaultWalletId,
  autoConnect = false,
  ...connectWalletProps
}) => {

  return (
    <WalletProvider
      defaultWalletId={defaultWalletId}
      autoConnect={autoConnect}
    >
      <ConnectWallet {...connectWalletProps} />
      {children}
    </WalletProvider>
  );
};