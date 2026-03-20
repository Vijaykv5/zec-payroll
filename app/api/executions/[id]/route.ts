import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateExecutionBody = {
  status?: "PENDING" | "PAID" | "FAILED";
  txid?: string;
};

function isTxid(value: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(value.trim());
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<UpdateExecutionBody>;

  if (!body || (typeof body.status !== "string" && typeof body.txid !== "string")) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const nextStatus = body.status?.toUpperCase();
  if (nextStatus && nextStatus !== "PENDING" && nextStatus !== "PAID" && nextStatus !== "FAILED") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const txid = typeof body.txid === "string" ? body.txid.trim().toLowerCase() : undefined;
  if (txid !== undefined && txid.length > 0 && !isTxid(txid)) {
    return NextResponse.json({ error: "Invalid txid." }, { status: 400 });
  }

  const updated = await prisma.payoutExecution.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(txid !== undefined ? { txid: txid || null } : {}),
      ...(nextStatus === "PAID" ? { paidAt: new Date() } : {}),
      ...(nextStatus === "PENDING" || nextStatus === "FAILED" ? { paidAt: null } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    execution: {
      id: updated.id,
      batchId: updated.batchId,
      recipientName: updated.recipientName,
      recipientAddress: updated.recipientAddress,
      amountZec: updated.amountZec,
      status: updated.status,
      txid: updated.txid,
      paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
