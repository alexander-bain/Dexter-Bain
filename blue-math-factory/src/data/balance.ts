export const BALANCE = {
  saveKey: "blueMathFactory_save_v1",
  autosaveMs: 10_000,
  offlineCapSeconds: 4 * 60 * 60,
  baseStorage: 80,
  baseProductValue: 2,
  baseQueueCapacity: 1,
  baseArrivalSeconds: 7,
  baseCheckoutSeconds: 5.5,
  basePatienceSeconds: 24,
  rewardSteps: [1, 2, 4, 8, 16, 32, 64] as const,
  timerSteps: [9, 8, 7, 6, 5, 4, 3] as const,
  socialProofPerCustomer: 0.05,
  maxSocialProof: 0.2,
  manualCheckoutSeconds: 0.7,
  mathPowerMultiplier: 2,
  blueberryRushMultiplier: 2,
  boostSeconds: 30,
  worldWidth: 1920,
  worldHeight: 1180
} as const;

export const COLORS = {
  ink: 0x17113f,
  navy: 0x211761,
  violet: 0x5e3fc9,
  purple: 0x9a5cff,
  blueberry: 0x3657e7,
  cyan: 0x53e6ff,
  cream: 0xfff6dc,
  gold: 0xffc54d,
  mint: 0x55e7a6,
  coral: 0xff7777,
  grass: 0x7ccf69,
  darkGrass: 0x3d9b5f,
  wood: 0x8d5a46,
  steel: 0x7fa1bd
} as const;
