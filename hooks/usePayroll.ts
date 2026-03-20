import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Papa from "papaparse";
import type {
  CopyState,
  Currency,
  EncryptedBatchRecord,
  EncryptedPayload,
  GeneratedBatch,
  Payment,
  PayrollSettings,
  RawPayment,
  Step,
} from "@/types/payroll";
import { decryptJson, encryptJson } from "@/utils/crypto";
import {
  convertToZec,
  generateBatch,
  hasPendingTestTransactions,
  parseRawPayment,
  validatePayments,
} from "@/utils/payroll";

const DEFAULT_SETTINGS: PayrollSettings = {
  biweeklyAnchorDate: new Date().toISOString().slice(0, 10),
  testTxAmountZec: 0.0001,
};

const PAYOUT_STATUS_STORAGE_KEY = "zecpayroll:payout-status:v1";
const LOCAL_VAULT_KEY = "zecpayroll:vault:v1";

type PaidStatusMap = Record<string, { txid: string; paidAt: string }>;

function readPaidStatusMap(): PaidStatusMap {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(PAYOUT_STATUS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as PaidStatusMap;
  } catch {
    return {};
  }
}

function writePaidStatusMap(map: PaidStatusMap) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(PAYOUT_STATUS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors in demo mode.
  }
}

function applyPaidStatus(records: EncryptedBatchRecord[]): EncryptedBatchRecord[] {
  const paidMap = readPaidStatusMap();
  return records.map((record) => {
    const paidStatus = paidMap[record.id];
    if (!paidStatus) {
      return {
        ...record,
        payoutStatus: "pending",
      };
    }
    return {
      ...record,
      payoutStatus: "paid",
      txid: paidStatus.txid,
      paidAt: paidStatus.paidAt,
    };
  });
}

function hasLocalVault(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(window.localStorage.getItem(LOCAL_VAULT_KEY));
}

function readLocalVault(): EncryptedPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_VAULT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<EncryptedPayload>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (
      typeof parsed.ciphertext !== "string" ||
      typeof parsed.iv !== "string" ||
      typeof parsed.salt !== "string" ||
      parsed.algorithm !== "AES-GCM" ||
      parsed.kdf !== "PBKDF2"
    ) {
      return null;
    }
    return parsed as EncryptedPayload;
  } catch {
    return null;
  }
}

