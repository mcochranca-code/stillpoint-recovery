import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

type SoundscapeId = 'rain' | 'woodland' | 'shoreline';
type SessionStatus = 'idle' | 'running' | 'paused' | 'complete';

const soundscapes: Record<SoundscapeId, { label: string; src: string }> = {
  rain: { label: 'Gentle rain', src: '/assets/audio/gentle-rain.mp3' },
  woodland: { label: 'Quiet woodland', src: '/assets/audio/quiet-woodland.mp3' },
  shoreline: { label: 'Soft shoreline', src: '/assets/audio/soft-shoreline.mp3' },
};

interface AmbientAudioPlayerProps {
  context: 'meditation' | 'reflection';
  sessionStatus?: SessionStatus;
}

export function AmbientAudioPlayer({ context, sessionStatus = 'idle' }: AmbientAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousStatus = useRef<SessionStatus>(sessionStatus);
  const [selected, setSelected] = useState<SoundscapeId | 'off'>('off');
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(22);
  const [error, setError] = useState('');
  const selectedSoundscape = selected === 'off' ? null : soundscapes[selected];
  const playbackBlocked = context === 'meditation' && (sessionStatus === 'paused' || sessionStatus === 'complete');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
  }, [volume, selected]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    if (audio.readyState > 0) audio.currentTime = 0;
    setPlaying(false);
    setError('');
  }, [selected]);

  useEffect(() => {
    const previous = previousStatus.current;
    if (sessionStatus === 'paused' || sessionStatus === 'complete' || (previous === 'running' && sessionStatus !== 'running')) {
      audioRef.current?.pause();
      setPlaying(false);
    }
    previousStatus.current = sessionStatus;
  }, [sessionStatus]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !selectedSoundscape || playbackBlocked) return;
    setError('');
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError('This soundscape could not be played. You can continue in silence or choose another.');
    }
  }

  function stopPlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  }

  return (
    <section className="ambient-player" aria-labelledby={`ambient-title-${context}`}>
      <div className="ambient-player-heading">
        <div><p className="eyebrow">Optional, local sound</p><h3 id={`ambient-title-${context}`}>A little atmosphere</h3></div>
        <span className="pill">Silent by default</span>
      </div>
      <p className="ambient-player-note">Choose a gentle loop only if it helps. No voices or external streams; silence is always available.</p>
      <div className="ambient-controls">
        <label className="ambient-select-label" htmlFor={`ambient-select-${context}`}>Soundscape
          <select id={`ambient-select-${context}`} value={selected} onChange={(event) => setSelected(event.target.value as SoundscapeId | 'off')}>
            <option value="off">Off — stay in silence</option>
            <option value="rain">Gentle rain</option>
            <option value="woodland">Quiet woodland</option>
            <option value="shoreline">Soft shoreline</option>
          </select>
        </label>
        <label className="ambient-volume-label" htmlFor={`ambient-volume-${context}`}>
          <span><Volume2 size={15} aria-hidden="true" /> Volume <small>(limited to 50%)</small></span>
          <input id={`ambient-volume-${context}`} type="range" min="0" max="50" step="1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-valuetext={`${volume} percent, maximum 50 percent`} />
        </label>
      </div>
      <div className="ambient-player-actions">
        <button className="button button-secondary button-small" type="button" onClick={() => void togglePlayback()} disabled={!selectedSoundscape || playbackBlocked} aria-pressed={playing}>
          {playing ? <Pause size={15} aria-hidden="true" /> : selectedSoundscape ? <Play size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          {playing ? 'Pause sound' : selectedSoundscape ? 'Play sound' : 'Sound off'}
        </button>
        <button className="button button-quiet button-small" type="button" onClick={stopPlayback} disabled={!selectedSoundscape || (!playing && !audioRef.current?.currentTime)}>Stop and reset</button>
        {playbackBlocked && <span className="fine-print">Sound is paused with the meditation. Start it again whenever you choose.</span>}
      </div>
      <p className="ambient-status" role="status">{error || (playing ? `${selectedSoundscape?.label} is playing locally.` : selectedSoundscape ? `${selectedSoundscape.label} is selected and not playing.` : 'Ambient audio is off.')}</p>
      <audio ref={audioRef} src={selectedSoundscape?.src} loop preload="none" onError={() => setError('This soundscape could not be loaded. Silence remains available.')} aria-hidden="true" />
    </section>
  );
}
