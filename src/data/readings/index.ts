import type { ReadingEntry, TraditionId } from '../../domain/types';
import { buddhistReadings } from './buddhist';
import { christianReadings } from './christian';
import { hinduReadings } from './hindu';
import { jainReadings } from './jain';
import { muslimReadings } from './muslim';
import { redRoadReadings } from './red-road';
import { reflectiveReadings } from './reflective';

/** Every bundled daily reading, grouped by tradition. See CONTENT_SOURCES.md for sources and licenses. */
export const readingsByTradition: Record<TraditionId, readonly ReadingEntry[]> = {
  christian: christianReadings,
  buddhist: buddhistReadings,
  hindu: hinduReadings,
  muslim: muslimReadings,
  jain: jainReadings,
  'red-road': redRoadReadings,
  reflective: reflectiveReadings,
};

export const allReadings: readonly ReadingEntry[] = Object.values(readingsByTradition).flat();

const byId = new Map(allReadings.map((entry) => [entry.id, entry]));

export function findReading(id: string): ReadingEntry | undefined {
  return byId.get(id);
}
