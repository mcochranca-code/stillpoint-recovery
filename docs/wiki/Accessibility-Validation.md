# Accessibility validation

Accessibility is a release check for changed user flows, not a one-time audit. The feature author and reviewer share responsibility for the checks below.

## Automated checks

- Pull-request and `main` builds run a Lighthouse accessibility audit against the production app shell. The CI threshold is at least 0.90.
- Vitest covers primary navigation labels and keyboard operation, dialog initial focus, Tab and Shift+Tab containment, Escape dismissal, focus restoration, and the reduced-motion preference control.
- Run `pnpm test`, `pnpm test:coverage`, and `pnpm build` locally when changing a user flow or shared interaction.

## Change checklist

- [ ] Complete the affected flow with keyboard only; controls are reachable in a logical order and have a visible focus indicator.
- [ ] Use semantic headings, landmarks, labels, button names, and status announcements; do not rely on color, position, or icon shape alone.
- [ ] For dialogs, verify focus enters the dialog, remains contained, closes with Escape when appropriate, and returns to the opener.
- [ ] Check text and control contrast in light, dark, and high-contrast settings; verify layouts at 200% zoom and narrow viewport widths.
- [ ] Verify reduced-motion preference and operating-system reduced-motion behavior; essential meaning and controls remain available without animation.
- [ ] For timers or changing content, confirm assistive technology is not flooded with unnecessary announcements.
- [ ] For errors and destructive actions, provide understandable messages, a clear next step, and an explicit confirmation where data may be removed.

Automated scores and DOM tests cannot establish usability for every assistive technology. Manually review changed high-impact flows with keyboard navigation and a screen reader before release when practical; record any known limitation in the pull request.
