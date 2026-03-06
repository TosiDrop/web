export interface ClaimValidateRequest {
  stakeAddress: string;
  assets: string[];
}

export interface ClaimValidateResponse {
  valid: boolean;
  transactionCount: number;
  airdropHash: string;
  error?: string;
}

export interface ClaimSubmitRequest {
  stakeAddress: string;
  assets: string[];
  airdropHash: string;
}

export interface ClaimSubmitResponse {
  unsignedTx: string;
  airdropHash: string;
  transactionType: string;
}

export interface ClaimSubmitTxRequest {
  signedTx: string;
  airdropHash: string;
}

export interface ClaimSubmitTxResponse {
  txHash: string;
}

export interface ClaimStatus {
  hash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionCount: number;
  completedTransactions: number;
  error?: string;
}

export type ClaimFlowStep =
  | { step: 'idle' }
  | { step: 'validating' }
  | { step: 'signing'; unsignedTx: string }
  | { step: 'submitting' }
  | { step: 'polling'; txHash: string; airdropHash: string }
  | { step: 'completed'; txHash: string }
  | { step: 'error'; message: string };
