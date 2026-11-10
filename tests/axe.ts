import axe from 'axe-core';

/**
 * Run axe-core against a rendered subtree and return readable violations.
 * Color contrast is checked separately against the design tokens
 * (src/styles/contrast.test.ts) because jsdom cannot compute rendered colors.
 * Asset preloading is off: jsdom never loads <video>/<audio> media, so axe would otherwise
 * wait out its media timeout on any screen that has one (the walkthrough video).
 */
export async function axeViolations(container: Element, disabledRules: string[] = []) {
  const rules: Record<string, { enabled: boolean }> = { 'color-contrast': { enabled: false } };
  for (const rule of disabledRules) rules[rule] = { enabled: false };
  const results = await axe.run(container, { rules, resultTypes: ['violations'], preload: false });
  return results.violations.map((violation) => `${violation.id}: ${violation.help} → ${violation.nodes.map((node) => node.target.join(' ')).slice(0, 3).join(' | ')}`);
}
