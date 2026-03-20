import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExecutionStatus, PayoutExecution } from "@/types/payroll";

type CreateExecutionBody = {
  batchId: string;
  items: Array<{
    recipientName: string;
    recipientAddress: string;
    amountZec: number;
  }>;
};

function toExecution(row: {
  id: string;
  batchId: string;
  recipientName: string;
  recipientAddress: string;
  amountZec: number;
  status: string;
  txid: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PayoutExecution {
  return {
    id: row.id,
    batchId: row.batchId,
    recipientName: row.recipientName,
    recipientAddress: row.recipientAddress,
    amountZec: row.amountZec,
    status: row.status as ExecutionStatus,
    txid: row.txid,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toUpperCase();
  const batchId = searchParams.get("batchId");

  const rows = await prisma.payoutExecution.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(batchId ? { batchId } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    executions: rows.map(toExecution),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateExecutionBody>;

  if (!body || typeof body.batchId !== "string" || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Invalid execution payload." }, { status: 400 });
  }

  const items = body.items.filter(
    (item) =>
      item &&
      typeof item.recipientName === "string" &&
      typeof item.recipientAddress === "string" &&
      Number.isFinite(item.amountZec) &&
      item.amountZec > 0,
  );

  if (items.length === 0) {
    return NextResponse.json({ error: "No valid execution items." }, { status: 400 });
  }

  await prisma.payoutExecution.createMany({
    data: items.map((item) => ({
      batchId: body.batchId as string,
      recipientName: item.recipientName,
      recipientAddress: item.recipientAddress,
      amountZec: Number(item.amountZec.toFixed(8)),
      status: "PENDING",
    })),
  });

  return NextResponse.json({ ok: true, created: items.length });
}
