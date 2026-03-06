export interface WalletState {
  connected: boolean;
  walletName: string | null;
  stakeAddress: string | null;
  changeAddress: string | null;
  networkId: number | null;
}
