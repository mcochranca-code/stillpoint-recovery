export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorTheme = 'stillpoint' | 'catppuccin' | 'monokai' | 'obsidian' | 'lucide';
export type GardenStyle = 'woodland' | 'desert-bloom';
export type JournalType =
  | 'daily-reflection'
  | 'gratitude'
  | 'emotional-check-in'
  | 'milestone'
  | 'trigger'
  | 'prayer'
  | 'free-writing'
  | 'meditation'
  | 'victory';
export type Mood = 'peaceful' | 'hopeful' | 'steady' | 'anxious' | 'sad' | 'angry' | 'tired' | 'grateful';
export type CharmCategory = 'sobriety' | 'reflection' | 'journaling' | 'meditation' | 'gratitude' | 'scripture' | 'resilience';
export type MeditationVisual = 'orb' | 'box' | 'ripples' | 'horizon' | 'particles';
export type SessionStatus = 'running' | 'paused' | 'completed' | 'ended';

export interface MeetingReminderRecord {
  id: string;
  meetingId: string;
  leadMinutes: 15 | 30 | 60;
  createdAt: string;
  lastNotifiedOccurrenceAt?: string;
}

export interface UserPreferences {
  id: 'preferences';
  schemaVersion: number;
  onboardingComplete: boolean;
  theme: ThemeMode;
  colorTheme: ColorTheme;
  highContrast: boolean;
  reducedMotion: boolean;
  hideMeditationVisual: boolean;
  textScale: number;
  timeFormat: '12h' | '24h';
  counterStyle: 'days' | 'full';
  liveCounter: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  meetingReminders?: MeetingReminderRecord[];
  trustedContacts: string[];
  supportResources: string[];
  discreetMode: boolean;
  gardenStyle: GardenStyle;
  allowBreathHolds: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryProfile {
  id: 'recovery-profile';
  schemaVersion: number;
  startAt: string | null;
  localStartDate: string | null;
  localStartTime: string | null;
  startTimeZone: string | null;
  focus: string;
  intention: string;
  updatedAt: string;
}

export interface RecoveryDateHistory {
  id: string;
  previousStartAt: string | null;
  nextStartAt: string | null;
  recordedAt: string;
  note?: string;
}

export interface DailyReflection {
  id: string;
  localDate: string;
  reflectionId: string;
  reflectedAt?: string;
  favorite: boolean;
  favoriteKey?: 0 | 1;
  exploredAt: string;
}

export interface ScriptureEntry {
  id: string;
  reference: string;
  translation: string;
  verse: string;
  explanation: string;
  principle: string;
  application: string;
  contemplation: string;
}

export interface ScriptureActivity {
  id: string;
  scriptureId: string;
  favorite: boolean;
  favoriteKey?: 0 | 1;
  exploredAt: string;
}

export interface JournalEntry {
  id: string;
  type: JournalType;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  mood?: Mood;
  tags: string[];
  gratitude: string[];
  trigger?: string;
  copingStrategy?: string;
}

export interface JournalDraft {
  id: 'active-journal-draft';
  type: JournalType;
  title: string;
  body: string;
  dateTimeLocal?: string;
  mood?: Mood;
  tags: string[];
  gratitude: string[];
  trigger?: string;
  copingStrategy?: string;
  updatedAt: string;
}

export interface BreathPhase {
  label: 'Breathe in' | 'Hold' | 'Breathe out' | 'Rest' | 'Notice' | 'Release' | 'Soften';
  seconds: number;
}

export interface MeditationExercise {
  id: string;
  name: string;
  category: 'breathing' | 'grounding' | 'reflection' | 'sleep';
  description: string;
  instructions: string[];
  visual: MeditationVisual;
  phases: BreathPhase[];
  paceSeconds: number;
  holdOptional: boolean;
}

export interface MeditationSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  plannedMinutes: 2 | 5 | 10 | 20;
  elapsedSeconds: number;
  startedAt: string;
  completedAt?: string;
  status: 'completed' | 'ended';
  reflection?: string;
}

export interface ActiveMeditationSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  plannedMinutes: 2 | 5 | 10 | 20;
  elapsedMs: number;
  segmentStartedAt?: number;
  status: 'running' | 'paused';
  createdAt: string;
}

export interface CharmDefinition {
  id: string;
  name: string;
  category: CharmCategory;
  description: string;
  criteria: string;
  image: string;
  milestoneDays?: number;
}

export interface EarnedCharm {
  id: string;
  charmId: string;
  earnedAt: string;
  memory?: string;
}

export interface FieldGuideNote {
  id: string;
  kind: 'strategy' | 'trigger' | 'reflection' | 'prayer' | 'note';
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResetRecord {
  id: string;
  feeling: string;
  practice: string;
  nextStep: string;
  createdAt: string;
  completed: boolean;
}

export interface DailyActivity {
  id: string;
  localDate: string;
  reflectionsCompleted: number;
  scriptureExplored: number;
  meditationMinutes: number;
  journalEntries: number;
  gratitudeEntries: number;
}

export interface PersonalGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  createdAt: string;
}

export interface PersonalMilestone {
  id: string;
  label: string;
  daysAfterStart: number;
  createdAt: string;
  achievedAt?: string;
}

export interface ReflectionContent {
  id: string;
  title: string;
  theme: string;
  reading: string;
  principle: string;
  practice: string;
  question: string;
}

export type ScriptureContent = ScriptureEntry;

export interface BackupPayload {
  application: 'stillpoint-recovery';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}
