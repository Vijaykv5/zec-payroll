import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { CopyState, EncryptedBatchRecord, GeneratedBatch } from "@/types/payroll";
import { maskZip321Uri } from "@/utils/payroll";
import { PrimaryButton, SecondaryButton, SummaryCard } from "./ui";

function CopyNotice({ state }: { state: CopyState }) {
  if (state === "copied") {
    return <p className="mt-2 text-xs text-green-600">Copied to clipboard.</p>;
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
  records,
  onBack,
  onCopyZip,
  onCopyNear,
  onOpenZip,
  onOpenNear,
}: {
  batch: GeneratedBatch;
  copyZipState: CopyState;
  copyNearState: CopyState;
  records: EncryptedBatchRecord[];
  onBack: () => void;
  onCopyZip: () => void;
  onCopyNear: () => void;
  onOpenZip: () => void;
  onOpenNear: () => void;
}) {
  const [zipView, setZipView] = useState<"qr" | "uri">("qr");

  return (
    <section className="w-full space-y-3 transition-all duration-200">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Batch Generated</h2>
        <p className="mt-1 text-xs text-gray-600">Preview and trigger payout signing in Zodl.</p>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <SummaryCard label="ZEC Recipients" value={batch.zecRecipients} />
          <SummaryCard label="USDC Recipients" value={batch.usdcRecipients} />
          <SummaryCard label="ZEC Total" value={`${batch.totalZec.toFixed(8)} ZEC`} />
          <SummaryCard label="Next Payout" value={batch.nextPayoutDate || "-"} />
        </div>

        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5">
          <p className="text-xs text-gray-600">
            Notification status: {batch.notificationDue ? "Due now" : "Not due yet"}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">ZIP-321 Multi-payment</h3>
          <div className="inline-flex rounded-md border border-gray-300 bg-gray-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZipView("qr")}
              className={`rounded px-2 py-1 ${zipView === "qr" ? "bg-black text-white" : "text-gray-700"}`}
            >
              QR
            </button>
            <button
              type="button"
              onClick={() => setZipView("uri")}
              className={`rounded px-2 py-1 ${zipView === "uri" ? "bg-black text-white" : "text-gray-700"}`}
            >
              URI
            </button>
          </div>
        </div>
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {zipView === "qr" ? (
            <div className="flex flex-col items-center gap-2">
              {batch.zcashUri ? (
                <div className="rounded-md bg-white p-2">
                  <QRCodeSVG value={batch.zcashUri} size={208} marginSize={1} />
                </div>
              ) : (
                <p className="text-xs text-gray-500">QR unavailable for this batch.</p>
              )}
              <p className="w-full break-all font-mono text-[11px] text-gray-700">{maskZip321Uri(batch.zcashUri)}</p>
            </div>
          ) : (
            <textarea
              readOnly
              value={maskZip321Uri(batch.zcashUri)}
              className="h-28 w-full rounded-lg border border-gray-200 bg-white p-2 font-mono text-xs text-gray-800"
            />
          )}
        </div>
        <CopyNotice state={copyZipState} />
        <div className="mt-2 flex flex-wrap gap-2">
          <PrimaryButton onClick={onCopyZip} disabled={!batch.zcashUri}>
            Copy ZIP-321
          </PrimaryButton>
          {/* <PrimaryButton onClick={onOpenZip} disabled={!batch.zcashUri}>
            Open in Zodl
          </PrimaryButton> */}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">USDC NEAR Intent</h3>
        <textarea
          readOnly
          value={batch.nearIntentJson}
          className="mt-2 h-24 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-800"
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

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Encrypted Server Records</h3>
        <p className="mt-1 text-xs text-gray-600">Server stores only encrypted blobs + metadata.</p>
        <ul className="mt-2 space-y-1.5">
          {records.slice(0, 5).map((record) => (
            <li key={record.id} className="rounded-lg border border-gray-200 p-2 text-xs text-gray-700">
              {record.createdAt} | next payout {record.nextPayoutDate} | id {record.id.slice(0, 8)}...
            </li>
          ))}
          {records.length === 0 && <li className="text-xs text-gray-500">No encrypted records yet.</li>}
        </ul>
      </div>

      <div className="flex gap-3">
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
      </div>
    </section>
  );
}
