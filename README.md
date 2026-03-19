# ZEC Payroll Runner

A focused hackathon prototype for private payroll with Zcash.

It supports:
- CSV import for recipients and amounts (`USD`, `USDC`, or `ZEC`)
- Shielded ZEC batch generation as ZIP-321 multi-payment URI
- USDC payout lane payload for Zodl NEAR intents
- Test-transaction gating per recipient before full payout
- Biweekly schedule preview with next payout date
- End-to-end encrypted batch storage on server (server never stores plaintext payroll details)

## Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`.

## CSV format

Required headers:
- `name`
- `wallet`
- `amount`
- `currency`

Optional headers:
- `payout_rail` (`ZEC` or `USDC_NEAR_INTENT`)
- `test_tx_required` (`true`/`false`, defaults to `true`)

Example:

```csv
name,wallet,amount,currency,payout_rail,test_tx_required
Alice,zs1examplealice,1.25,ZEC,ZEC,true
Bob,zs1examplebob,125,USD,ZEC,true
Carol,carol.near,200,USDC,USDC_NEAR_INTENT,false
```

## End-to-end encryption model

- Client derives AES-GCM key from your passphrase using PBKDF2.
- Client encrypts payroll batch JSON before uploading.
- Server stores only encrypted payload (`ciphertext`, `iv`, `salt`) + minimal metadata (`createdAt`, `nextPayoutDate`, `notificationDue`) in PostgreSQL.

## Database (Neon + Prisma)

- Connection env vars: `DATABASE_URL` (used by Prisma) and `DB_URL` (kept for compatibility).
- Prisma schema: `prisma/schema.prisma`
- Migration files: `prisma/migrations/*`
- API persistence layer: `app/api/batches/route.ts`

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Notes

- USD/ZEC conversion uses a fixed demo rate (`1 ZEC = 50 USD`).
- NEAR intent integration is represented as a Zodl-compatible payload URI scaffold for prototype/demo flow.
