export interface OrbPosition {
  x: number;
  y: number;
}

const bottomLeft = { x: 16, y: 84 };
const topLeft = { x: 16, y: 16 };
const topRight = { x: 84, y: 16 };
const bottomRight = { x: 84, y: 84 };

function interpolate(from: OrbPosition, to: OrbPosition, progress: number): OrbPosition {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function alongPath(points: OrbPosition[], progress: number): OrbPosition {
  const segments = points.length - 1;
  const scaled = progress * segments;
  const segment = Math.min(segments - 1, Math.floor(scaled));
  return interpolate(points[segment]!, points[segment + 1]!, scaled - segment);
}

/** Map phase indices (inhale, hold, exhale, rest) and phase progress to the orb's square path. */
export function getBoxBreathingOrbPosition(
  phaseIndex: number,
  phaseProgress: number,
  holdsEnabled: boolean,
): OrbPosition {
  const progress = Math.min(1, Math.max(0, phaseProgress));
  if (phaseIndex === 0) return interpolate(bottomLeft, topLeft, progress);
  if (phaseIndex === 1) return interpolate(topLeft, topRight, progress);
  if (phaseIndex === 2) {
    return holdsEnabled
      ? interpolate(topRight, bottomRight, progress)
      : alongPath([topLeft, topRight, bottomRight], progress);
  }
  if (phaseIndex === 3) return interpolate(bottomRight, bottomLeft, progress);
  return topLeft;
}
