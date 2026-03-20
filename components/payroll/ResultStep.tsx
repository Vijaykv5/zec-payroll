import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { CopyState, EncryptedBatchRecord, GeneratedBatch, Payment } from "@/types/payroll";
import { generateIndividualZecUris, maskZip321Uri } from "@/utils/payroll";
import { PrimaryButton, SecondaryButton, SummaryCard } from "./ui";

function CopyNotice({ state }: { state: CopyState }) {
  if (state === "copied") {
    return <p className="mt-2 text-xs text-green-700">Copied to clipboard.</p>;
  }
  if (state === "failed") {
    return <p className="mt-2 text-xs text-red-600">Could not copy.</p>;
  }
  return null;
}

export function ResultStep({
  batch,
  copyZipState,
  copyNearState,
  payments,
  records,
  activeRecordId,
  selectedRecord,
  paidTxid,
  markPaidError,
  markPaidSuccess,
  onBack,
  onCopyZip,
  onCopyNear,
  onSelectRecord,
  onPaidTxidChange,
  onMarkPaid,
  onNewBatch,
  onOpenZip,
  onOpenNear,
}: {
  batch: GeneratedBatch;
  copyZipState: CopyState;
  copyNearState: CopyState;
  payments: Payment[];
  records: EncryptedBatchRecord[];
  activeRecordId: string;
  selectedRecord: EncryptedBatchRecord | null;
  paidTxid: string;
  markPaidError: string;
  markPaidSuccess: string;
  onBack: () => void;
  onCopyZip: () => void;
  onCopyNear: () => void;
  onSelectRecord: (recordId: string) => void;
  onPaidTxidChange: (value: string) => void;
  onMarkPaid: () => void;
  onNewBatch: () => void;
  onOpenZip: () => void;
  onOpenNear: () => void;
}) {
  const [zecUriMode, setZecUriMode] = useState<"single" | "batch">("batch");
  const [zipView, setZipView] = useState<"qr" | "uri">("qr");
  const individualUris = generateIndividualZecUris(payments);
  const activeRecord = selectedRecord;
  const activeTxid = activeRecord?.txid;
  const zecExplorerLink = activeTxid ? `https://blockchair.com/zcash/transaction/${activeTxid}` : "";
  const isPending = activeRecord?.payoutStatus !== "paid";
  const isOverdue = Boolean(batch.notificationOverdue);

  return (
    <section className="w-full space-y-3 transition-all duration-200">
      <div className="soft-panel rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-[var(--ink-0)]">Batch Generated</h2>
        <p className="mt-1 text-xs text-[var(--ink-2)]">Preview and trigger payout signing in Zodl.</p>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <SummaryCard label="ZEC Recipients" value={batch.zecRecipients} />
          <SummaryCard label="USDC Recipients" value={batch.usdcRecipients} />
          <SummaryCard label="ZEC Total" value={`${batch.totalZec.toFixed(8)} ZEC`} />
          <SummaryCard label="Next Payout" value={batch.nextPayoutDate || "-"} />
        </div>

        <div className="mt-3 rounded-lg border border-[var(--line)] bg-[#f7faf5] p-2.5">
          <p className="text-xs text-[var(--ink-2)]">
            Notification status: {isOverdue ? "Overdue" : batch.notificationDue ? "Due now" : "Not due yet"}
          </p>
        </div>
        {isOverdue && isPending ? (
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
            <p className="text-xs font-semibold text-amber-800">
              Overdue: payout date has passed and this batch is still pending. Execute payment or mark it paid now.
            </p>
          </div>
        ) : null}
      </div>

      <div className="soft-panel rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink-0)]">ZIP-321 Multi-payment</h3>
          <div className="inline-flex rounded-md border border-[var(--line)] bg-[#f4f8f2] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZecUriMode("single")}
              className={`rounded px-2 py-1 ${zecUriMode === "single" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-1)]"}`}
            >
              One at a time
            </button>
            <button
              type="button"
              onClick={() => setZecUriMode("batch")}
              className={`rounded px-2 py-1 ${zecUriMode === "batch" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-1)]"}`}
            >
              Batch URIs ({batch.zecRecipients} batch)
            </button>
          </div>
        </div>

        {zecUriMode === "batch" ? (
          <>
            <div className="mt-2 flex justify-end">
              <div className="inline-flex rounded-md border border-[var(--line)] bg-[#f4f8f2] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setZipView("qr")}
                  className={`rounded px-2 py-1 ${zipView === "qr" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-1)]"}`}
                >
                  QR
                </button>
                <button
                  type="button"
                  onClick={() => setZipView("uri")}
                  className={`rounded px-2 py-1 ${zipView === "uri" ? "bg-[var(--accent)] text-white" : "text-[var(--ink-1)]"}`}
                >
                  URI
                </button>
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-[var(--line)] bg-[#f7faf5] p-3">
              {zipView === "qr" ? (
                <div className="flex flex-col items-center gap-2">
                  {batch.zcashUri ? (
                    <div className="rounded-md bg-white p-2">
                      <QRCodeSVG value={batch.zcashUri} size={208} marginSize={1} />
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--ink-2)]">QR unavailable for this batch.</p>
                  )}
                  <p className="w-full break-all font-mono text-[11px] text-[var(--ink-1)]">{maskZip321Uri(batch.zcashUri)}</p>
                </div>
              ) : (
                <textarea
                  readOnly
                  value={maskZip321Uri(batch.zcashUri)}
                  className="h-28 w-full rounded-lg border border-[var(--line)] bg-white p-2 font-mono text-xs text-[var(--ink-0)]"
                />
              )}
            </div>
            <CopyNotice state={copyZipState} />
            <div className="mt-2 flex flex-wrap gap-2">
              <PrimaryButton onClick={onCopyZip} disabled={!batch.zcashUri}>
                Copy ZIP-321
              </PrimaryButton>
            </div>
          </>
        ) : (
          <div className="mt-2 space-y-3">
            {individualUris.length === 0 ? (
              <p className="text-xs text-[var(--ink-2)]">No ZEC recipients in this batch.</p>
            ) : (
              individualUris.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-[var(--line)] bg-[#f7faf5] p-3">
                  <div className="grid gap-3 lg:grid-cols-[190px_1fr]">
                    <div className="flex items-center justify-center rounded-md bg-white p-2">
                      <QRCodeSVG value={item.uri} size={168} marginSize={1} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--ink-0)]">
                        #{index + 1} {item.name || "Recipient"}
                      </p>
                      <p className="text-xs text-[var(--ink-2)]">
                        Amount: <span className="font-semibold text-[var(--ink-1)]">{item.amountZec.toFixed(8)} ZEC</span>
                      </p>
                      <p className="text-xs text-[var(--ink-2)]">
                        Description: <span className="font-semibold text-[var(--ink-1)]">{item.description || "-"}</span>
                      </p>
                      <textarea
                        readOnly
                        value={item.uri}
                        className="h-20 w-full rounded-lg border border-[var(--line)] bg-white p-2 font-mono text-xs text-[var(--ink-0)]"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="soft-panel rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink-0)]">Payout Status</h3>
          <div className="inline-flex items-center gap-2">
            <span className="text-xs text-[var(--ink-2)]">Record</span>
            <select
              value={activeRecordId}
              onChange={(event) => onSelectRecord(event.target.value)}
              className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink-1)]"
            >
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.id.slice(0, 8)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-[#f7faf5] p-3 text-xs text-[var(--ink-1)]">
          Status: {activeRecord?.payoutStatus === "paid" ? "Paid" : "Pending"}
          {activeRecord?.paidAt ? ` | Paid at ${new Date(activeRecord.paidAt).toLocaleString()}` : ""}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={paidTxid}
            onChange={(event) => onPaidTxidChange(event.target.value)}
            placeholder="Enter Zcash txid (64 hex)"
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 font-mono text-xs text-[var(--ink-1)]"
          />
          <PrimaryButton onClick={onMarkPaid} disabled={records.length === 0}>
            Mark Batch Paid
          </PrimaryButton>
          {zecExplorerLink && (
            <a
              href={zecExplorerLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--ink-1)]"
            >
              View TX
            </a>
          )}
        </div>
        {markPaidError && <p className="mt-2 text-xs text-red-600">{markPaidError}</p>}
        {markPaidSuccess && <p className="mt-2 text-xs text-green-700">{markPaidSuccess}</p>}
      </div>

      <div className="soft-panel rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[var(--ink-0)]">USDC NEAR Intent</h3>
        <textarea
          readOnly
          value={batch.nearIntentJson}
          className="mt-2 h-24 w-full rounded-lg border border-[var(--line)] bg-[#f7faf5] p-2 font-mono text-xs text-[var(--ink-0)]"
        />
        <CopyNotice state={copyNearState} />
        <div className="mt-2 flex flex-wrap gap-2">
          <PrimaryButton onClick={onCopyNear} disabled={batch.usdcRecipients === 0}>
            Copy Intent JSON
          </PrimaryButton>
          <PrimaryButton onClick={onOpenNear} disabled={batch.usdcRecipients === 0}>
            Open Zodl Intent
          </PrimaryButton>
        </div>
      </div>

      <div className="soft-panel rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-[var(--ink-0)]">Encrypted Server Records</h3>
        <p className="mt-1 text-xs text-[var(--ink-2)]">Server stores only encrypted blobs + metadata.</p>
        <ul className="mt-2 space-y-1.5">
          {records.slice(0, 5).map((record) => (
            <li key={record.id} className="rounded-lg border border-[var(--line)] bg-white/70 p-2 text-xs text-[var(--ink-1)]">
              {record.createdAt} | next payout {record.nextPayoutDate} | id {record.id.slice(0, 8)}... | status{" "}
              {record.payoutStatus === "paid" ? "paid" : "pending"}
              {record.txid ? (
                <>
                  {" "}
                  | tx{" "}
                  <a
                    href={`https://blockchair.com/zcash/transaction/${record.txid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {record.txid.slice(0, 12)}...
                  </a>
                </>
              ) : (
                ""
              )}
            </li>
          ))}
          {records.length === 0 && <li className="text-xs text-[var(--ink-2)]">No encrypted records yet.</li>}
        </ul>
      </div>

      <div className="flex gap-3">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onNewBatch}>Generate New Batch</PrimaryButton>
      </div>
    </section>
  );
}
