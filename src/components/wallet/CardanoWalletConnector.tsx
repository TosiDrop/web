import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ConnectWalletList } from '@cardano-foundation/cardano-connect-with-wallet';
import { NetworkType } from '@cardano-foundation/cardano-connect-with-wallet-core';
import { useWalletState } from '@/store/wallet-state';
import { rewardAddressToBech32 } from '@/utils/cardano-address';
import type {
  CardanoWalletApi,
  WalletConnectorRef,
} from '@/types/wallet';

interface CardanoWalletConnectorProps {
  variant?: 'default' | 'white';
  showTitle?: boolean;
  showDescription?: boolean;
  listLayout?: 'dropdown' | 'flex';
  initiallyOpen?: boolean;
  networkType?: NetworkType;
  supportedWallets?: string[];
  onConnect?: (
    walletName: string,
    walletApi: CardanoWalletApi,
    stakeAddress: string | null
  ) => void;
  onDisconnect?: () => void;
  showError?: (message: string) => void;
  navigateOnConnect?: (path: string) => void;
}

const DEFAULT_SUPPORTED_WALLETS = [
  'eternl',
  'yoroi',
  'gerowallet',
  'begin',
  'nufi',
  'lace',
  'vespr',
];

const DROPDOWN_WALLET_LIST_CSS = `
  font-family: Helvetica Light, sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  width: 100%;
  & > span {
    padding: 10px 12px;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 8px;
    background: transparent;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
    cursor: pointer;
    opacity: 0;
    transform: translateY(-10px);
    animation: cascadeIn 0.4s ease-out forwards;
  }
  & > span:nth-child(1) { animation-delay: 0.02s; }
  & > span:nth-child(2) { animation-delay: 0.08s; }
  & > span:nth-child(3) { animation-delay: 0.12s; }
  & > span:nth-child(4) { animation-delay: 0.17s; }
  & > span:nth-child(5) { animation-delay: 0.22s; }
  & > span:nth-child(6) { animation-delay: 0.27s; }
  & > span:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
  @keyframes cascadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const FLEX_WALLET_LIST_CSS = `
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  width: 100%;
  max-width: 540px;
  font-family: Helvetica Light, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  justify-items: stretch;
  align-content: start;
  & > span {
    width: 100%;
    padding: 8px 12px;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 10px;
    background: transparent;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
    cursor: pointer;
    margin: 0;
    opacity: 0;
    transform: translateY(-10px);
    animation: cascadeIn 0.4s ease-out forwards;
  }
  & > span:nth-child(1) { animation-delay: 0.05s; }
  & > span:nth-child(2) { animation-delay: 0.1s; }
  & > span:nth-child(3) { animation-delay: 0.15s; }
  & > span:nth-child(4) { animation-delay: 0.2s; }
  & > span:nth-child(5) { animation-delay: 0.25s; }
  & > span:nth-child(6) { animation-delay: 0.3s; }
  & > span:nth-child(7) { animation-delay: 0.35s; }
  & > span:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }
  @keyframes cascadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (max-width: 1024px) {
    max-width: 480px;
  }
  @media (max-width: 640px) {
    max-width: none;
  }
