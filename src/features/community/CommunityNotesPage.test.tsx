import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { defaultPreferences } from '../../db/repository';
import { CommunityNotesPage } from './CommunityNotesPage';

const mocks = vi.hoisted(() => ({
  updatePreferences: vi.fn().mockResolvedValue(undefined),
  notify: vi.fn(),
  enabled: true,
}));

vi.mock('../../app/AppContext', () => ({
  useAppContext: () => ({
    preferences: { ...defaultPreferences(), communityNotesEnabled: mocks.enabled },
    updatePreferences: mocks.updatePreferences,
    notify: mocks.notify,
  }),
}));

vi.mock('../today/CommunityDiscussion', () => ({
  CommunityDiscussion: ({ mode }: { mode: string }) => <section data-testid="community-discussion" data-mode={mode} />,
}));

describe('CommunityNotesPage', () => {
  it('presents a dedicated shared route when enabled', () => {
    mocks.enabled = true;
    render(<CommunityNotesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Community Notes' })).toBeTruthy();
    expect(screen.getByText(/independently of any single Stillpoint reflection/i)).toBeTruthy();
    expect(screen.getByText(/public and hosted for up to 90 days/i)).toBeTruthy();
    expect(screen.getByTestId('community-discussion').getAttribute('data-mode')).toBe('board');
  });

  it('does not mount the hosted board while the feature is off', () => {
    mocks.enabled = false;
    render(<CommunityNotesPage />);

    expect(screen.getByRole('heading', { name: 'Community Notes are turned off' })).toBeTruthy();
    expect(screen.queryByTestId('community-discussion')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Community Notes' }));
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ communityNotesEnabled: true });
  });
});
