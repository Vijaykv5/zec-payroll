import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PrimaryButton } from "./ui";

type ZecPriceState = {
  usd: number | null;
};

export function LandingStep({ onStart }: { onStart: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [price, setPrice] = useState<ZecPriceState>({
    usd: null,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchPrice() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd&include_24hr_change=true",
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("price fetch failed");
        }

        const payload = (await response.json()) as {
          zcash?: { usd?: number; usd_24h_change?: number };
        };

        const usd = payload.zcash?.usd ?? null;

        if (active) {
          setPrice({
            usd,
          });
        }
      } catch {
        // Ignore fetch errors and keep badge hidden.
      }
    }

    void fetchPrice();
    const intervalId = setInterval(() => {
      void fetchPrice();
    }, 60000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const priceLabel = useMemo(() => {
    if (price.usd === null) {
      return "";
    }
    return `ZEC $${price.usd.toFixed(2)}`;
  }, [price.usd]);

  return (
    <section className="w-full space-y-5 text-center transition-all duration-200">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink-2)]">Private team payouts</p>
      <h1 className="text-4xl font-semibold tracking-tight text-[var(--ink-0)] sm:text-5xl">Cloaked</h1>
      {mounted && priceLabel ? (
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/90 px-4 py-2 text-sm font-semibold text-[var(--ink-1)] shadow-sm backdrop-blur">
          <Image src="/logo.webp" alt="ZEC logo" width={16} height={16} className="rounded-full" />
          {priceLabel}
        </div>
      ) : null}
      <p className="mx-auto max-w-2xl text-base text-[var(--ink-2)] sm:text-lg">
        Import CSV payouts, enforce test transactions, then produce ZIP-321 and NEAR intent payloads with encrypted server records.
      </p>
      <PrimaryButton
        onClick={onStart}
        className="mx-auto min-w-72 bg-gradient-to-b from-[var(--accent)] to-[var(--accent-strong)] px-8 py-4 text-lg font-bold tracking-[0.02em] shadow-[0_14px_28px_rgba(17,53,38,0.22)] hover:shadow-[0_18px_34px_rgba(17,53,38,0.28)]"
      >
        Create Payroll Batch
      </PrimaryButton>
    </section>
  );
}
