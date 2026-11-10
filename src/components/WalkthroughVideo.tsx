import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './WalkthroughVideo.css';

/** What the tour shows, in order. Read as the video's description and listed under "What the tour shows". */
export const WALKTHROUGH_STEPS = [
  'Today: the days-in-recovery counter, progress toward the next milestone and the next charm.',
  'The day’s reflection, from the readings you choose.',
  'The Meditation studio, with short guided breathing practices.',
  'Progress: your path so far, this week’s practice and recently earned charms.',
  'The Journal, a private writing space stored on this device.',
  'Dark mode, switched on in Settings, back on Today.',
] as const;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Track the device's reduced-motion setting, following changes while the page is open. */
function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(systemPrefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export interface WalkthroughVideoProps {
  /** The in-app Reduced motion setting. When on (or the device asks for reduced motion), the tour never starts by itself. */
  reducedMotion?: boolean;
  /** `compact` keeps the frame small where it sits above other controls (onboarding). */
  size?: 'compact' | 'regular';
  className?: string;
}

/**
 * A short, silent, self-hosted tour of Stillpoint. It is served from this site (no third-party
 * player, no tracking), loads nothing until it is played or scrolled into view, and only plays
 * by itself when it is on screen and nobody has asked for reduced motion. A Play/Pause control is
 * always visible, and a text list describes what the tour shows.
 */
export function WalkthroughVideo({ reducedMotion = false, size = 'regular', className = '' }: WalkthroughVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  // Once someone pauses (or plays) it themselves, scrolling never overrides their choice.
  const [userChoice, setUserChoice] = useState<'play' | 'pause' | null>(null);
  // null until an IntersectionObserver reports; without one the video never autoplays.
  const [inView, setInView] = useState<boolean | null>(null);
  const systemReduced = useSystemReducedMotion();
  const motionReduced = reducedMotion || systemReduced;
  const descriptionId = useId();

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => setPlaying(false));
    } catch {
      setPlaying(false);
    }
  }, []);

  const playingRef = useRef(false);
  playingRef.current = playing;
  const pause = useCallback(() => {
    // Only pause something that is playing, so an idle poster never touches the media element.
    if (!playingRef.current) return;
    try { videoRef.current?.pause(); } catch { /* nothing is playing */ }
  }, []);

  // Watch whether the frame is on screen. Without IntersectionObserver it simply never autoplays.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) setInView(entry.isIntersecting && entry.intersectionRatio >= 0.5);
    }, { threshold: [0, 0.5, 1] });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Autoplay only in view, only without reduced motion, and never against the person's own choice.
  useEffect(() => {
    if (userChoice === 'pause') return;
    if (userChoice === 'play') {
      // Their own Play: rest while scrolled away, pick up again on return.
      if (inView === false) pause();
      else if (inView) play();
      return;
    }
    if (inView && !motionReduced) play();
    else pause();
  }, [inView, motionReduced, userChoice, play, pause]);

  function toggle() {
    if (playing) {
      setUserChoice('pause');
      pause();
    } else {
      setUserChoice('play');
      play();
    }
  }

  const label = playing ? 'Pause the walkthrough video' : 'Play the walkthrough video';

  return (
    <figure className={`walkthrough ${size === 'compact' ? 'walkthrough-compact' : ''} ${className}`.trim()}>
      <div ref={frameRef} className={`walkthrough-frame${playing ? ' is-playing' : ''}`}>
        <video
          ref={videoRef}
          className="walkthrough-video"
          muted
          playsInline
          loop
          preload="none"
          poster="/media/walkthrough-poster.webp"
          aria-label="Stillpoint walkthrough, a silent 30-second tour of the app"
          aria-describedby={descriptionId}
          onPlay={() => setPlaying(true)}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        >
          <source src="/media/walkthrough.webm" type="video/webm" />
          <source src="/media/walkthrough.mp4" type="video/mp4" />
        </video>
        <button
          type="button"
          className={`walkthrough-toggle${playing ? '' : ' is-paused'}`}
          aria-label={label}
          title={label}
          onClick={toggle}
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          <span aria-hidden="true">{playing ? 'Pause' : 'Play'}</span>
        </button>
      </div>
      <figcaption className="walkthrough-caption">
        <span>A silent 30-second tour with sample data. {motionReduced ? 'It waits for you to press Play.' : 'It plays while on screen; pause any time.'}</span>
        <details className="walkthrough-transcript">
          <summary>What the tour shows</summary>
          <ol id={descriptionId}>{WALKTHROUGH_STEPS.map((step) => <li key={step}>{step}</li>)}</ol>
        </details>
      </figcaption>
    </figure>
  );
}
