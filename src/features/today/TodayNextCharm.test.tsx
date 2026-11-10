import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, defaultRecoveryProfile } from '../../db/repository';

const mocks = vi.hoisted(() => ({ context: {} as never }));

vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../components/AmbientAudioPlayer', () => ({ AmbientAudioPlayer: () => null }));
vi.mock('./NaDailyReadingCard', () => ({ NaDailyReadingCard: () => null }));
vi.mock('./OdbResourcesCard', () => ({ OdbResourcesCard: () => null }));
vi.mock('./CommunityDiscussion', () => ({ CommunityDiscussion: () => null }));
// The background milestone/charm sync is covered elsewhere; keep it from racing these render-only tests.
vi.mock('../../db/achievements', () => ({ awardEligibleCharms: vi.fn().mockResolvedValue([]) }));
vi.mock('../../db/milestones', () => ({ syncReachedMilestones: vi.fn().mockResolvedValue([]) }));
vi.mock('../../db/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/database')>();
  return { ...actual, db: new actual.StillpointDatabase('StillpointRecoveryTodayNextCharmTest') };
});

import { db } from '../../db/database';
import { TodayPage } from './TodayPage';

function setContext(daysAgo: number | null, discreetMode = false) {
  mocks.context = {
    preferences: { ...defaultPreferences(), discreetMode },
    profile: daysAgo === null ? undefined : { ...defaultRecoveryProfile(), startAt: new Date(Date.now() - daysAgo * 86_400_000 - 60_000).toISOString() },
    updatePreferences: vi.fn(),
    notify: vi.fn(),
  } as never;
}

describe('TodayPage next milestone charm', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.preferences.put(defaultPreferences());
  });
  afterEach(() => db.close());

  it('shows the next time-based charm as a dimmed, decorative, non-interactive medallion', () => {
    setContext(10);
    const { container } = render(<MemoryRouter><TodayPage /></MemoryRouter>);
    const strip = container.querySelector('.sobriety-hero .today-next-charm');
    expect(strip).not.toBeNull();
    expect(strip!.textContent).toBe('Next charmDeep Rootsat 30 days');
    const medallion = strip!.querySelector('.charm-medallion')!;
    expect(medallion).toHaveClass('locked', 'is-still', 'charm-medallion--hero');
    expect(medallion).toHaveAttribute('aria-hidden', 'true');
    expect(medallion.querySelector('img')).toHaveAttribute('src', '/assets/charms/deep-roots.svg');
    expect(screen.queryByRole('button', { name: /Spin Deep Roots charm/ })).not.toBeInTheDocument();
  });

  it('names a year in words once 90 days have passed', () => {
    setContext(120);
    const { container } = render(<MemoryRouter><TodayPage /></MemoryRouter>);
    expect(container.querySelector('.today-next-charm')!.textContent).toContain('Year of Growth');
    expect(container.querySelector('.today-next-charm')!.textContent).toContain('at 1 year');
  });

  it('stays out of the way with no date, in discreet mode, or after the last charm', () => {
    for (const [days, discreet] of [[null, false], [10, true], [400, false]] as const) {
      setContext(days, discreet);
      const { container, unmount } = render(<MemoryRouter><TodayPage /></MemoryRouter>);
      expect(container.querySelector('.today-next-charm')).toBeNull();
      unmount();
    }
  });
});
