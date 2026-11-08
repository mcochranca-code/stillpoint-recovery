import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommunityNotesPage } from './CommunityNotesPage';

vi.mock('../today/CommunityDiscussion', () => ({
  CommunityDiscussion: ({ mode }: { mode: string }) => <section data-testid="community-discussion" data-mode={mode} />,
}));

describe('CommunityNotesPage', () => {
  it('presents a dedicated shared route separate from the daily reflection', () => {
    render(<CommunityNotesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Community Notes' })).toBeTruthy();
    expect(screen.getByText(/independently of any single Stillpoint reflection/i)).toBeTruthy();
    expect(screen.getByText(/public and hosted for up to 90 days/i)).toBeTruthy();
    expect(screen.getByTestId('community-discussion').getAttribute('data-mode')).toBe('board');
  });
});
