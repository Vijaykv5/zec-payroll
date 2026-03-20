import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Currency, Payment } from "@/types/payroll";
import { PrimaryButton, SecondaryButton } from "./ui";

function maskAddress(address: string): string {
  if (address.length <= 8) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function UploadStep({
  fileName,
  payments,
  parseError,
  canContinue,
  onUpload,
  onLoadSample,
  onAddManualEmployee,
  onRemoveEmployee,
  onBack,
  onContinue,
}: {
  fileName: string;
  payments: Payment[];
  parseError: string;
  canContinue: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSample: () => void;
  onAddManualEmployee: (input: { name: string; wallet: string; amount: number; currency: Currency }) => boolean;
  onRemoveEmployee: (paymentId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [entryMode, setEntryMode] = useState<"manual" | "csv">("csv");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ZEC");

  function resetManualForm() {
    setName("");
    setWallet("");
    setAmount("");
    setCurrency("ZEC");
  }

  function handleAddEmployee() {
    const created = onAddManualEmployee({
      name,
      wallet,
      amount: Number(amount),
      currency,
    });
    if (created) {
      resetManualForm();
    }
  }

  return (
    <section className="w-full space-y-3 transition-all duration-200">
      <div className="soft-panel rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEntryMode("manual")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              entryMode === "manual"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-1)]"
            }`}
          >
            Add employee
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("csv")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              entryMode === "csv"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink-1)]"
            }`}
          >
            Import CSV
          </button>
        </div>

        {entryMode === "manual" ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--ink-0)]">Add Employee Manually</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-[var(--ink-1)]">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alice"
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink-0)]"
                />
              </label>
              <label className="space-y-1 text-sm text-[var(--ink-1)]">
                Address
                <input
                  value={wallet}
                  onChange={(event) => setWallet(event.target.value)}
                  placeholder="zs1... or u1..."
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 font-mono text-[var(--ink-0)]"
                />
              </label>
              <label className="space-y-1 text-sm text-[var(--ink-1)]">
                Amount
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.00000001"
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink-0)]"
                />
              </label>
              <label className="space-y-1 text-sm text-[var(--ink-1)]">
                Currency
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as Currency)}
                  className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink-0)]"
                >
                  <option value="ZEC">ZEC</option>
                  <option value="USD">USD</option>
                  <option value="USDC">USDC</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-[var(--ink-2)]">
              Mainnet shielded Zcash addresses only for ZEC rails. Transparent and testnet addresses are rejected.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddEmployee}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Add employee
              </button>
              <button
                type="button"
                onClick={resetManualForm}
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-1)]"
              >
                Cancel
              </button>
            </div>

            {payments.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm">
                <div className="grid grid-cols-[1fr_2fr_auto_auto] border-b border-[var(--line)] bg-[#f7faf5] px-3 py-2 text-sm font-semibold text-[var(--ink-1)]">
                  <p>Name</p>
                  <p>Address</p>
                  <p>Amount</p>
                  <p className="text-right">Action</p>
                </div>
                <div className="divide-y divide-[#eef3ec]">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="grid grid-cols-[1fr_2fr_auto_auto] items-center px-3 py-2 text-sm text-[var(--ink-1)] transition-colors hover:bg-[#f9fcf7]"
                    >
                      <p className="truncate pr-2">{payment.name}</p>
                      <p className="truncate pr-2 font-mono text-xs">{maskAddress(payment.wallet)}</p>
                      <p className="whitespace-nowrap font-semibold">
                        {payment.amount} {payment.currency}
                      </p>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => onRemoveEmployee(payment.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-[var(--ink-0)]">Import Payroll CSV</h2>
            <p className="mt-1 text-sm text-[var(--ink-2)]">
              Required: <span className="font-mono">name,wallet,amount,currency</span>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              Optional: <span className="font-mono">payout_rail,test_tx_required</span> where payout_rail can be ZEC or
              USDC_NEAR_INTENT.
            </p>

            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line)] bg-white px-3 py-7 text-center transition-all duration-200 hover:border-[var(--ink-2)]">
              <span className="text-xs text-[var(--ink-2)]">Choose a .csv file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onUpload}
                className="w-full max-w-[240px] text-xs text-[var(--ink-2)] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
            </label>
            <div className="mt-2">
              <button
                type="button"
                onClick={onLoadSample}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink-1)] transition-colors hover:bg-[#f7faf5]"
              >
                Load Sample CSV
              </button>
            </div>
          </>
        )}

        {fileName && <p className="mt-3 text-sm text-[var(--ink-1)]">File: {fileName}</p>}
        {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
      </div>

      <div className="flex gap-3">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onContinue} disabled={!canContinue}>
          Continue
        </PrimaryButton>
      </div>
    </section>
  );
}
