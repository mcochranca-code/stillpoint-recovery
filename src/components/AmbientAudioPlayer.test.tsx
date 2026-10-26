import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientAudioPlayer } from './AmbientAudioPlayer';

const playMock = vi.fn<() => Promise<void>>();
const pauseMock = vi.fn();

beforeEach(() => {
  playMock.mockReset().mockResolvedValue(undefined);
  pauseMock.mockReset();
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseMock });
});

describe('AmbientAudioPlayer', () => {
  it('starts silent and plays only after a user selects and starts a soundscape', async () => {
    render(<AmbientAudioPlayer context="reflection" />);
    expect(screen.getByRole('status').textContent).toContain('Ambient audio is off.');
    expect(playMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Soundscape'), { target: { value: 'rain' } });
    expect(playMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play sound' }));
    await vi.waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
  });

  it('stops audio when a meditation is paused and does not auto-resume it', async () => {
    const view = render(<AmbientAudioPlayer context="meditation" sessionStatus="running" />);
    fireEvent.change(screen.getByLabelText('Soundscape'), { target: { value: 'woodland' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play sound' }));
    await vi.waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    view.rerender(<AmbientAudioPlayer context="meditation" sessionStatus="paused" />);
    expect(pauseMock).toHaveBeenCalled();
    view.rerender(<AmbientAudioPlayer context="meditation" sessionStatus="running" />);
    expect(playMock).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Play sound' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
