// Simplified Sicily coastline (+x = east, +z = south), centered roughly on
// Enna. The polygon is star-shaped around the origin, so the coast can be
// described as radius-per-angle — which makes terrain shaping, foam, rock
// placement and the vehicle's drivable-area clamp all share one lookup.
export const SICILY_OUTLINE = [
  [-100, 8],   // Capo Boeo (Marsala, west tip)
  [-88, -22],  // Capo San Vito
  [-58, -34],
  [-30, -40],  // Palermo
  [0, -42],    // Cefalù
  [40, -44],
  [78, -50],   // Milazzo
  [96, -44],   // Capo Peloro (Messina, northeast tip)
  [88, -28],
  [76, -6],    // Taormina
  [70, 14],    // Catania
  [74, 32],    // Siracusa
  [64, 50],    // Capo Passero (southeast tip)
  [30, 52],
  [-2, 48],    // Gela
  [-36, 44],   // Agrigento
  [-66, 32],   // Sciacca
  [-88, 22],
];

const N = 720;
const radii = new Float32Array(N);

for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2 - Math.PI;
  const dx = Math.cos(a), dz = Math.sin(a);
  let best = 18;
  for (let s = 0; s < SICILY_OUTLINE.length; s++) {
    const [x1, z1] = SICILY_OUTLINE[s];
    const [x2, z2] = SICILY_OUTLINE[(s + 1) % SICILY_OUTLINE.length];
    const ex = x2 - x1, ez = z2 - z1;
    const det = -dx * ez + ex * dz;
    if (Math.abs(det) < 1e-9) continue;
    const t = (-x1 * ez + ex * z1) / det;
    const u = (dx * z1 - dz * x1) / det;
    if (t > 0 && u >= -0.001 && u <= 1.001) best = Math.max(best, t);
  }
  radii[i] = best;
}

// distance from the island center to the coast, in the direction of (x, z)
export function coastRadius(x, z) {
  const a = Math.atan2(z, x);
  const f = ((a + Math.PI) / (Math.PI * 2)) * N;
  const i0 = Math.floor(f) % N;
  const i1 = (i0 + 1) % N;
  return radii[i0] + (radii[i1] - radii[i0]) * (f - Math.floor(f));
}

// signed distance inland from the coastline (positive = on land)
export function inlandDepth(x, z) {
  return coastRadius(x, z) - Math.hypot(x, z);
}
