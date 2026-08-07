export type FundraisingConfig = {
  donationUrl: string;
  fundraiserUrl: string;
  raised: number;
  goal: number;
  lastUpdated: string;
};

declare global {
  interface Window {
    skipForWishesConfig?: Partial<FundraisingConfig>;
  }
}

const fallbackConfig: FundraisingConfig = {
  donationUrl: "https://secure2.wish.org/site/Donation2?df_id=6178&PROXY_ID=11514783&PROXY_TYPE=20&FR_ID=7471",
  fundraiserUrl: "https://secure2.wish.org/site/TR/WishYourWay/Make-A-WishAmerica?pg=personal&px=11514783&fr_id=7471",
  raised: 0,
  goal: 10000,
  lastUpdated: "August 4, 2026"
};

const runtimeConfig = typeof window === "undefined" ? {} : window.skipForWishesConfig ?? {};

function toFiniteNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

export const fundraisingConfig: FundraisingConfig = {
  donationUrl: runtimeConfig.donationUrl || fallbackConfig.donationUrl,
  fundraiserUrl: runtimeConfig.fundraiserUrl || fallbackConfig.fundraiserUrl,
  raised: toFiniteNumber(runtimeConfig.raised, fallbackConfig.raised),
  goal: Math.max(1, toFiniteNumber(runtimeConfig.goal, fallbackConfig.goal)),
  lastUpdated: runtimeConfig.lastUpdated || fallbackConfig.lastUpdated
};
