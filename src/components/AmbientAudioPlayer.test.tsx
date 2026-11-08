import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientAudioPlayer } from './AmbientAudioPlayer';

const playMock = vi.fn<() => Promise<void>>();
const pauseMock = vi.fn();

beforeEach(() => {
  playMock.mockReset().mockResolvedValue(undefined);
  pauseMock.mockReset();
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseMock });
});

afterEach(() => { vi.unstubAllGlobals(); });

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

  it('applies the labeled volume slider to native media when Web Audio is unavailable', () => {
    render(<AmbientAudioPlayer context="reflection" />);
    const audio = document.querySelector('audio') as HTMLAudioElement;

    fireEvent.change(screen.getByLabelText(/Volume/), { target: { value: '40' } });
    expect(audio.volume).toBeCloseTo(0.4);
  });

  it('uses a local Web Audio gain node for volume on browsers where native volume is unreliable', async () => {
    const setValueAtTime = vi.fn();
    const setTargetAtTime = vi.fn();
    const gain = {
      gain: { setValueAtTime, setTargetAtTime },
      connect: vi.fn(),
    } as unknown as GainNode;
    const createGain = vi.fn(() => gain);
    const createMediaElementSource = vi.fn(() => ({ connect: vi.fn() } as unknown as MediaElementAudioSourceNode));
    class MockAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = {} as AudioDestinationNode;
      createGain = createGain;
      createMediaElementSource = createMediaElementSource;
      resume = vi.fn(async () => { this.state = 'running'; });
      close = vi.fn(async () => { this.state = 'closed'; });
    }
    vi.stubGlobal('AudioContext', MockAudioContext);

    render(<AmbientAudioPlayer context="reflection" />);
    fireEvent.change(screen.getByLabelText('Soundscape'), { target: { value: 'rain' } });
    fireEvent.change(screen.getByLabelText(/Volume/), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play sound' }));
    await vi.waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText(/Volume/), { target: { value: '45' } });

    expect(createGain).toHaveBeenCalledOnce();
    expect(createMediaElementSource).toHaveBeenCalledOnce();
    expect(setValueAtTime).toHaveBeenCalledWith(0.4, 0);
    expect(setTargetAtTime).toHaveBeenCalledWith(0.45, 0, 0.015);
    expect((document.querySelector('audio') as HTMLAudioElement).volume).toBe(1);
  });
});
