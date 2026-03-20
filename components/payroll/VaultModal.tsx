import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "./ui";

export function VaultModal({
  open,
  mode,
  error,
  onClose,
  onCreateVault,
  onUnlockVault,
  onForgotPassphrase,
}: {
  open: boolean;
  mode: "create" | "unlock";
  error: string;
  onClose: () => void;
  onCreateVault: (passphrase: string, confirmPassphrase: string) => void;
  onUnlockVault: (passphrase: string) => void;
  onForgotPassphrase: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPassphrase("");
    setConfirmPassphrase("");
    setShowDeleteConfirm(false);
  }, [open, mode]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="soft-panel w-full max-w-xl rounded-2xl p-5 sm:p-6">
        <h2 className="text-2xl font-semibold text-[var(--ink-0)]">{mode === "create" ? "Create Vault" : "Unlock Vault"}</h2>
        {mode === "unlock" ? (
          <p className="mt-1 text-sm text-[var(--ink-2)]">Encrypted data found in the browser.</p>
        ) : (
          <p className="mt-1 text-sm text-[var(--ink-2)]">Create a passphrase to encrypt payroll vault data in this browser.</p>
        )}

        <div className="mt-4 space-y-3">
          <label className="block text-sm text-[var(--ink-1)]">
            Passphrase
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-base text-[var(--ink-0)]"
            />
          </label>

          {mode === "create" ? (
            <label className="block text-sm text-[var(--ink-1)]">
              Confirm passphrase
              <input
                type="password"
                value={confirmPassphrase}
                onChange={(event) => setConfirmPassphrase(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-base text-[var(--ink-0)]"
              />
            </label>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {mode === "create" ? (
            <PrimaryButton onClick={() => onCreateVault(passphrase, confirmPassphrase)}>Create Vault</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => onUnlockVault(passphrase)}>Unlock</PrimaryButton>
          )}
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </div>
        {mode === "unlock" ? (
          <div className="mt-3 space-y-3 text-center">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700"
              >
                Delete vault
              </button>
            ) : (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  This will permanently delete all saved data. There is no recovery.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onForgotPassphrase}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Delete vault
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-1)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
