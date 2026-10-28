# Stillpoint UI research — 2026-10-28

## Findings

Material Design 3 currently describes search as a global product-navigation entry point. It recommends a visible search bar, suggestions/results as the user types, and grouped result spacing when useful. Its accessibility guidance calls for an accessible search label, announcement of changing suggestions, a predictable initial focus, and arrow-key movement through results. The Material search implementation resources currently list Android and Flutter implementations, not a web implementation, so this project uses its existing React components and accessibility patterns rather than copying platform-specific code.

Google's adaptive-app guidance recommends replacing navigation components as the available window changes instead of simply shrinking them. Its examples use bottom navigation on standard phones and a navigation rail on larger windows. The existing app already switches from a desktop sidebar to a mobile bottom bar; this review identifies the intermediate 701–900 CSS-pixel range as a place to use a compact rail rather than a narrow text sidebar.

WCAG 2.2 Success Criterion 2.5.8 sets a 24-by-24 CSS-pixel minimum pointer target, subject to stated exceptions. The W3C understanding document also encourages larger targets for important controls. Quick Find and tablet navigation controls therefore use a more comfortable target size where the layout permits, while preserving the existing compact phone navigation.

## Repository review and implementation choice

On October 28, the connected public repository had no newer app-code commit after `38aeabe` (“feat: add in-app recovery milestone tokens”); the later upstream `5d4495b` commit only added a technical-design-template document. The update below is therefore a small, research-led enhancement rather than a cherry-pick of an unreviewed feature.

Implement a local Quick Find dialog that searches only a static list of real destinations and safe in-app actions. Provide a visible entry point on desktop and mobile, plus `Ctrl/⌘ K`, grouped suggestions, a live result count, arrow-key result navigation, and the existing focus-trap/Escape behavior. Do not index personal recovery data or send queries to any server. Adapt the existing sidebar to an icon rail at tablet widths while keeping labels accessible and retaining the bottom bar on compact mobile screens.

## Sources

- [Material Design 3 — Search overview](https://m3.material.io/components/search/overview)
- [Material Design 3 — Search accessibility](https://m3.material.io/components/search/accessibility)
- [Android Developers — Get started with adaptive apps](https://developer.android.com/develop/ui/compose/layouts/adaptive)
- [W3C — Understanding WCAG 2.2 SC 2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Stillpoint Recovery — GitHub commits](https://github.com/mcochranca-code/stillpoint-recovery/commits/main)
