export interface TransferParams {
  toAddress: string;
  amount: bigint;
}

export interface DelegationParams {
  rewardAddress: string;
  poolId: string;
  registered: boolean;
}

export type UnsignedTx = string;

export interface TransactionBuilder {
  buildTransfer(params: TransferParams): Promise<UnsignedTx>;
  buildDelegation(params: DelegationParams): Promise<UnsignedTx>;
}
