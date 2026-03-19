"use client";

import { LandingStep } from "@/components/payroll/LandingStep";
import { PreviewStep } from "@/components/payroll/PreviewStep";
import { ResultStep } from "@/components/payroll/ResultStep";
import { UploadStep } from "@/components/payroll/UploadStep";
import { usePayroll } from "@/hooks/usePayroll";

export default function Home() {
  const {
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
    passphrase,
    setPassphrase,
    savedRecords,
    isSaving,
    validationErrors,
    pendingTests,
    handleCsvUpload,
    handleLoadSampleCsv,
    setTestTxDone,
    handleGeneratePayroll,
    handleCopyZipUri,
    handleCopyNearIntent,
    resetCopyState,
  } = usePayroll();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col items-center justify-center transition-all duration-200">
        <div className="w-full max-w-3xl">
          {step === "landing" && <LandingStep onStart={() => setStep("upload")} />}

          {step === "upload" && (
            <UploadStep
              fileName={fileName}
              parseError={parseError}
              canContinue={payments.length > 0}
              onUpload={handleCsvUpload}
              onLoadSample={() => {
                void handleLoadSampleCsv();
              }}
              onBack={() => setStep("landing")}
              onContinue={() => setStep("preview")}
            />
          )}

          {step === "preview" && (
            <PreviewStep
              payments={payments}
              settings={settings}
              passphrase={passphrase}
              errors={validationErrors}
              pendingTests={pendingTests}
              generationError={generationError}
              encryptedBatches={savedRecords.length}
              isSaving={isSaving}
              onBack={() => setStep("upload")}
              onGenerate={() => {
                void handleGeneratePayroll();
              }}
              onSetPassphrase={setPassphrase}
              onUpdateSettings={setSettings}
              onToggleTestTx={setTestTxDone}
            />
          )}

          {step === "result" && batch && (
            <ResultStep
              batch={batch}
              copyZipState={copyZipState}
              copyNearState={copyNearState}
              records={savedRecords}
              onBack={() => {
                resetCopyState();
                setStep("preview");
              }}
              onCopyZip={() => {
                void handleCopyZipUri();
              }}
              onCopyNear={() => {
                void handleCopyNearIntent();
              }}
              onOpenZip={() => {
                if (batch.zcashUri) {
                  window.location.href = batch.zcashUri;
                }
              }}
              onOpenNear={() => {
                if (batch.usdcRecipients > 0) {
                  window.location.href = batch.nearIntentUri;
                }
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
