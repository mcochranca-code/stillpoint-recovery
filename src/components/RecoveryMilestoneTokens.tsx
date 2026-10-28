import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { buildMilestones, formatLocalDate } from '../domain/time';
import './RecoveryMilestoneTokens.css';

type TokenStyle = 'keytag' | 'medallion';
type MilestoneFilter = 'all' | 'reached' | 'upcoming';

type RecoveryMilestoneTokensProps = {
  startAt?: string | null;
  discreetMode?: boolean;
  reducedMotion?: boolean;
  now?: number;
};

type TokenPalette = { color: string; foil: string; ink: string };

const PREVIEW_START = '2020-01-01T00:00:00.000Z';
const milestonePreviewCatalog = buildMilestones(PREVIEW_START);

const milestonePalettes: Record<string, TokenPalette> = {
  '24-hours': { color: '#b0b8c0', foil: '#e2e8f0', ink: '#25313b' },
  '30-days': { color: '#c74732', foil: '#fff1df', ink: '#ffffff' },
  '60-days': { color: '#16884b', foil: '#d8ffe9', ink: '#ffffff' },
  '90-days': { color: '#b3232c', foil: '#ffe4e4', ink: '#ffffff' },
  'calendar-6-months': { color: '#155cae', foil: '#d9e9ff', ink: '#ffffff' },
  'calendar-9-months': { color: '#c6a400', foil: '#fff4b8', ink: '#22200f' },
  'calendar-12-months': { color: '#9a7417', foil: '#f5e6b7', ink: '#fffaf0' },
  'calendar-18-months': { color: '#687b84', foil: '#e5eef1', ink: '#ffffff' },
};

const fallbackPalettes: TokenPalette[] = [
  { color: '#456d5a', foil: '#d8e9d8', ink: '#ffffff' },
  { color: '#536e8f', foil: '#e1eaf7', ink: '#ffffff' },
  { color: '#8a6545', foil: '#f3dfc5', ink: '#ffffff' },
  { color: '#6b6282', foil: '#ebe4ff', ink: '#ffffff' },
];

function paletteFor(id: string, index: number): TokenPalette {
  return milestonePalettes[id] ?? fallbackPalettes[index % fallbackPalettes.length] ?? fallbackPalettes[0]!;
}

