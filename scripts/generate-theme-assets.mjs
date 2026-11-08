import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const presets = JSON.parse(await readFile(path.join(root, 'src/data/theme-presets.json'), 'utf8'));
const legacyThemes = new Set(['stillpoint', 'catppuccin', 'monokai', 'obsidian', 'lucide']);
const ids = new Set();

function rgb(hex) {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`Invalid theme color: ${hex}`);
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}
function hex(values) {
  return `#${values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}
function mix(a, b, amount) {
  const from = rgb(a);
  const to = rgb(b);
  return hex(from.map((value, index) => value + ((to[index] - value) * amount)));
}
function rgba(color, alpha) {
  return `rgba(${rgb(color).join(',')},${alpha})`;
}
function luminance(color) {
  const channels = rgb(color).map((value) => value / 255).map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function darken(color, amount) { return mix(color, '#000000', amount); }
function lighten(color, amount) { return mix(color, '#ffffff', amount); }
function textOn(background, preferredDark) {
  return contrast(background, preferredDark) >= contrast(background, '#ffffff') ? preferredDark : '#ffffff';
}
function iconSvg(preset) {
  const [paper, accent, deep] = preset.swatches;
  const ridge = mix(accent, paper, 0.35);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${deep}"/><circle cx="256" cy="240" r="166" fill="${paper}"/><path d="M72 286Q168 220 256 274T440 270V432H72Z" fill="${ridge}"/><path d="M64 326Q164 270 258 316T448 310V440H64Z" fill="${accent}"/><path d="M60 360Q164 314 260 352T452 346V448H60Z" fill="${deep}"/><path d="M256 337Q254 266 256 183" stroke="${deep}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M256 245Q190 238 184 179Q245 175 256 245Z" fill="${deep}"/><path d="M260 215Q266 154 326 153Q320 210 260 215Z" fill="${accent}"/></svg>`;
}
function themeCss(preset) {
  const [canvas, accent, deep] = preset.swatches;
  const lightPrimary = accent;
  const darkCanvas = mix(deep, '#080e17', 0.56);
  const darkSurface = mix(deep, '#111a24', 0.62);
  const darkPrimary = lighten(accent, 0.4);
  const lightAccentEnd = darken(accent, 0.34);
  const light = {
    '--canvas': canvas,
    '--surface': mix(canvas, '#ffffff', 0.75),
    '--ink': deep,
    '--muted': mix(deep, '#ffffff', 0.28),
    '--border': rgba(deep, 0.18),
    '--shadow': `0 8px 28px ${rgba(deep, 0.11)}`,
    '--primary': lightPrimary,
    '--primary-ink': textOn(lightPrimary, deep),
    '--primary-hover': darken(lightPrimary, 0.14),
    '--primary-soft': rgba(lightPrimary, 0.13),
    '--primary-soft-strong': rgba(lightPrimary, 0.22),
    '--selected-bg': mix(canvas, lightPrimary, 0.17),
    '--selected-ink': deep,
    '--focus-ring': mix(lightPrimary, '#2563eb', 0.34),
    '--eyebrow-color': darken(lightPrimary, 0.13),
    '--sage': lightPrimary,
    '--feature-glow': rgba(lightPrimary, 0.1),
    '--counter-hero-start': deep,
    '--counter-hero-end': lightAccentEnd,
    '--counter-ink': '#fffdf7',
    '--counter-muted': '#edf3ef',
    '--counter-accent': lighten(accent, 0.62),
    '--counter-ring-inner': rgba(deep, 0.88),
  };
  const dark = {
    '--canvas': darkCanvas,
    '--surface': darkSurface,
    '--ink': '#eff4f1',
    '--muted': '#bcc9c2',
    '--border': 'rgba(239,244,241,.17)',
    '--shadow': '0 8px 28px rgba(0,0,0,.36)',
    '--primary': darkPrimary,
    '--primary-ink': textOn(darkPrimary, darkCanvas),
    '--primary-hover': lighten(darkPrimary, 0.13),
    '--primary-soft': rgba(darkPrimary, 0.16),
    '--primary-soft-strong': rgba(darkPrimary, 0.25),
    '--selected-bg': mix(darkCanvas, darkPrimary, 0.19),
    '--selected-ink': '#f2f6f3',
    '--focus-ring': lighten(darkPrimary, 0.22),
    '--eyebrow-color': lighten(darkPrimary, 0.2),
    '--sage': darkPrimary,
    '--feature-glow': rgba(darkPrimary, 0.13),
    '--counter-hero-start': darkCanvas,
    '--counter-hero-end': mix(darkCanvas, deep, 0.55),
    '--counter-ink': '#fffdf7',
    '--counter-muted': '#e4ece7',
    '--counter-accent': lighten(accent, 0.62),
    '--counter-ring-inner': rgba('#080e17', 0.9),
  };
  const rule = (selector, declarations) => `${selector} {\n${Object.entries(declarations).map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`;
  return `${rule(`:root[data-color-theme='${preset.id}']`, light)}\n${rule(`:root.dark[data-color-theme='${preset.id}']`, dark)}`;
}

const iconsDir = path.join(root, 'public/assets/branding/theme-icons');
const manifestsDir = path.join(root, 'public/theme-manifests');
await mkdir(iconsDir, { recursive: true });
await mkdir(manifestsDir, { recursive: true });
const paletteCss = [];
for (const preset of presets) {
  if (!/^[a-z0-9-]+$/.test(preset.id) || ids.has(preset.id)) throw new Error(`Invalid or duplicate theme ID: ${preset.id}`);
  ids.add(preset.id);
  if (!Array.isArray(preset.swatches) || preset.swatches.length !== 3) throw new Error(`Theme ${preset.id} must have three swatches.`);
  preset.swatches.forEach(rgb);
  const iconPath = `/assets/branding/theme-icons/${preset.id}.svg`;
  await writeFile(path.join(iconsDir, `${preset.id}.svg`), `${iconSvg(preset)}\n`);
  const manifest = {
    id: '/',
    name: 'Stillpoint Recovery',
    short_name: 'Stillpoint',
    description: 'A private, gentle daily recovery companion.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: preset.swatches[0],
    theme_color: preset.swatches[0],
    orientation: 'portrait-primary',
    icons: [{ src: iconPath, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    shortcuts: [
      { name: 'Today', short_name: 'Today', url: '/', icons: [{ src: iconPath, sizes: 'any', type: 'image/svg+xml' }] },
      { name: 'I need a moment', short_name: 'Reset', url: '/reset', icons: [{ src: '/assets/meditation/grounding-ripples.svg', sizes: 'any', type: 'image/svg+xml' }] },
      { name: 'Living Garden', short_name: 'Garden', url: '/garden', icons: [{ src: '/assets/charms/steady-footsteps.svg', sizes: 'any', type: 'image/svg+xml' }] },
    ],
  };
  await writeFile(path.join(manifestsDir, `${preset.id}.webmanifest`), `${JSON.stringify(manifest, null, 2)}\n`);
  if (!legacyThemes.has(preset.id)) paletteCss.push(themeCss(preset));
}
if (presets.length !== 15) throw new Error(`Expected 15 total theme palettes; found ${presets.length}.`);
await writeFile(path.join(root, 'public/assets/branding/theme-presets.css'), `${paletteCss.join('\n\n')}\n`);
