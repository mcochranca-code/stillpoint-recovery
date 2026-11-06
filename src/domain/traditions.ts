import type { ContentPreset, RecoveryTheme, TraditionId, TraditionMode, TraditionPreference } from './types';

export interface TraditionInfo {
  id: TraditionId;
  label: string;
  /** One line shown on the picker card. */
  description: string;
  /** Where the readings come from, in plain words. */
  sources: string;
  /** A visible note shown with every reading from this tradition, when one is needed. */
  note?: string;
}

/** Display order for the picker and for "rotate through all". */
export const TRADITIONS: readonly TraditionInfo[] = [
  {
    id: 'christian', label: 'Christian',
    description: 'Scripture for the journey, with a short explanation and practice.',
    sources: 'Holy Bible, King James Version',
  },
  {
    id: 'buddhist', label: 'Buddhist',
    description: 'Verses on the mind, patience and letting go, plus reflections on mindfulness.',
    sources: 'Dhammapada (Max Müller, 1881) · original reflections inspired by Pema Chödrön and Thich Nhat Hanh',
  },
  {
    id: 'hindu', label: 'Hindu',
    description: 'Steadiness, right action and devotion from the Gita and the Bhagavatam.',
    sources: 'Bhagavad Gita (Edwin Arnold, 1885) · Srimad Bhagavatam (original paraphrases with verse citations)',
  },
  {
    id: 'muslim', label: 'Muslim',
    description: 'Mercy, patience and remembrance from the Quran and the Prophet’s teachings.',
    sources: 'The Quran (Marmaduke Pickthall, 1930) · Hadith (original paraphrases with collection and number)',
  },
  {
    id: 'jain', label: 'Jain',
    description: 'Self-mastery, non-harm and forgiveness from the Jain sutras.',
    sources: 'Ācārāṅga and Uttarādhyayana Sūtras (Hermann Jacobi, 1884/1895) · Tattvārtha Sūtra (original paraphrases)',
  },
  {
    id: 'red-road', label: 'Red Road · Native wellbriety',
    description: 'Original reflections on widely shared Red Road recovery values: balance, community and gratitude.',
    sources: 'Stillpoint original reflections, written to point toward Native-led recovery communities',
    note: 'Teachings differ from nation to nation. These are original reflections written by Stillpoint, not teachings of any nation, elder or ceremony. For Native-led recovery, look to White Bison and the Wellbriety Movement, and to the elders and programs of your own community.',
  },
  {
    id: 'reflective', label: 'Spiritual but not religious',
    description: 'Plain-spoken philosophy and reflection, with no faith required.',
    sources: 'Marcus Aurelius, Meditations (George Long, 1862) · Stillpoint original reflections',
  },
];

export const TRADITION_IDS: readonly TraditionId[] = TRADITIONS.map((tradition) => tradition.id);
export const DEFAULT_TRADITION: TraditionId = 'christian';
const MODES: readonly TraditionMode[] = ['one', 'several', 'rotate'];

export const RECOVERY_THEME_LABELS: Record<RecoveryTheme, string> = {
  craving: 'Meeting a craving', shame: 'Releasing shame', surrender: 'Surrender', service: 'Service',
  gratitude: 'Gratitude', patience: 'Patience', community: 'Community',
};

export function isTraditionId(value: unknown): value is TraditionId {
  return typeof value === 'string' && (TRADITION_IDS as readonly string[]).includes(value);
}

export function traditionInfo(id: TraditionId): TraditionInfo {
  return TRADITIONS.find((tradition) => tradition.id === id) ?? TRADITIONS[0]!;
}

/** The preference an existing install should start with, so nothing changes until the person chooses. */
export function traditionPreferenceFromPreset(preset: ContentPreset | undefined): TraditionPreference {
  return { mode: 'one', traditions: [preset === 'faith-neutral' ? 'reflective' : DEFAULT_TRADITION] };
}

/** True only for a well-formed stored preference (used to validate backups). */
export function isTraditionPreference(value: unknown): value is TraditionPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.mode === 'string' && (MODES as readonly string[]).includes(candidate.mode)
    && Array.isArray(candidate.traditions) && candidate.traditions.length <= TRADITION_IDS.length
    && candidate.traditions.every(isTraditionId);
}

/**
 * Repair anything stored by an older or hand-edited record: unknown traditions are dropped,
 * duplicates removed, and an empty list falls back to the content preset's tradition.
 */
export function normalizeTraditionPreference(value: unknown, preset?: ContentPreset): TraditionPreference {
  const fallback = traditionPreferenceFromPreset(preset);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const candidate = value as Record<string, unknown>;
  const mode = typeof candidate.mode === 'string' && (MODES as readonly string[]).includes(candidate.mode) ? candidate.mode as TraditionMode : 'one';
  const listed = Array.isArray(candidate.traditions) ? candidate.traditions.filter(isTraditionId) : [];
  const traditions = TRADITION_IDS.filter((id) => listed.includes(id));
  if (mode === 'rotate') return { mode, traditions: traditions.length ? traditions : fallback.traditions };
  if (!traditions.length) return { mode: 'one', traditions: fallback.traditions };
  if (mode === 'one') return { mode, traditions: [listed.find(isTraditionId)!] };
  return { mode, traditions };
}
