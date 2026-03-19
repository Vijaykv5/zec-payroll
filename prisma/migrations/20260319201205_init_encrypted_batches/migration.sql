-- CreateTable
CREATE TABLE "encrypted_batches" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "next_payout_date" TEXT NOT NULL,
    "notification_due" BOOLEAN NOT NULL DEFAULT false,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "kdf" TEXT NOT NULL,

    CONSTRAINT "encrypted_batches_pkey" PRIMARY KEY ("id")
);
