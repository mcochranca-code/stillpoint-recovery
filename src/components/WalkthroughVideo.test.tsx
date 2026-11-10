import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../tests/axe';
import { WALKTHROUGH_STEPS, WalkthroughVideo } from './WalkthroughVideo';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let observers: ObserverCallback[] = [];

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback) { observers.push(callback); }
  observe() { /* driven by setInView below */ }
  disconnect() { /* nothing to release */ }
  unobserve() { /* nothing to release */ }
  takeRecords() { return []; }
}

function setInView(visible: boolean) {
  act(() => { for (const callback of observers) callback([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); });
}

function mockReducedMotionQuery(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
}

let play: ReturnType<typeof vi.fn>;
let pause: ReturnType<typeof vi.fn>;

beforeEach(() => {
  observers = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  mockReducedMotionQuery(false);
  // jsdom has no media pipeline: stand in for play/pause and fire the events a browser would.
  play = vi.fn(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('play')); return Promise.resolve(); });
  pause = vi.fn(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('pause')); });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play as never);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WalkthroughVideo', () => {
  it('is a muted, inline, looping, lazy video with self-hosted WebM and MP4 sources and a poster', () => {
    const { container } = render(<WalkthroughVideo />);
    const video = container.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('preload', 'none');
    expect(video).toHaveAttribute('poster', '/media/walkthrough-poster.webp');
    expect(video).not.toHaveAttribute('autoplay');
    expect([...video.querySelectorAll('source')].map((source) => [source.getAttribute('src'), source.getAttribute('type')])).toEqual([
      ['/media/walkthrough.webm', 'video/webm'],
      ['/media/walkthrough.mp4', 'video/mp4'],
    ]);
    expect(video).toHaveAccessibleName(/Stillpoint walkthrough/);
    expect(video).toHaveAccessibleDescription(expect.stringContaining('Meditation studio'));
    expect(screen.getAllByRole('listitem')).toHaveLength(WALKTHROUGH_STEPS.length);
  });

  it('autoplays only once it is on screen, and pauses when scrolled away', () => {
    render(<WalkthroughVideo />);
    expect(play).not.toHaveBeenCalled();
    setInView(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pause the walkthrough video' })).toBeInTheDocument();
    setInView(false);
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play the walkthrough video' })).toBeInTheDocument();
  });

  it('never autoplays with the in-app Reduced motion setting on', () => {
    render(<WalkthroughVideo reducedMotion />);
    setInView(true);
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play the walkthrough video' })).toBeInTheDocument();
    expect(screen.getByText(/waits for you to press Play/)).toBeInTheDocument();
  });

  it('never autoplays when the device prefers reduced motion', () => {
    mockReducedMotionQuery(true);
    render(<WalkthroughVideo />);
    setInView(true);
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play the walkthrough video' })).toBeInTheDocument();
  });

  it('never autoplays without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<WalkthroughVideo />);
    expect(play).not.toHaveBeenCalled();
  });

  it('the Play/Pause toggle works, and a pause is respected when the video scrolls back into view', () => {
    render(<WalkthroughVideo reducedMotion />);
    fireEvent.click(screen.getByRole('button', { name: 'Play the walkthrough video' }));
    expect(play).toHaveBeenCalledTimes(1);
    const toggle = screen.getByRole('button', { name: 'Pause the walkthrough video' });
    expect(toggle).toHaveTextContent('Pause');
    fireEvent.click(toggle);
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play the walkthrough video' })).toHaveTextContent('Play');
    const playsBefore = play.mock.calls.length;
    setInView(false);
    setInView(true);
    expect(play).toHaveBeenCalledTimes(playsBefore);
  });

  it('a pause made during autoplay sticks', () => {
    render(<WalkthroughVideo />);
    setInView(true);
    fireEvent.click(screen.getByRole('button', { name: 'Pause the walkthrough video' }));
    setInView(false);
    setInView(true);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('has no detectable accessibility violations, paused or playing', async () => {
    const { container } = render(<WalkthroughVideo reducedMotion size="compact" />);
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Play the walkthrough video' }));
    expect(await axeViolations(container)).toEqual([]);
  });
});
