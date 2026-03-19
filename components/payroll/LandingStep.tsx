import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PrimaryButton } from "./ui";

type ZecPriceState = {
  usd: number | null;
  loading: boolean;
};

export function LandingStep({ onStart }: { onStart: () => void }) {
  const [price, setPrice] = useState<ZecPriceState>({
    usd: null,
    loading: true,
  });

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
            loading: false,
          });
        }
      } catch {
        if (active) {
          setPrice((current) => ({
            usd: current.usd,
            loading: false,
          }));
        }
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
    if (price.loading) {
      return "Loading ZEC price...";
    }
    if (price.usd === null) {
      return "ZEC price unavailable";
    }
    return `ZEC $${price.usd.toFixed(2)}`;
  }, [price.loading, price.usd]);

  return (
    <section className="w-full space-y-5 text-center transition-all duration-200">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">ZEC Payroll</p>
      <h1 className="text-5xl font-semibold tracking-tight text-gray-900">Shielded Payroll Runner</h1>
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur">
        <Image src="/logo.webp" alt="ZEC logo" width={16} height={16} className="rounded-full" />
        {priceLabel}
      </div>
      <p className="text-lg text-gray-600">Biweekly ZIP-321 payroll from CSV, encrypted end to end.</p>
      <PrimaryButton onClick={onStart}>Create Payroll Batch</PrimaryButton>
    </section>
  );
}
