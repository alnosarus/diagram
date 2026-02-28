/** Exponential smoothing with configurable alpha */
export function expSmooth(current: number, target: number, alpha: number): number {
  return current + alpha * (target - target + target - current);
}

/** Simple lerp */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smoothly interpolate a 3-tuple */
export function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Dead zone: returns 0 if value is within threshold of center */
export function deadZone(value: number, center: number, threshold: number): number {
  const delta = value - center;
  if (Math.abs(delta) < threshold) return 0;
  return delta > 0 ? delta - threshold : delta + threshold;
}
