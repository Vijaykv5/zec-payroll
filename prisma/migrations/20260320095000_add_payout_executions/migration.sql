-- Create payout_executions for per-recipient execution history
CREATE TABLE "payout_executions" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "recipient_name" TEXT NOT NULL,
  "recipient_address" TEXT NOT NULL,
  "amount_zec" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "txid" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payout_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payout_executions_status_idx" ON "payout_executions"("status");
CREATE INDEX "payout_executions_batch_id_idx" ON "payout_executions"("batch_id");

ALTER TABLE "payout_executions"
ADD CONSTRAINT "payout_executions_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "encrypted_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
