export interface ShelfPosition {
  x: number;
  y: number;
  aisleX: number;
}

const SHELF_POSITIONS = [
  { x: 260, y: 300, aisleX: 430 },
  { x: 1660, y: 300, aisleX: 1490 },
  { x: 600, y: 580, aisleX: 770 },
  { x: 1320, y: 580, aisleX: 1150 },
  { x: 260, y: 860, aisleX: 430 },
  { x: 1660, y: 860, aisleX: 1490 },
  { x: 600, y: 300, aisleX: 770 },
  { x: 1320, y: 300, aisleX: 1150 },
  { x: 600, y: 860, aisleX: 770 },
  { x: 1320, y: 860, aisleX: 1150 },
  { x: 260, y: 580, aisleX: 430 },
  { x: 1660, y: 580, aisleX: 1490 }
] as const;

export const storeShelfPosition = (index: number): ShelfPosition => {
  const safeIndex = Math.max(0, Math.min(11, Math.floor(index)));
  return SHELF_POSITIONS[safeIndex];
};