`;

const CardanoWalletConnector = forwardRef<
  WalletConnectorRef,
  CardanoWalletConnectorProps
>(
  (
    {
      variant = 'default',
      showTitle = false,
      showDescription = false,
      listLayout = 'dropdown',
      initiallyOpen = false,
      networkType = NetworkType.TESTNET,
      supportedWallets = DEFAULT_SUPPORTED_WALLETS,
      onConnect,
      onDisconnect,
      showError = (msg) => console.error(msg),
      navigateOnConnect,
    },
    ref
  ) => {
    const {
      walletApi,
      walletName,
      stakeAddress,
      setConnection,
      setIsConnecting,
      setError,
      resetWallet,
    } = useWalletState();
    const [showWalletList, setShowWalletList] = useState(initiallyOpen);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isConnecting, setIsConnectingLocal] = useState(false);
    const [pendingWallet, setPendingWallet] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lastErrorRef = useRef<{ message: string; timestamp: number } | null>(
      null
    );
    const isDropdownLayout = listLayout === 'dropdown';
    const flexContainerBaseClasses =
      'relative mx-auto flex w-full max-w-[600px] flex-col min-h-[150px]';

    const synchronizeConnectingState = (state: boolean) => {
      setIsConnectingLocal(state);
      setIsConnecting(state);
    };

    useImperativeHandle(ref, () => ({
      disconnect: handleDisconnect,
      getWalletState: () => ({
        isConnected: Boolean(walletApi),
        walletName,
        walletApi,
        stakeAddress,
      }),
      isConnected: () => Boolean(walletApi),
    }));

    const showErrorOnce = (message: string) => {
      const now = Date.now();
      const lastError = lastErrorRef.current;
      if (
        !lastError ||
        lastError.message !== message ||
        now - lastError.timestamp > 1_000
      ) {
        showError(message);
        lastErrorRef.current = { message, timestamp: now };
      }
    };

    const openWalletList = () => {
      setConnectionError(null);
      setPendingWallet(null);
      if (isDropdownLayout) {
        setShowWalletList((prev) => !prev);
      } else {
        setShowWalletList(true);
      }
    };

    const closeWalletList = () => {
      if (isConnecting) return;
      setShowWalletList(false);
      setConnectionError(null);
      setPendingWallet(null);
    };

    const handleSuccessfulConnect = async (
      connectedWalletName: string,
      connectedWalletApi: CardanoWalletApi,
      rewardAddress: string | null
    ) => {
      const normalizedReward = rewardAddress
        ? rewardAddressToBech32(rewardAddress)
        : null;
      const signingAddress = await connectedWalletApi
        .getChangeAddress()
        .catch(() => null);

      const networkId = await connectedWalletApi
        .getNetworkId()
        .catch(() => null);

      setConnection({
        walletApi: connectedWalletApi,
        walletName: connectedWalletName,
        stakeAddress: normalizedReward,
        signingAddress,
        networkId,
      });

      setConnectionError(null);
      setShowWalletList(false);
      if (onConnect) {
        onConnect(connectedWalletName, connectedWalletApi, normalizedReward);
      } else if (navigateOnConnect) {
        navigateOnConnect('/account');
      }
    };

    const handleDisconnect = () => {
      resetWallet();
      setConnectionError(null);
      setPendingWallet(null);
      setShowWalletList(isDropdownLayout ? false : true);
      if (onDisconnect) {
        onDisconnect();
      }
    };

    const onConnectWallet = async (walletKey: string) => {
      synchronizeConnectingState(true);
      setConnectionError(null);
      setPendingWallet(walletKey);
      try {
        if (!window.cardano || !window.cardano[walletKey]) {
          showErrorOnce(
            `${walletKey} wallet is not installed. Please install it from the official website.`
          );
          return;
        }

        const wallet = await window.cardano[walletKey].enable();
        const walletNetworkId = await wallet.getNetworkId();
        const expectedNetworkId = networkType === NetworkType.MAINNET ? 1 : 0;

        if (walletNetworkId !== expectedNetworkId) {
          const expectedNetwork =
            networkType === NetworkType.MAINNET ? 'Mainnet' : 'Testnet';
          showErrorOnce(
            `Network mismatch: This app requires ${expectedNetwork}. Please switch your wallet network.`
          );
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        let stakeAddresses: string[] = [];
        let retries = 3;

        while (retries > 0) {
          try {
            stakeAddresses = await wallet.getRewardAddresses();
            break;
          } catch (error) {
            retries -= 1;
            const message =
              error instanceof Error ? error.message : String(error);
            if (
              message.includes('account changed') ||
              message.includes('Account changed')
            ) {
              if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
              }
              const refreshedWallet = await window.cardano[walletKey].enable();
              await new Promise((resolve) => setTimeout(resolve, 200));
              stakeAddresses = await refreshedWallet.getRewardAddresses();
              break;
            } else {
              throw error;
            }
          }
        }

        const rewardAddress = stakeAddresses?.[0] ?? null;
        await handleSuccessfulConnect(walletKey, wallet, rewardAddress);
      } catch (error) {
        console.error(`Error connecting to ${walletKey}:`, error);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        setConnectionError(`Error connecting to ${walletKey}: ${message}`);
        setError(`Wallet error: ${message}`);
      } finally {
        synchronizeConnectingState(false);
        setPendingWallet(null);
      }
    };

    const onConnectError = (walletKey: string, error: Error) => {
      console.error(`ConnectWalletList error for ${walletKey}:`, error);
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes('not installed') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('no wallet')
      ) {
        showErrorOnce(
          `${walletKey} wallet is not installed. Please install it from the official website.`
        );
      } else if (
        errorMessage.includes('wrong network') ||
        errorMessage.includes('network type') ||
        errorMessage.includes('mainnet') ||
        errorMessage.includes('testnet')
      ) {
        const expectedNetwork =
          networkType === NetworkType.MAINNET ? 'Mainnet' : 'Testnet';
        const message = `Network mismatch: This app requires ${expectedNetwork}. Please switch your wallet to ${expectedNetwork} and try again.`;
        showErrorOnce(message);
        setConnectionError(message);
      } else {
        showErrorOnce(`Error connecting to ${walletKey}: ${error.message}`);
        setConnectionError(`Error with ${walletKey}: ${error.message}`);
      }
      synchronizeConnectingState(false);
      setPendingWallet(null);
    };

    useEffect(() => {
      if (!isDropdownLayout) return;
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setShowWalletList(false);
          setConnectionError(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isDropdownLayout]);

    const renderConnectionFeedback = (
      errorClasses = 'mb-3 rounded-md border border-red-400 bg-red-500/10 px-4 py-2 text-sm text-red-200',
      statusClasses = 'mb-2 text-sm text-white/80'
    ) => (
      <>
        {connectionError && <div className={errorClasses}>{connectionError}</div>}
        {isConnecting && pendingWallet && (
          <p className={`${statusClasses} animate-pulse`}>
            Connecting to {pendingWallet}...
          </p>
        )}
      </>
    );

    const renderWalletList = () => (
      <ConnectWalletList
        borderRadius={15}
        gap={12}
        primaryColor="#000000"
        onConnect={onConnectWallet}
        onConnectError={onConnectError}
        supportedWallets={supportedWallets}
        showUnavailableWallets={0}
        peerConnectEnabled={false}
        limitNetwork={networkType}
        customCSS={
          isDropdownLayout ? DROPDOWN_WALLET_LIST_CSS : FLEX_WALLET_LIST_CSS
        }
      />
    );

    if (walletApi) {
      return (
        <div className="flex items-center space-x-4">
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2.5 rounded-md border border-white/20 px-6 py-2.5 font-medium text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10"
          >
            Disconnect
          </button>
        </div>
      );
    }

    const buttonClasses =
      variant === 'white'
        ? 'flex py-3 px-8 justify-center items-center gap-2.5 rounded-md bg-white text-black font-medium cursor-pointer text-lg md:text-base hover:bg-gray-100 transition-all'
        : 'flex py-2.5 px-10 justify-center items-center gap-2.5 self-stretch rounded-md border border-white/20 backdrop-blur-sm text-white font-medium z-40 cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all';

    if (showTitle || showDescription) {
      return (
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center">
          <div className="w-full rounded-3xl border-2 border-white p-8 md:p-12">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex-1">
                {showTitle && (
                  <h1 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                    Connect Your Wallet to Begin
                  </h1>
                )}
              </div>
            </div>
            {showDescription && (
              <p className="mb-8 text-base font-light leading-relaxed text-white md:text-lg">
                Connect your Cardano wallet to get started.
              </p>
            )}
            <div className="relative" ref={dropdownRef}>
              {isDropdownLayout ? (
                <>
                  <button
                    onClick={openWalletList}
                    className={`rounded-lg bg-white px-8 py-3 text-lg font-medium text-black transition-all hover:bg-gray-100 ${isConnecting ? 'animate-pulse' : ''}`}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                  {showWalletList && (
                    <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] backdrop-blur-sm p-4">
                      {renderConnectionFeedback()}
                      {renderWalletList()}
                    </div>
                  )}
                </>
              ) : !showWalletList ? (
                <div className={`${flexContainerBaseClasses} items-start`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      ₳
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-medium text-white">
                        Connect Wallet
                      </h3>
                      <p className="text-sm text-white/70 md:text-base">
                        Connect your Cardano wallet
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={openWalletList}
                    className={`rounded-lg bg-white px-8 py-3 text-lg font-medium text-black transition-all hover:bg-gray-100 ${isConnecting ? 'animate-pulse' : ''}`}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              ) : (
                <div
                  className={`${flexContainerBaseClasses} items-center justify-start`}
                >
                  {renderConnectionFeedback(
                    'rounded-md border border-red-400 bg-red-500/10 px-4 py-2 text-sm text-red-200 max-w-[540px] w-full',
                    'text-sm text-white/80'
                  )}
                  {renderWalletList()}
                  <button
                    type="button"
                    onClick={closeWalletList}
                    disabled={isConnecting}
                    className="absolute bottom-0 right-0 z-50 mt-auto rounded px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:text-white/40"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isDropdownLayout) {
      return (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={openWalletList}
            className={`${buttonClasses} ${isConnecting ? 'animate-pulse' : ''}`}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {showWalletList && (
            <div className="absolute left-0 right-0 top-full z-50 pt-3 animate-in slide-in-from-top-2 duration-300">
              {renderWalletList()}
            </div>
          )}
        </div>
      );
    }

    return showWalletList ? (
      <div
        className={`${flexContainerBaseClasses} items-center justify-start gap-3`}
        ref={dropdownRef}
      >
        {renderWalletList()}
        <button
          type="button"
          onClick={closeWalletList}
          disabled={isConnecting}
          className="absolute bottom-0 right-0 z-50 rounded px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:text-white/40"
        >
          Close
        </button>
      </div>
    ) : (
      <div
        className={`${flexContainerBaseClasses} items-start justify-between`}
        ref={dropdownRef}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white">
            ₳
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-medium text-white">Connect Wallet</h3>
            <p className="text-sm text-white/70 md:text-base">
              Connect your Cardano wallet
            </p>
          </div>
        </div>
        <button
          onClick={openWalletList}
          className={`${buttonClasses} ${isConnecting ? 'animate-pulse' : ''}`}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }
);

CardanoWalletConnector.displayName = 'CardanoWalletConnector';

declare global {
  interface Window {
    cardano?: {
      [key: string]: {
        enable: () => Promise<CardanoWalletApi>;
        isEnabled: () => Promise<boolean>;
        name: string;
        icon: string;
        apiVersion: string;
      };
    };
  }
}

export default CardanoWalletConnector;

