# ZEC Payroll 

ZEC Payroll is a small payroll tool for paying teams with private Zcash transactions.

Upload a CSV, review the batch, run required test payments, then generate a ZIP-321 multi-payment payload for signing in Zodl. If someone needs USDC instead, the app prepares a NEAR intent payload for that leg.

## What this demo does

- Imports payroll rows from CSV (`ZEC`, `USD`, `USDC` amounts)
- Enforces test-transaction checks before full payout
- Calculates biweekly payout timing and due status
- Generates ZIP-321 multi-pay output for ZEC recipients
- Generates NEAR intent payload for USDC recipients
- Encrypts payroll batch data in the browser before storing on server

## Product flow

1. Start payroll
2. Upload CSV (or click **Load Sample CSV**)
3. Review rows and admin settings
4. Mark required test tx rows as done
5. Generate batch
6. Use ZIP-321 QR/URI for ZEC, NEAR intent for USDC

## CSV format

Required headers:
- `name`
- `wallet`
- `amount`
- `currency`

Optional headers:
- `payout_rail` (`ZEC` or `USDC_NEAR_INTENT`)
- `test_tx_required` (`true` / `false`, defaults to `true`)

Example:

```csv
name,wallet,amount,currency,payout_rail,test_tx_required
Vijay,u1...,100,USD,ZEC,true
Arjun,zs1...,0.5,ZEC,ZEC,true
Nina,nina.near,250,USDC,USDC_NEAR_INTENT,false
```

## Run locally

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`.

## Environment

Set either one (both supported):

- `DATABASE_URL`
- `DB_URL`

Example `.env`:

```env
DATABASE_URL=postgresql://...
```

## Database (Neon + Prisma)

- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations`
- API storage endpoint: `app/api/batches/route.ts`

The server stores encrypted payload fields plus minimal metadata only.

## Encryption model

- Key derivation: PBKDF2 (client-side)
- Encryption: AES-GCM (client-side)
- Server storage: ciphertext + IV + salt + schedule metadata

Plaintext payroll rows are not persisted server-side.

## Notes for judges / demo viewers

- ZIP-321 output is generated from CSV rows for multi-recipient ZEC payouts.
- Wallet support for full multi-pay parsing can vary by scanner implementation.
- USD/ZEC conversion currently uses a fixed demo rate (`1 ZEC = 50 USD`).

## Useful commands

```bash
npm run prisma:generate
npm run prisma:migrate
npx tsc --noEmit
```
