import type { ChangeEvent } from "react";
import { PrimaryButton, SecondaryButton } from "./ui";

export function UploadStep({
  fileName,
  parseError,
  canContinue,
  onUpload,
  onLoadSample,
  onBack,
  onContinue,
}: {
  fileName: string;
  parseError: string;
  canContinue: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSample: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="w-full space-y-3 transition-all duration-200">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Upload Payroll CSV</h2>
        <p className="mt-1 text-sm text-gray-600">
          Required: <span className="font-mono">name,wallet,amount,currency</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Optional: <span className="font-mono">payout_rail,test_tx_required</span> where payout_rail can be ZEC or USDC_NEAR_INTENT.
        </p>

        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-7 text-center transition-all duration-200 hover:border-gray-400">
          <span className="text-xs text-gray-600">Choose a .csv file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onUpload}
            className="w-full max-w-[240px] text-xs text-gray-500 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-medium file:text-white"
          />
        </label>
        <div className="mt-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Load Sample CSV
          </button>
        </div>

        {fileName && <p className="mt-3 text-sm text-gray-700">File: {fileName}</p>}
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
