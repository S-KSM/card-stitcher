import type { Point, Quad } from './types';

export function orderCorners(pts: Point[]): Quad {
  if (pts.length !== 4) throw new Error('orderCorners needs exactly 4 points');
  const sum = pts.map((p) => p.x + p.y);
  const diff = pts.map((p) => p.y - p.x);
  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];
  const tr = pts[diff.indexOf(Math.min(...diff))];
  const bl = pts[diff.indexOf(Math.max(...diff))];
  return [tl, tr, br, bl];
}

export function quadArea(q: Quad): number {
  // Shoelace formula
  let s = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function targetDimensions(q: Quad): { width: number; height: number } {
  const width = Math.max(dist(q[0], q[1]), dist(q[3], q[2]));
  const height = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  return { width: Math.round(width), height: Math.round(height) };
}

export function scaleQuad(q: Quad, sx: number, sy: number): Quad {
  return q.map((p) => ({ x: p.x * sx, y: p.y * sy })) as Quad;
}

export function defaultInsetQuad(width: number, height: number, inset = 0.08): Quad {
  const ix = width * inset;
  const iy = height * inset;
  return [
    { x: ix, y: iy },
    { x: width - ix, y: iy },
    { x: width - ix, y: height - iy },
    { x: ix, y: height - iy },
  ];
}
