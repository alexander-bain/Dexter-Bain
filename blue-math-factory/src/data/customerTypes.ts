import type { CustomerType } from "../types";

export const CUSTOMER_TYPES: CustomerType[] = [
  { id: "kid", name: "Local Kid", color: 0x4a77f4, accent: 0xffd34e, basketSize: 3, patience: 1.2, valueMultiplier: 1, attraction: 1, unlockStoreLevel: 0 },
  { id: "parent", name: "Parent", color: 0xf06c9b, accent: 0xffe0bd, basketSize: 6, patience: 1.1, valueMultiplier: 1, attraction: 1, unlockStoreLevel: 1 },
  { id: "hiker", name: "Hiker", color: 0x46a56d, accent: 0xf4bd58, basketSize: 5, patience: 1.4, valueMultiplier: 1, attraction: 1, unlockStoreLevel: 2 },
  { id: "chef", name: "Chef", color: 0xf5f5f5, accent: 0xe64949, basketSize: 8, patience: 0.9, valueMultiplier: 1.25, attraction: 1.05, unlockStoreLevel: 4 },
  { id: "tourist", name: "Tourist", color: 0xff9a52, accent: 0x5e3fc9, basketSize: 7, patience: 1, valueMultiplier: 1.15, attraction: 1.15, unlockStoreLevel: 5 },
  { id: "athlete", name: "Athlete", color: 0x43d5c3, accent: 0x263a75, basketSize: 8, patience: 0.8, valueMultiplier: 1.1, attraction: 1, unlockStoreLevel: 7 },
  { id: "baker", name: "Baker", color: 0xd08b55, accent: 0xfff1d1, basketSize: 12, patience: 1.1, valueMultiplier: 1.2, attraction: 1.05, unlockStoreLevel: 9 },
  { id: "smoothie", name: "Smoothie Fan", color: 0xb452e2, accent: 0x61efb6, basketSize: 12, patience: 1, valueMultiplier: 1.25, attraction: 1.1, unlockStoreLevel: 11 },
  { id: "critic", name: "Food Critic", color: 0x3b3b52, accent: 0xffcf5a, basketSize: 6, patience: 0.7, valueMultiplier: 1.8, attraction: 1.3, unlockStoreLevel: 14 },
  { id: "buyer", name: "Business Buyer", color: 0x253b70, accent: 0x70e6ff, basketSize: 20, patience: 1.5, valueMultiplier: 1.35, attraction: 1.2, unlockStoreLevel: 17 }
];
