export type FundraisingConfig = {
  fundraiserUrl: string;
  raised: number;
  goal: number;
  donors: number;
  lastUpdated: string;
};

declare global {
  interface Window {
    skipForWishesConfig?: Partial<FundraisingConfig>;
  }
}

const fallbackConfig: FundraisingConfig = {
  fundraiserUrl: "https://wish.org/donate-make-wish-today",
  raised: 0,
  goal: 10000,
  donors: 0,
  lastUpdated: "August 3, 2026"
};

const runtimeConfig = typeof window === "undefined" ? {} : window.skipForWishesConfig ?? {};

function toFiniteNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

export const fundraisingConfig: FundraisingConfig = {
  fundraiserUrl: runtimeConfig.fundraiserUrl || fallbackConfig.fundraiserUrl,
  raised: toFiniteNumber(runtimeConfig.raised, fallbackConfig.raised),
  goal: Math.max(1, toFiniteNumber(runtimeConfig.goal, fallbackConfig.goal)),
  donors: toFiniteNumber(runtimeConfig.donors, fallbackConfig.donors),
  lastUpdated: runtimeConfig.lastUpdated || fallbackConfig.lastUpdated
};