export function usePayroll() {
  const [step, setStep] = useState<Step>("landing");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [batch, setBatch] = useState<GeneratedBatch | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [copyZipState, setCopyZipState] = useState<CopyState>("idle");
  const [copyNearState, setCopyNearState] = useState<CopyState>("idle");
  const [settings, setSettings] = useState<PayrollSettings>(DEFAULT_SETTINGS);
  const [passphrase, setPassphrase] = useState("");
  const [savedRecords, setSavedRecords] = useState<EncryptedBatchRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeRecordId, setActiveRecordId] = useState("");
  const [paidTxid, setPaidTxid] = useState("");
  const [markPaidError, setMarkPaidError] = useState("");
  const [markPaidSuccess, setMarkPaidSuccess] = useState("");
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultMode, setVaultMode] = useState<"create" | "unlock">("create");
  const [vaultError, setVaultError] = useState("");

  const validationErrors = useMemo(() => validatePayments(payments), [payments]);
  const pendingTests = useMemo(() => hasPendingTestTransactions(payments), [payments]);

  useEffect(() => {
    void fetchSavedRecords();
  }, []);

  useEffect(() => {
    setVaultMode(hasLocalVault() ? "unlock" : "create");
  }, []);

  useEffect(() => {
    const current = savedRecords.find((record) => record.id === activeRecordId);
    if (!current) {
      return;
    }
    setPaidTxid(current.txid ?? "");
  }, [activeRecordId, savedRecords]);

  async function fetchSavedRecords() {
    try {
      const response = await fetch("/api/batches");
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { records?: EncryptedBatchRecord[] };
      const records = applyPaidStatus(payload.records ?? []);
      setSavedRecords(records);
      if (records.length > 0) {
        setActiveRecordId((current) => current || records[0].id);
      }
    } catch {
      // Ignore fetch errors in demo mode.
    }
  }

  function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    resetUploadState(file.name);

    Papa.parse<RawPayment>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        applyParsedRows(result.data);
      },
      error: () => {
        setParseError("Failed to parse CSV file.");
        setPayments([]);
      },
    });
  }

  async function handleLoadSampleCsv() {
    resetUploadState("sample_payroll.csv");

    try {
      const response = await fetch("/sample_payroll.csv", { cache: "no-store" });
      if (!response.ok) {
        setParseError("Could not load sample CSV.");
        setPayments([]);
        return;
      }

      const csvText = await response.text();
      Papa.parse<RawPayment>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          applyParsedRows(result.data);
        },
        error: () => {
          setParseError("Failed to parse sample CSV.");
          setPayments([]);
        },
      });
    } catch {
      setParseError("Could not load sample CSV.");
      setPayments([]);
    }
  }

  function resetUploadState(nextFileName: string) {
    setFileName(nextFileName);
    setParseError("");
    setGenerationError("");
    setCopyZipState("idle");
    setCopyNearState("idle");
    setMarkPaidError("");
    setMarkPaidSuccess("");
  }

  function handleStartPayroll() {
    setVaultError("");
    setVaultMode(hasLocalVault() ? "unlock" : "create");
    setVaultModalOpen(true);
  }

  function closeVaultModal() {
    setVaultError("");
    setVaultModalOpen(false);
  }

  async function createVault(passphraseValue: string, confirmPassphrase: string) {
    setVaultError("");

    if (!passphraseValue || passphraseValue.length < 8) {
      setVaultError("Passphrase must be at least 8 characters.");
      return;
    }

    if (passphraseValue !== confirmPassphrase) {
      setVaultError("Passphrase confirmation does not match.");
      return;
    }

    try {
      const payload = await encryptJson(
        {
          scope: "payroll-vault",
          createdAt: new Date().toISOString(),
        },
        passphraseValue,
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(payload));
      }
      setPassphrase(passphraseValue);
      setVaultModalOpen(false);
      setStep("upload");
    } catch {
      setVaultError("Could not create vault in this browser.");
    }
  }

  async function unlockVault(passphraseValue: string) {
    setVaultError("");

    if (!passphraseValue) {
      setVaultError("Enter your passphrase.");
      return;
    }

    const payload = readLocalVault();
    if (!payload) {
      setVaultError("No encrypted vault found in this browser.");
      setVaultMode("create");
      return;
    }

    try {
      const decoded = await decryptJson<{ scope?: string }>(payload, passphraseValue);
      if (decoded.scope !== "payroll-vault") {
        setVaultError("Vault format is invalid.");
        return;
      }

      let openedExistingBatch = false;
      try {
        const response = await fetch("/api/batches", { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as { records?: EncryptedBatchRecord[] };
          const records = applyPaidStatus(payload.records ?? []);
          setSavedRecords(records);
          if (records.length > 0) {
            const latest = records[0];
            const restored = await decryptJson<{
              settings?: PayrollSettings;
              payments?: Payment[];
              batch?: GeneratedBatch;
            }>(latest.encrypted, passphraseValue);

            if (restored.settings && Array.isArray(restored.payments) && restored.batch) {
              setSettings(restored.settings);
              setPayments(restored.payments);
              setBatch(restored.batch);
              setActiveRecordId(latest.id);
              setStep("result");
              openedExistingBatch = true;
            }
          }
        }
      } catch {
        // If restore fails, continue to normal upload flow.
      }

      setPassphrase(passphraseValue);
      setVaultModalOpen(false);
      if (!openedExistingBatch) {
        setStep("upload");
      }
    } catch {
      setVaultError("Incorrect passphrase.");
    }
  }

  function forgotPassphrase() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOCAL_VAULT_KEY);
    }
    setPassphrase("");
    setVaultError("");
    setVaultMode("create");
  }

  function applyParsedRows(data: RawPayment[]) {
    const parsedPayments = data
      .map((row, index) => parseRawPayment(row, index))
      .filter((row) => row.name || row.wallet || row.amount > 0);

    if (parsedPayments.length === 0) {
      setParseError(
        "No valid rows found. Expected headers: name, wallet, amount, currency, payout_rail, test_tx_required.",
      );
      setPayments([]);
      return;
    }

    setPayments(parsedPayments);
  }

  function addManualEmployee(input: {
    name: string;
    wallet: string;
    amount: number;
    currency: Currency;
  }): boolean {
    const name = input.name.trim();
    const wallet = input.wallet.trim();
    const amount = Number(input.amount);

    if (!name) {
      setParseError("Employee name is required.");
      return false;
    }
    if (!wallet) {
      setParseError("Recipient address is required.");
      return false;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setParseError("Amount must be greater than 0.");
      return false;
    }

    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `manual-${Date.now()}`;
    const payoutRail = input.currency === "USDC" ? "USDC_NEAR_INTENT" : "ZEC";

    const nextPayment: Payment = {
      id,
      name,
      wallet,
      amount,
      currency: input.currency,
      payoutRail,
      testTxRequired: true,
      testTxDone: false,
    };

    setPayments((current) => [...current, nextPayment]);
    setParseError("");
    return true;
  }

  function setTestTxDone(paymentId: string, done: boolean) {
    setPayments((current) =>
      current.map((payment) => {
        if (payment.id !== paymentId) {
          return payment;
        }
        return {
          ...payment,
          testTxDone: done,
        };
      }),
    );
  }

  function removeEmployee(paymentId: string) {
    setPayments((current) => current.filter((payment) => payment.id !== paymentId));
  }

  async function handleGeneratePayroll() {
    setGenerationError("");

    if (validationErrors.length > 0) {
      setGenerationError("Fix validation errors before generating the payroll batch.");
      return;
    }

    if (pendingTests) {
      setGenerationError("Mark all required test transactions as completed before generating the full payout batch.");
      return;
    }

    if (!passphrase || passphrase.length < 8) {
      setGenerationError("Set an encryption passphrase with at least 8 characters.");
      return;
    }

    const generatedBatch = generateBatch(payments, settings);
    if (generatedBatch.zecRecipients === 0 && generatedBatch.usdcRecipients === 0) {
      setGenerationError("No valid payouts to generate.");
      return;
    }

    const createdAt = new Date().toISOString();
    const encrypted = await encryptJson(
      {
        createdAt,
        settings,
        payments,
        batch: generatedBatch,
      },
      passphrase,
    );

    setIsSaving(true);
    try {
      const response = await fetch("/api/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encrypted,
          createdAt,
          nextPayoutDate: generatedBatch.nextPayoutDate,
          notificationDue: generatedBatch.notificationDue,
        }),
      });

      if (!response.ok) {
        setGenerationError("Failed to store encrypted batch on server.");
        return;
      }

      const payload = (await response.json()) as { record?: EncryptedBatchRecord };
      if (payload.record) {
        const enrichedRecord = applyPaidStatus([payload.record as EncryptedBatchRecord])[0];
        setSavedRecords((current) => [enrichedRecord, ...current]);
        setActiveRecordId(enrichedRecord.id);
        setPaidTxid("");
        setMarkPaidError("");
        setMarkPaidSuccess("");

        const zecItems = payments
          .filter((payment) => payment.payoutRail === "ZEC")
          .map((payment) => ({
            recipientName: payment.name,
            recipientAddress: payment.wallet,
            amountZec: convertToZec(payment.amount, payment.currency),
          }));

        if (zecItems.length > 0) {
          try {
            await fetch("/api/executions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                batchId: enrichedRecord.id,
                items: zecItems,
              }),
            });
          } catch {
            // Keep generation successful even if history logging fails.
          }
        }
      }

      setBatch(generatedBatch);
      setStep("result");
    } catch {
      setGenerationError("Failed to store encrypted batch on server.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyZipUri() {
    if (!batch?.zcashUri) {
      return;
    }

    try {
      await navigator.clipboard.writeText(batch.zcashUri);
      setCopyZipState("copied");
    } catch {
      setCopyZipState("failed");
    }
  }

  async function handleCopyNearIntent() {
    if (!batch?.nearIntentJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(batch.nearIntentJson);
      setCopyNearState("copied");
    } catch {
      setCopyNearState("failed");
    }
  }

  function selectedRecord(): EncryptedBatchRecord | null {
    if (!activeRecordId) {
      return savedRecords[0] ?? null;
    }
    return savedRecords.find((record) => record.id === activeRecordId) ?? savedRecords[0] ?? null;
  }

  function isLikelyTxid(value: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(value.trim());
  }

  function markRecordPaid() {
    setMarkPaidError("");
    setMarkPaidSuccess("");

    const target = selectedRecord();
    if (!target) {
      setMarkPaidError("No batch record available to mark as paid.");
      return;
    }

    if (!isLikelyTxid(paidTxid)) {
      setMarkPaidError("Enter a valid Zcash txid (64 hex characters).");
      return;
    }

    const normalizedTxid = paidTxid.trim().toLowerCase();
    const paidAt = new Date().toISOString();
    const currentMap = readPaidStatusMap();
    const nextMap: PaidStatusMap = {
      ...currentMap,
      [target.id]: {
        txid: normalizedTxid,
        paidAt,
      },
    };
    writePaidStatusMap(nextMap);

    setSavedRecords((current) =>
      current.map((record) =>
        record.id === target.id
          ? {
              ...record,
              payoutStatus: "paid",
              txid: normalizedTxid,
              paidAt,
            }
          : record,
      ),
    );
    setMarkPaidSuccess("Batch marked paid.");
  }

  function startNewBatch() {
    setBatch(null);
    setPayments([]);
    setFileName("");
    setParseError("");
    setGenerationError("");
    setCopyZipState("idle");
    setCopyNearState("idle");
    setMarkPaidError("");
    setMarkPaidSuccess("");
    setStep("upload");
  }

  return {
    step,
    setStep,
    payments,
    batch,
    fileName,
    parseError,
    generationError,
    copyZipState,
    copyNearState,
    settings,
    setSettings,
    savedRecords,
    isSaving,
    vaultModalOpen,
    vaultMode,
    vaultError,
    activeRecordId,
    setActiveRecordId,
    paidTxid,
    setPaidTxid,
    markPaidError,
    markPaidSuccess,
    selectedRecord: selectedRecord(),
    validationErrors,
    pendingTests,
    handleCsvUpload,
    handleLoadSampleCsv,
    addManualEmployee,
    setTestTxDone,
    removeEmployee,
    handleStartPayroll,
    closeVaultModal,
    createVault,
    unlockVault,
    forgotPassphrase,
    handleGeneratePayroll,
    handleCopyZipUri,
    handleCopyNearIntent,
    markRecordPaid,
    startNewBatch,
    resetCopyState: () => {
      setCopyZipState("idle");
      setCopyNearState("idle");
    },
  };
}
