import type {
  Currency,
  GeneratedBatch,
  NearIntentTransfer,
  Payment,
  PayrollSettings,
  PayoutRail,
  RawPayment,
} from "@/types/payroll";

const USD_PER_ZEC = 50;
const DAYS_PER_PAYOUT = 14;

function parseCurrency(value: string | undefined): Currency {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "USD" || normalized === "USDC") {
    return normalized;
  }
  return "ZEC";
}

function parseRail(value: string | undefined): PayoutRail {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "USDC" || normalized === "USDC_NEAR" || normalized === "USDC_NEAR_INTENT") {
    return "USDC_NEAR_INTENT";
  }
  return "ZEC";
}

function parseRequiredFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function parseRawPayment(row: RawPayment, index: number): Payment {
  const amountValue = Number(row.amount ?? "");
  const payoutRail = parseRail(row.payout_rail ?? row.payoutRail);

  return {
    id: `row-${index + 1}`,
    name: row.name?.trim() ?? "",
    wallet: row.wallet?.trim() ?? "",
    amount: Number.isFinite(amountValue) ? amountValue : 0,
    currency: parseCurrency(row.currency),
    payoutRail,
    testTxRequired: parseRequiredFlag(row.test_tx_required ?? row.testTxRequired),
    testTxDone: false,
  };
}

export function convertToZec(amount: number, currency: Currency): number {
  if (currency === "ZEC") {
    return amount;
  }
  return amount / USD_PER_ZEC;
}

export function convertToUsd(amount: number, currency: Currency): number {
  if (currency === "ZEC") {
    return amount * USD_PER_ZEC;
  }
  return amount;
}

export function calculateTotalZec(payments: Payment[]): number {
  return payments
    .filter((payment) => payment.payoutRail === "ZEC")
    .reduce((sum, payment) => sum + convertToZec(payment.amount, payment.currency), 0);
}

export function validatePayments(payments: Payment[]): string[] {
  return payments
    .map((payment, index) => {
      if (!payment.name) {
        return `Row ${index + 1}: name is required.`;
      }

      if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
        return `Row ${index + 1}: amount must be greater than 0.`;
      }

      if (
        payment.payoutRail === "ZEC" &&
        !(payment.wallet.startsWith("zs") || payment.wallet.startsWith("u"))
      ) {
        return `Row ${index + 1}: wallet must start with \"zs\" (shielded) or \"u\" (unified) for ZEC payouts.`;
      }

      if (payment.payoutRail === "USDC_NEAR_INTENT" && payment.wallet.length < 2) {
        return `Row ${index + 1}: NEAR recipient/account is required for USDC payouts.`;
      }

      return null;
    })
    .filter((error): error is string => error !== null);
}

export function hasPendingTestTransactions(payments: Payment[]): boolean {
  return payments.some((payment) => payment.testTxRequired && !payment.testTxDone);
}

export function nextBiweeklyDate(anchorDate: string, referenceDate = new Date()): string {
  if (!anchorDate) {
    return "";
  }

  const anchor = new Date(`${anchorDate}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) {
    return "";
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  if (today <= anchor) {
    return anchorDate;
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor((today.getTime() - anchor.getTime()) / msInDay);
  const periodsElapsed = Math.floor(elapsedDays / DAYS_PER_PAYOUT) + 1;

  const next = new Date(anchor);
  next.setDate(anchor.getDate() + periodsElapsed * DAYS_PER_PAYOUT);
  return next.toISOString().slice(0, 10);
}

export function isNotificationDue(nextPayoutDate: string, referenceDate = new Date()): boolean {
  if (!nextPayoutDate) {
    return false;
  }
  const payoutDay = new Date(`${nextPayoutDate}T00:00:00`);
  if (Number.isNaN(payoutDay.getTime())) {
    return false;
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return today >= payoutDay;
}

export function buildNearIntentTransfers(payments: Payment[]): NearIntentTransfer[] {
  return payments
    .filter((payment) => payment.payoutRail === "USDC_NEAR_INTENT")
    .map((payment) => ({
      recipient: payment.wallet,
      amountUsdc: Number(convertToUsd(payment.amount, payment.currency).toFixed(2)),
      note: `Payroll ${payment.name}`,
    }));
}

export function generateZip321(payments: Payment[]): string {
  const params = payments
    .filter((payment) => payment.payoutRail === "ZEC")
    .map((payment) => {
      const zecAmount = convertToZec(payment.amount, payment.currency);
      const memo = `Payroll ${payment.name}`;
      return `address=${encodeURIComponent(payment.wallet)}&amount=${zecAmount.toFixed(8)}&memo=${encodeURIComponent(memo)}`;
    })
    .join("&");

  if (!params) {
    return "";
  }

  return `zcash:?${params}`;
}

export function generateBatch(payments: Payment[], settings: PayrollSettings): GeneratedBatch {
  const nearTransfers = buildNearIntentTransfers(payments);
  const nearIntentJson = JSON.stringify({ chain: "near", asset: "USDC", transfers: nearTransfers }, null, 2);
  const nearIntentUri = `zodl://near-intent?payload=${encodeURIComponent(nearIntentJson)}`;
  const nextPayoutDate = nextBiweeklyDate(settings.biweeklyAnchorDate);

  return {
    zcashUri: generateZip321(payments),
    nearIntentJson,
    nearIntentUri,
    totalZec: calculateTotalZec(payments),
    zecRecipients: payments.filter((payment) => payment.payoutRail === "ZEC").length,
    usdcRecipients: nearTransfers.length,
    nextPayoutDate,
    notificationDue: isNotificationDue(nextPayoutDate),
  };
}

export function maskAddress(address: string): string {
  if (!address) {
    return "";
  }
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function maskZip321Uri(uri: string): string {
  if (!uri) {
    return "";
  }

  return uri.replace(/address=([^&]+)/g, (_match, encodedAddress: string) => {
    const decoded = decodeURIComponent(encodedAddress);
    return `address=${encodeURIComponent(maskAddress(decoded))}`;
  });
}
