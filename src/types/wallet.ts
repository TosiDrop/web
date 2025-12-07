export interface CardanoWalletApi {
  getNetworkId: () => Promise<number>;
  getRewardAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getUsedAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getUtxos: () => Promise<string[] | undefined>;
  getCollateral: () => Promise<string[]>;
  getBalance: () => Promise<string>;
  signTx: (tx: string, partialSign?: boolean) => Promise<string>;
  signData: (
    address: string,
    payload: string
  ) => Promise<{ signature: string; key: string }>;
  submitTx: (tx: string) => Promise<string>;
  getExtensions: () => Promise<Extension[]>;
}

interface Extension {
  cip: number;
  [key: string]: unknown;
}

export interface WalletStateSnapshot {
  isConnected: boolean;
  walletName: string | null;
  walletApi: CardanoWalletApi | null;
  stakeAddress: string | null;
}

export interface WalletConnectorRef {
  disconnect: () => void;
  getWalletState: () => WalletStateSnapshot;
  isConnected: () => boolean;
}

