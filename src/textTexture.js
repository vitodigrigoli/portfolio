import * as THREE from 'three';

// Renders crisp text onto a canvas and returns a transparent plane mesh.
// Used for zone signs and project labels — avoids shipping font/glyph assets.
export function makeTextPlane(text, {
  size = 1,
  color = '#fdf6ec',
  bg = null,
  weight = 700,
  letterSpacing = 8,
  padding = 30,
} = {}) {
  const fontPx = 90;
  const fontStack = `-apple-system, "Inter", sans-serif`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${weight} ${fontPx}px ${fontStack}`;

  // measure with manual letter-spacing
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width + letterSpacing;
  width = Math.max(width - letterSpacing, 1);

  canvas.width = THREE.MathUtils.ceilPowerOfTwo(width + padding * 2);
  canvas.height = THREE.MathUtils.ceilPowerOfTwo(fontPx * 1.5 + padding * 2);

  if (bg) {
    ctx.fillStyle = bg;
    const r = 40;
    const w = canvas.width, h = canvas.height;
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, r);
    ctx.fill();
  }

  ctx.font = `${weight} ${fontPx}px ${fontStack}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  let x = (canvas.width - width) / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, canvas.height / 2 + fontPx * 0.06);
    x += ctx.measureText(ch).width + letterSpacing;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const aspect = canvas.width / canvas.height;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size * aspect, size),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  return mesh;
}
