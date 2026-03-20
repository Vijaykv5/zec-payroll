import type { Payment, PayrollSettings } from "@/types/payroll";
import { calculateTotalZec, convertToUsd, convertToZec, maskAddress, nextBiweeklyDate } from "@/utils/payroll";
import { PrimaryButton, SecondaryButton, SummaryCard } from "./ui";

export function PreviewStep({
  payments,
  settings,
  errors,
  pendingTests,
  generationError,
  encryptedBatches,
  isSaving,
  onBack,
  onGenerate,
  onUpdateSettings,
  onToggleTestTx,
}: {
  payments: Payment[];
  settings: PayrollSettings;
  errors: string[];
  pendingTests: boolean;
  generationError: string;
  encryptedBatches: number;
  isSaving: boolean;
  onBack: () => void;
  onGenerate: () => void;
  onUpdateSettings: (next: PayrollSettings) => void;
  onToggleTestTx: (paymentId: string, checked: boolean) => void;
}) {
  const totalZec = calculateTotalZec(payments);
  const nextPayoutDate = nextBiweeklyDate(settings.biweeklyAnchorDate);

  return (
    <section className="w-full space-y-3 transition-all duration-200">
      <div className="soft-panel rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-[var(--ink-0)]">Payroll Preview</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
          <SummaryCard label="Total ZEC" value={`${totalZec.toFixed(8)} ZEC`} />
          <SummaryCard label="Recipients" value={payments.length} />
          <SummaryCard label="Encrypted Batches" value={encryptedBatches} />
          <SummaryCard label="Next Payout" value={nextPayoutDate || "-"} />
        </div>
      </div>

      <div className="soft-panel rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[var(--ink-0)]">Admin Settings</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-[var(--ink-2)]">
            Biweekly anchor date
            <input
              type="date"
              value={settings.biweeklyAnchorDate}
              onChange={(event) =>
                onUpdateSettings({
                  ...settings,
                  biweeklyAnchorDate: event.target.value,
                })
              }
              className="w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs text-[var(--ink-0)]"
            />
          </label>

          <label className="space-y-1 text-xs text-[var(--ink-2)]">
            Test tx amount (ZEC)
            <input
              type="number"
              min="0"
              step="0.00000001"
              value={settings.testTxAmountZec}
              onChange={(event) =>
                onUpdateSettings({
                  ...settings,
                  testTxAmountZec: Number(event.target.value),
                })
              }
              className="w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs text-[var(--ink-0)]"
            />
          </label>
        </div>

        <div className="mt-2 rounded-lg border border-[var(--line)] bg-[#f7faf5] p-2 text-xs text-[var(--ink-1)]">
          Vault unlocked. This browser passphrase will be used for encryption.
        </div>

        <p className="mt-1 text-xs text-[var(--ink-2)]">
          Every row with test transactions enabled must be marked done before full payout batch generation.
        </p>
      </div>

      <div className="soft-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#edf3ea] text-[var(--ink-2)]">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Recipient</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Rail</th>
                <th className="px-3 py-2 font-medium">Converted</th>
                <th className="px-3 py-2 font-medium">Test Tx Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4ebe1] bg-white/80">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-3 py-2 text-[var(--ink-0)]">{payment.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--ink-1)]">{maskAddress(payment.wallet)}</td>
                  <td className="px-3 py-2 text-[var(--ink-1)]">
                    {payment.amount} {payment.currency}
                  </td>
                  <td className="px-3 py-2 text-[var(--ink-1)]">{payment.payoutRail}</td>
                  <td className="px-3 py-2 text-[var(--ink-0)]">
                    {payment.payoutRail === "ZEC"
                      ? `${convertToZec(payment.amount, payment.currency).toFixed(8)} ZEC`
                      : `${convertToUsd(payment.amount, payment.currency).toFixed(2)} USDC`}
                  </td>
                  <td className="px-3 py-2 text-[var(--ink-1)]">
                    {payment.testTxRequired ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={payment.testTxDone}
                          onChange={(event) => onToggleTestTx(payment.id, event.target.checked)}
                        />
                        done
                      </label>
                    ) : (
                      <span className="text-xs text-[var(--ink-2)]">not required</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-2.5">
          {errors.map((error) => (
            <p key={error} className="text-xs text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}

      {pendingTests && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5">
          <p className="text-xs text-amber-700">Some test transactions are still pending.</p>
        </div>
      )}

      {generationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5">
          <p className="text-xs text-red-600">{generationError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onGenerate} disabled={payments.length === 0 || errors.length > 0 || isSaving}>
          {isSaving ? "Encrypting & Saving..." : "Generate Batch"}
        </PrimaryButton>
      </div>
    </section>
  );
}
