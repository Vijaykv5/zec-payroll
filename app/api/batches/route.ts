import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EncryptedBatchRecord, EncryptedPayload } from "@/types/payroll";

type CreateBatchBody = {
  encrypted: EncryptedPayload;
  createdAt: string;
  nextPayoutDate: string;
  notificationDue: boolean;
};

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.ciphertext === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.salt === "string" &&
    candidate.algorithm === "AES-GCM" &&
    candidate.kdf === "PBKDF2"
  );
}

function toRecord(row: {
  id: string;
  createdAt: Date;
  nextPayoutDate: string;
  notificationDue: boolean;
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: string;
  kdf: string;
}): EncryptedBatchRecord {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    nextPayoutDate: row.nextPayoutDate,
    notificationDue: row.notificationDue,
    encrypted: {
      ciphertext: row.ciphertext,
      iv: row.iv,
      salt: row.salt,
      algorithm: row.algorithm as "AES-GCM",
      kdf: row.kdf as "PBKDF2",
    },
  };
}

export async function GET() {
  const rows = await prisma.encryptedBatch.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    records: rows.map(toRecord),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateBatchBody>;

  if (!body || !isEncryptedPayload(body.encrypted)) {
    return NextResponse.json({ error: "Invalid encrypted payload." }, { status: 400 });
  }

  if (typeof body.createdAt !== "string" || typeof body.nextPayoutDate !== "string") {
    return NextResponse.json({ error: "Invalid batch metadata." }, { status: 400 });
  }

  const createdAt = new Date(body.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: "Invalid createdAt timestamp." }, { status: 400 });
  }

  const row = await prisma.encryptedBatch.create({
    data: {
      createdAt,
      nextPayoutDate: body.nextPayoutDate,
      notificationDue: Boolean(body.notificationDue),
      ciphertext: body.encrypted.ciphertext,
      iv: body.encrypted.iv,
      salt: body.encrypted.salt,
      algorithm: body.encrypted.algorithm,
      kdf: body.encrypted.kdf,
    },
  });

  return NextResponse.json({ ok: true, record: toRecord(row) });
}
