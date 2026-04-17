export interface ClaimCreateRequest {
  stakeAddress: string;
  assetIds: string[];
  overheadFee?: number;
  unlocksSpecial?: boolean;
}

export interface DepositInfo {
  requestId: string;
  deposit: number;
  overheadFee: number;
  isWhitelisted: boolean;
  withdrawalAddress: string;
}

export type ClaimStatus =
  | { kind: 'waiting' }
  | { kind: 'processing'; txHash?: string }
  | { kind: 'success'; txHash: string }
  | { kind: 'failure'; reason: string };

export type ClaimFlowStep =
  | { step: 'idle' }
  | { step: 'creating' }
  | { step: 'awaiting_deposit'; info: DepositInfo }
  | { step: 'signing'; info: DepositInfo }
  | { step: 'polling'; info: DepositInfo; txHash?: string }
  | { step: 'success'; info: DepositInfo; txHash: string }
  | { step: 'error'; message: string };
