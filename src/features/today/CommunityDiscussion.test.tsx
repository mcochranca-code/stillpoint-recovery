import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { COMMUNITY_NOTES_BOARD_KEY } from '../../domain/communityClient';
import { CommunityDiscussion } from './CommunityDiscussion';

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => [] }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => ({ notify }) }));
vi.mock('../../db/database', () => ({
  db: { communityCredentials: { toArray: vi.fn().mockResolvedValue([]), delete: vi.fn(), put: vi.fn() } },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('standalone Community Notes board', () => {
  it('waits for an explicit open action and fetches only the fixed board key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ comments: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<CommunityDiscussion mode="board" />);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    expect(await screen.findByText('No notes yet. A kind, brief thought can be enough.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.at(0)?.[0]).toBe(`/api/community/comments/${encodeURIComponent(COMMUNITY_NOTES_BOARD_KEY)}`);
  });
});
