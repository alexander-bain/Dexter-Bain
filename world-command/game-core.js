export const GRID_WIDTH = 180;
export const GRID_HEIGHT = 92;
export const MAX_PLAYERS = 10;
export const CELLS_PER_TROOP = 4;
export const BOAT_COST = 18;
export const MISSILE_COST = 30;

export const PLAYER_COLORS = [
  "#00D4FF",
  "#FF3D71",
  "#FFD60A",
  "#7C4DFF",
  "#00E676",
  "#FF6D00",
  "#F500E5",
  "#AEEA00",
  "#2979FF",
  "#E6EDF7",
];

// Large connected landmasses only. Tiny islands are deliberately omitted so
// every visible pixel matters and nobody can hide on a one-cell island.
export const LAND_POLYGONS = [
  // North America
  [[7, 18], [12, 10], [24, 6], [37, 8], [48, 13], [53, 19], [49, 24], [43, 26], [40, 31], [35, 34], [31, 39], [24, 38], [20, 34], [14, 32], [9, 27]],
  // Central America, connected to the north and south
  [[29, 33], [36, 34], [41, 38], [47, 41], [48, 45], [44, 46], [41, 42], [36, 40], [32, 38]],
  // South America
  [[43, 43], [51, 43], [57, 48], [59, 55], [56, 63], [53, 70], [49, 80], [45, 87], [41, 82], [39, 73], [36, 65], [35, 56], [38, 48]],
  // Europe
  [[73, 21], [79, 16], [88, 15], [98, 18], [106, 22], [102, 27], [96, 29], [89, 28], [84, 31], [78, 28], [72, 26]],
  // Africa
  [[76, 27], [88, 27], [98, 30], [104, 36], [105, 44], [101, 52], [98, 62], [92, 73], [86, 70], [82, 62], [78, 55], [73, 48], [71, 39]],
  // Asia
  [[98, 17], [109, 11], [123, 8], [139, 9], [153, 13], [167, 20], [173, 27], [168, 33], [160, 36], [151, 34], [145, 39], [137, 37], [130, 42], [123, 39], [116, 43], [110, 38], [105, 31], [99, 28], [92, 23]],
  // India
  [[113, 34], [122, 36], [129, 41], [130, 49], [126, 58], [121, 52], [117, 44]],
  // Southeast Asia (main peninsula, no islands)
  [[132, 34], [141, 35], [150, 40], [154, 47], [150, 54], [145, 49], [138, 47], [133, 42]],
  // Australia
  [[142, 61], [152, 57], [165, 59], [172, 65], [170, 74], [164, 80], [153, 81], [145, 76], [139, 68]],
];

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function cellIndex(x, y) {
  return y * GRID_WIDTH + x;
}

export function cellCoords(index) {
  return [index % GRID_WIDTH, Math.floor(index / GRID_WIDTH)];
}

export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 0.00001) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}

export function createLandMask() {
  const mask = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const onLand = LAND_POLYGONS.some((polygon) => pointInPolygon(x + 0.5, y + 0.5, polygon));
      mask[cellIndex(x, y)] = onLand ? 1 : 0;
    }
  }
  return mask;
}

export function createWorldGrid(mask = createLandMask()) {
  const grid = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    grid[i] = mask[i] ? 1 : 0;
  }
  return grid;
}

export function neighbors4(index) {
  const [x, y] = cellCoords(index);
  const result = [];
  if (x > 0) result.push(index - 1);
  if (x < GRID_WIDTH - 1) result.push(index + 1);
  if (y > 0) result.push(index - GRID_WIDTH);
  if (y < GRID_HEIGHT - 1) result.push(index + GRID_WIDTH);
  return result;
}

export function isCoastal(index, grid) {
  return grid[index] > 0 && neighbors4(index).some((neighbor) => grid[neighbor] === 0);
}

export function encodeGrid(grid) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(grid).toString("base64");
  }
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < grid.length; i += chunk) {
    binary += String.fromCharCode(...grid.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function decodeGrid(encoded) {
  if (!encoded) return new Uint8Array(GRID_WIDTH * GRID_HEIGHT);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(encoded, "base64"));
  }
  const binary = atob(encoded);
  const grid = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) grid[i] = binary.charCodeAt(i);
  return grid;
}

export function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [255, 255, 255];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

export function colorDistance(a, b) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}
