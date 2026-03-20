"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ExecutionStatus, PayoutExecution } from "@/types/payroll";

type StatusFilter = "ALL" | ExecutionStatus;

function shortTxid(value: string | null): string {
  if (!value) {
    return "-";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 12)}...`;
}

function formatDay(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString();
}

function isTxid(value: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(value.trim());
}

export default function HistoryPage() {
  const [executions, setExecutions] = useState<PayoutExecution[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [txidDrafts, setTxidDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ExecutionStatus>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchExecutions();
  }, [statusFilter]);

  async function fetchExecutions() {
    setError("");
    setLoading(true);
    try {
      const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
      const response = await fetch(`/api/executions${query}`, { cache: "no-store" });
      if (!response.ok) {
        setError("Could not load transaction history.");
        return;
      }

      const payload = (await response.json()) as { executions?: PayoutExecution[] };
      const next = payload.executions ?? [];
      setExecutions(next);
      setTxidDrafts(
        Object.fromEntries(next.map((row) => [row.id, row.txid ?? ""])) as Record<string, string>,
      );
      setStatusDrafts(
        Object.fromEntries(next.map((row) => [row.id, row.status])) as Record<string, ExecutionStatus>,
      );
    } catch {
      setError("Could not load transaction history.");
    } finally {
      setLoading(false);
    }
  }

  const batchOptions = useMemo(() => {
    const set = new Set(executions.map((row) => row.batchId));
    return Array.from(set);
  }, [executions]);

  const filtered = useMemo(() => {
    return executions.filter((row) => {
      if (batchFilter !== "ALL" && row.batchId !== batchFilter) {
        return false;
      }
      return true;
    });
  }, [executions, batchFilter]);

  const summary = useMemo(() => {
    const paid = filtered.filter((row) => row.status === "PAID");
    const totalDisbursed = paid.reduce((sum, row) => sum + row.amountZec, 0);
    const successRate = filtered.length > 0 ? (paid.length / filtered.length) * 100 : 0;
    const uniqueRecipients = new Set(filtered.map((row) => row.recipientAddress)).size;

    return {
      totalDisbursed,
      transactions: filtered.length,
      successRate,
      uniqueRecipients,
    };
  }, [filtered]);

  async function saveRow(row: PayoutExecution) {
    setError("");

    const nextStatus = statusDrafts[row.id] ?? row.status;
    const nextTxid = (txidDrafts[row.id] ?? "").trim();

    if (nextTxid && !isTxid(nextTxid)) {
      setError(`Invalid txid for ${row.recipientName}.`);
      return;
    }

    try {
      const response = await fetch(`/api/executions/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          txid: nextTxid,
        }),
      });

      if (!response.ok) {
        setError("Failed to update transaction row.");
        return;
      }

      const payload = (await response.json()) as { execution?: PayoutExecution };
      if (!payload.execution) {
        return;
      }
      const updatedExecution = payload.execution;

      setExecutions((current) => current.map((item) => (item.id === updatedExecution.id ? updatedExecution : item)));
      setTxidDrafts((current) => ({ ...current, [row.id]: updatedExecution.txid ?? "" }));
      setStatusDrafts((current) => ({ ...current, [row.id]: updatedExecution.status }));
    } catch {
      setError("Failed to update transaction row.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-2)]">Admin</p>
            <h1 className="text-3xl font-semibold text-[var(--ink-0)]">Transaction History</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-1)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={batchFilter}
              onChange={(event) => setBatchFilter(event.target.value)}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink-1)]"
            >
              <option value="ALL">All Payrolls</option>
              {batchOptions.map((batchId) => (
                <option key={batchId} value={batchId}>
                  {batchId.slice(0, 8)}...
                </option>
              ))}
            </select>

            <Link href="/" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-1)]">
              Back
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="soft-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-2)]">Total Disbursed</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--ink-0)]">{summary.totalDisbursed.toFixed(8)}</p>
            <p className="text-xs text-[var(--ink-2)]">ZEC all time</p>
          </div>
          <div className="soft-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-2)]">Transactions</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--ink-0)]">{summary.transactions}</p>
            <p className="text-xs text-[var(--ink-2)]">Total execution rows</p>
          </div>
          <div className="soft-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-2)]">Success Rate</p>
            <p className="mt-1 text-3xl font-semibold text-green-700">{summary.successRate.toFixed(1)}%</p>
            <p className="text-xs text-[var(--ink-2)]">Rows marked paid</p>
          </div>
          <div className="soft-panel rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-2)]">Recipients</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--ink-0)]">{summary.uniqueRecipients}</p>
            <p className="text-xs text-[var(--ink-2)]">Unique payees</p>
          </div>
        </div>

        <section className="soft-panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--ink-0)]">All Transactions</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)]">{filtered.length} rows</p>
          </div>

          {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
          {loading ? <p className="px-4 py-4 text-sm text-[var(--ink-2)]">Loading...</p> : null}

          {!loading && filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[var(--ink-2)]">No transactions yet. Generate a payroll batch first.</p>
          ) : null}

          {!loading && filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#edf3ea] text-[var(--ink-2)]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Recipient</th>
                    <th className="px-4 py-2 font-medium">Address</th>
                    <th className="px-4 py-2 font-medium">Payroll</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">TXID</th>
                    <th className="px-4 py-2 font-medium">Paid At</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4ebe1] bg-white/80">
                  {filtered.map((row) => {
                    const txidValue = txidDrafts[row.id] ?? "";
                    const statusValue = statusDrafts[row.id] ?? row.status;
                    const explorerUrl = row.txid ? `https://blockchair.com/zcash/transaction/${row.txid}` : "";

                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-2 text-[var(--ink-0)]">{row.recipientName}</td>
                        <td className="px-4 py-2 font-mono text-xs text-[var(--ink-1)]">
                          {row.recipientAddress.slice(0, 8)}...{row.recipientAddress.slice(-8)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-[var(--ink-2)]">{row.batchId.slice(0, 8)}...</td>
                        <td className="px-4 py-2 text-[var(--ink-1)]">{row.amountZec.toFixed(8)} ZEC</td>
                        <td className="px-4 py-2">
                          <select
                            value={statusValue}
                            onChange={(event) =>
                              setStatusDrafts((current) => ({
                                ...current,
                                [row.id]: event.target.value as ExecutionStatus,
                              }))
                            }
                            className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="FAILED">Failed</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={txidValue}
                            onChange={(event) =>
                              setTxidDrafts((current) => ({
                                ...current,
                                [row.id]: event.target.value,
                              }))
                            }
                            placeholder="txid"
                            className="w-44 rounded-md border border-[var(--line)] px-2 py-1 font-mono text-xs"
                          />
                          {explorerUrl ? (
                            <a href={explorerUrl} target="_blank" rel="noreferrer" className="ml-2 text-xs underline">
                              {shortTxid(row.txid)}
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-[var(--ink-2)]">{formatDay(row.paidAt)}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              void saveRow(row);
                            }}
                            className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
