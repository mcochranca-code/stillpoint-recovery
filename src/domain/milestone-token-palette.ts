export interface MilestoneTokenPalette {
  color: string;
  foil: string;
  ink: string;
}

const naKeytagPalettes: Record<string, MilestoneTokenPalette> = {
  '24-hours': { color: '#fcfcfc', foil: '#cc9900', ink: '#cc9900' },
  '30-days': { color: '#ff4500', foil: '#ffffff', ink: '#ffffff' },
  '60-days': { color: '#00c853', foil: '#ffffff', ink: '#ffffff' },
  '90-days': { color: '#d50000', foil: '#ffffff', ink: '#ffffff' },
  'calendar-6-months': { color: '#0066ff', foil: '#ffffff', ink: '#ffffff' },
  'calendar-9-months': { color: '#ffd600', foil: '#111111', ink: '#111111' },
  'calendar-12-months': { color: '#d8f8d0', foil: '#005500', ink: '#005500' },
  'calendar-18-months': { color: '#78909c', foil: '#ffffff', ink: '#ffffff' },
};

const aaMedallionPalettes: Record<string, MilestoneTokenPalette> = {
  '24-hours': { color: '#b0b8c0', foil: '#e2e8f0', ink: '#18202b' },
  '30-days': { color: '#c8102e', foil: '#ff3b5c', ink: '#fff3e7' },
  '60-days': { color: '#d4af37', foil: '#f3e5ab', ink: '#382600' },
  '90-days': { color: '#006a4e', foil: '#10b981', ink: '#ecfff4' },
  'calendar-6-months': { color: '#0055b8', foil: '#3b82f6', ink: '#f3f8ff' },
  'calendar-9-months': { color: '#6b21a8', foil: '#c084fc', ink: '#fff5ff' },
  'calendar-12-months': { color: '#b8860b', foil: '#f3e5ab', ink: '#1c1503' },
  'calendar-18-months': { color: '#b8860b', foil: '#f3e5ab', ink: '#1c1503' },
};

const longTermNaKeytag: MilestoneTokenPalette = { color: '#151518', foil: '#d4af37', ink: '#d4af37' };
const longTermAaMedallion: MilestoneTokenPalette = { color: '#b8860b', foil: '#f3e5ab', ink: '#1c1503' };

/** Return the source-based colorway for the current NA keytag or AA medallion. */
export function milestoneTokenArtworkPalette(id: string, style: 'keytag' | 'medallion'): MilestoneTokenPalette {
  if (style === 'keytag') return naKeytagPalettes[id] ?? longTermNaKeytag;
  return aaMedallionPalettes[id] ?? longTermAaMedallion;
}
