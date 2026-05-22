export interface TransferParams {
  toAddress: string;
  amount: bigint;
}

export type UnsignedTx = string;

export interface TransactionBuilder {
  buildTransfer(params: TransferParams): Promise<UnsignedTx>;
}
