import axe from 'axe-core';

/**
 * Run axe-core against a rendered subtree and return readable violations.
 * Color contrast is checked separately against the design tokens
 * (src/styles/contrast.test.ts) because jsdom cannot compute rendered colors.
 */
export async function axeViolations(container: Element, disabledRules: string[] = []) {
  const rules: Record<string, { enabled: boolean }> = { 'color-contrast': { enabled: false } };
  for (const rule of disabledRules) rules[rule] = { enabled: false };
  const results = await axe.run(container, { rules, resultTypes: ['violations'] });
  return results.violations.map((violation) => `${violation.id}: ${violation.help} → ${violation.nodes.map((node) => node.target.join(' ')).slice(0, 3).join(' | ')}`);
}
