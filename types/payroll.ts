export type Step = "landing" | "upload" | "preview" | "result";

export type Currency = "ZEC" | "USD" | "USDC";
export type PayoutRail = "ZEC" | "USDC_NEAR_INTENT";

export type Payment = {
  id: string;
  name: string;
  wallet: string;
  amount: number;
  currency: Currency;
  payoutRail: PayoutRail;
  testTxRequired: boolean;
  testTxDone: boolean;
};

export type RawPayment = {
  name?: string;
  wallet?: string;
  amount?: string;
  currency?: string;
  payout_rail?: string;
  payoutRail?: string;
  test_tx_required?: string;
  testTxRequired?: string;
};

export type PayrollSettings = {
  biweeklyAnchorDate: string;
  testTxAmountZec: number;
};

export type CopyState = "idle" | "copied" | "failed";

export type NearIntentTransfer = {
  recipient: string;
  amountUsdc: number;
  note: string;
};

export type GeneratedBatch = {
  zcashUri: string;
  nearIntentJson: string;
  nearIntentUri: string;
  totalZec: number;
  zecRecipients: number;
  usdcRecipients: number;
  nextPayoutDate: string;
  notificationDue: boolean;
  notificationOverdue: boolean;
};

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: "AES-GCM";
  kdf: "PBKDF2";
};

export type EncryptedBatchRecord = {
  id: string;
  createdAt: string;
  nextPayoutDate: string;
  notificationDue: boolean;
  encrypted: EncryptedPayload;
  payoutStatus?: "pending" | "paid";
  txid?: string;
  paidAt?: string;
};

export type ExecutionStatus = "PENDING" | "PAID" | "FAILED";

export type PayoutExecution = {
  id: string;
  batchId: string;
  recipientName: string;
  recipientAddress: string;
  amountZec: number;
  status: ExecutionStatus;
  txid: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};
