import { useEffect } from 'react';
import { useConnectWallet } from '@newm.io/cardano-dapp-wallet-connector';
import { useWalletState } from '../store/wallet-state';

export const useWalletConnector = () => {
  const {
    wallet,
    connect,
    disconnect: disconnectWallet,
    getAddress,
    getBalance,
    isLoading,
    error: walletError
  } = useConnectWallet();

  const {
    setWallet,
    setWalletAddress,
    setIsConnecting,
    setError,
    setBalance,
    resetWallet,
    setNetworkId,
  } = useWalletState();

  useEffect(() => {
    const updateWalletDetails = async () => {

      if (wallet) {
        setWallet(wallet);

        getAddress((walletAddress: string) => {

          setWalletAddress(walletAddress);
        });

        getBalance((walletBalance) => {

          setBalance(Number(walletBalance));
        });

        try {
          const id = await wallet.getNetworkId();
          setNetworkId(id);
        } catch (error) {
          console.log("Failed to retrieve network ID:", error);
        }
      } else {
        resetWallet();
      }
    };

    updateWalletDetails();
  }, [wallet, getAddress, getBalance, setWallet, setWalletAddress, setBalance, resetWallet, setNetworkId]);

  useEffect(() => {
    setIsConnecting(isLoading);
  }, [isLoading, setIsConnecting]);

  useEffect(() => {
    setError(walletError || null);
  }, [walletError, setError]);

  const disconnect = () => {
    disconnectWallet();
    resetWallet();
  };

  const { walletAddress, balance, isConnecting, error, networkId } = useWalletState();

  return {
    wallet,
    connect,
    disconnect,
    address: walletAddress,
    networkId,
    balance: balance?.toString() || null,
    isLoading: isConnecting,
    error
  };
};