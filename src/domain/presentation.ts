/** Convert a current/target pair to a rounded percentage bounded to 0–100. */
export function clampProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/** Format a count with a simple singular/plural noun. */
export function formatCount(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}