/** Show the app's existing date-based milestones as CSS-rendered, locally interactive tokens. */
export function RecoveryMilestoneTokens({
  startAt = null,
  discreetMode = false,
  reducedMotion = false,
  now: fixedNow,
}: RecoveryMilestoneTokensProps) {
  const [style, setStyle] = useState<TokenStyle>('keytag');
  const [filter, setFilter] = useState<MilestoneFilter>('all');
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(() => fixedNow ?? Date.now());

  useEffect(() => {
    if (fixedNow !== undefined) {
      setCurrentTime(fixedNow);
      return undefined;
    }
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [fixedNow]);

  const milestones = useMemo(
    () => startAt ? buildMilestones(startAt) : milestonePreviewCatalog,
    [startAt],
  );

  if (discreetMode) {
    return (
      <section className="recovery-token-panel" aria-labelledby="recovery-token-heading">
        <div className="recovery-token-heading">
          <div>
            <p className="eyebrow">Personal timeline</p>
            <h2 id="recovery-token-heading">Milestone tokens</h2>
            <p className="muted">Token and time details are hidden while discreet mode is on.</p>
          </div>
        </div>
      </section>
    );
  }

  const rows = milestones.map((milestone, index) => ({
    milestone,
    index,
    reached: Boolean(startAt) && milestone.at.getTime() <= currentTime,
    status: !startAt ? 'preview' as const : milestone.at.getTime() <= currentTime ? 'reached' as const : 'upcoming' as const,
  }));
  const reachedCount = rows.filter((row) => row.reached).length;
  const upcomingCount = startAt ? rows.length - reachedCount : 0;
  const visibleRows = rows.filter((row) => {
    if (filter === 'reached') return row.reached;
    if (filter === 'upcoming') return Boolean(startAt) && !row.reached;
    return true;
  });

  return (
    <section className={`recovery-token-panel${reducedMotion ? ' recovery-token-panel--reduced-motion' : ''}`} aria-labelledby="recovery-token-heading">
      <div className="recovery-token-heading">
        <div>
          <p className="eyebrow">Time, marked your way</p>
          <h2 id="recovery-token-heading">Keytags &amp; medallions</h2>
          <p className="muted">Explore the milestones already in your recovery timeline as small, turnable tokens.</p>
        </div>
        <span className="recovery-token-count">{startAt ? `${reachedCount} reached` : 'Preview collection'}</span>
      </div>

      <p className="recovery-token-note">These are personal Stillpoint visuals, not fellowship-issued tokens. The artwork does not change milestone dates, thresholds, or award rules.</p>

      <div className="recovery-token-controls">
        <div className="filter-row" role="group" aria-label="Token display style">
          <button type="button" className={`filter-chip${style === 'keytag' ? ' selected' : ''}`} aria-pressed={style === 'keytag'} onClick={() => setStyle('keytag')}>Keytags</button>
          <button type="button" className={`filter-chip${style === 'medallion' ? ' selected' : ''}`} aria-pressed={style === 'medallion'} onClick={() => setStyle('medallion')}>Medallions</button>
        </div>
        <div className="filter-row" role="group" aria-label="Filter tokens by milestone status">
          <button type="button" className={`filter-chip${filter === 'all' ? ' selected' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All ({rows.length})</button>
          <button type="button" className={`filter-chip${filter === 'reached' ? ' selected' : ''}`} aria-pressed={filter === 'reached'} disabled={!startAt} onClick={() => setFilter('reached')}>Reached ({reachedCount})</button>
          <button type="button" className={`filter-chip${filter === 'upcoming' ? ' selected' : ''}`} aria-pressed={filter === 'upcoming'} disabled={!startAt} onClick={() => setFilter('upcoming')}>Ahead ({upcomingCount})</button>
        </div>
      </div>

      {!startAt && <p className="recovery-token-prompt">Choose a recovery date on Today to see which milestones have been reached. You can still preview and turn every token below.</p>}
      <p className="recovery-token-hint" aria-live="polite">Select a token to turn it over. Its artwork is rendered within the app and works offline.</p>

      {visibleRows.length ? (
        <div className="recovery-token-grid">
          {visibleRows.map(({ milestone, index, reached, status }) => {
            const isFlipped = Boolean(flipped[milestone.id]);
            const currentPalette = paletteFor(milestone.id, index);
            const tokenName = style === 'keytag' ? 'keytag' : 'medallion';
            const tokenColorStyle = {
              '--token-color': currentPalette.color,
              '--token-foil': currentPalette.foil,
              '--token-ink': currentPalette.ink,
            } as CSSProperties;
            const statusText = status === 'preview'
              ? 'Milestone preview'
              : reached
                ? `Reached ${formatLocalDate(milestone.at)}`
                : `Ahead · ${formatLocalDate(milestone.at)}`;

            return (
              <article className="recovery-token-card" data-state={status} key={milestone.id}>
                <button
                  type="button"
                  className={`recovery-token-button recovery-token-button--${style}${isFlipped ? ' is-flipped' : ''}`}
                  style={tokenColorStyle}
                  aria-label={`Show ${isFlipped ? 'front' : 'back'} of ${milestone.label} ${tokenName}`}
                  aria-pressed={isFlipped}
                  onClick={() => setFlipped((current) => ({ ...current, [milestone.id]: !current[milestone.id] }))}
                >
                  {style === 'keytag' && <span className="recovery-token-loop" aria-hidden="true" />}
                  <span className="recovery-token-turner">
                    <span className="recovery-token-face recovery-token-front" aria-hidden="true">
                      <span className="recovery-token-inscription">{milestone.label}</span>
                      <span className="recovery-token-caption">ONE STEP AT A TIME</span>
                    </span>
                    <span className="recovery-token-face recovery-token-back" aria-hidden="true">
                      <span className="recovery-token-star">✦</span>
                      <span className="recovery-token-inscription">STILLPOINT</span>
                      <span className="recovery-token-caption">YOUR TIME · YOUR PATH</span>
                    </span>
                  </span>
                </button>
                <strong>{milestone.label}</strong>
                <small>{statusText}</small>
                {reached && <span className="pill pill-sage">Reached</span>}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">No milestones match this view yet. You can choose another filter at any time.</p>
      )}
    </section>
  );
}
