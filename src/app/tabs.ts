import type { KeyboardEvent } from 'react';

/** Stable ids that tie a tab button to the panel it controls. */
export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const tabPanelId = (prefix: string) => `${prefix}-panel`;

/**
 * WAI-ARIA tabs keyboard model (automatic activation): Left/Right (and Up/Down)
 * move between tabs, Home/End jump to the ends, and the newly focused tab is
 * selected. Only the selected tab is in the Tab order (roving tabindex), so Tab
 * moves straight into the panel.
 */
export function handleTabListKeyDown<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  prefix: string,
  ids: readonly T[],
  current: T,
  select: (id: T) => void,
) {
  const index = ids.indexOf(current);
  if (index < 0 || !ids.length) return;
  let next = index;
  switch (event.key) {
    case 'ArrowRight': case 'ArrowDown': next = (index + 1) % ids.length; break;
    case 'ArrowLeft': case 'ArrowUp': next = (index - 1 + ids.length) % ids.length; break;
    case 'Home': next = 0; break;
    case 'End': next = ids.length - 1; break;
    default: return;
  }
  event.preventDefault();
  const nextId = ids[next]!;
  select(nextId);
  document.getElementById(tabId(prefix, nextId))?.focus();
}

/** Props for one tab button in a roving-tabindex tablist. */
export function tabProps(prefix: string, id: string, selected: boolean) {
  return {
    id: tabId(prefix, id),
    role: 'tab' as const,
    type: 'button' as const,
    'aria-selected': selected,
    'aria-controls': tabPanelId(prefix),
    tabIndex: selected ? 0 : -1,
  };
}
