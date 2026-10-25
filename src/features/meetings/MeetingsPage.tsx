import { lazy, Suspense, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, MapPin, Search, UsersRound } from 'lucide-react';
import { meetingSnapshotCheckedAt, meetingSources, stanislausMeetingListings } from '../../data/meetings';
import { filterMeetingListings, type FellowshipFilter, type MeetingDayFilter, type MeetingFormatFilter } from '../../domain/meetings';
import { buildMeetingMapLocations } from '../../domain/meeting-map';
import './meetings.css';

const InteractiveMeetingMap = lazy(() => import('../../components/InteractiveMeetingMap'));
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const cityNames = [...new Set(stanislausMeetingListings.map((meeting) => meeting.city))].sort((a, b) => a.localeCompare(b));
const sourceLinkProps = { target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer' as const };

function checkedDateLabel() {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${meetingSnapshotCheckedAt}T12:00:00Z`));
}

function dayFilterValue(value: string): MeetingDayFilter | 'today' {
  if (value === 'all' || value === 'today') return value;
  return Number(value);
}

function timeToMinutes(value: string): number | null {
  if (!value) return null;
  const [hourText, minuteText] = value.split(':');
  if (!hourText || !minuteText) return null;
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function mapsUrl(address: string, city: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, California`)}`;
}

/** Render locally filtered AA/NA listings and links to official schedules. */
export function MeetingsPage() {
  const today = new Date().getDay();
  const [fellowship, setFellowship] = useState<FellowshipFilter>('all');
  const [day, setDay] = useState<MeetingDayFilter | 'today'>('today');
  const [city, setCity] = useState('all');
  const [format, setFormat] = useState<MeetingFormatFilter>('all');
  const [query, setQuery] = useState('');
  const [startAfter, setStartAfter] = useState('');
  const [startBefore, setStartBefore] = useState('');
  const [limit, setLimit] = useState(30);
  const [mapOpen, setMapOpen] = useState(false);
  const effectiveDay = day === 'today' ? today : day;
  const filtered = useMemo(() => filterMeetingListings(stanislausMeetingListings, {
    fellowship,
    day: effectiveDay,
    city,
    format,
    query,
    startAfterMinutes: timeToMinutes(startAfter),
    startBeforeMinutes: timeToMinutes(startBefore),
  }), [fellowship, effectiveDay, city, format, query, startAfter, startBefore]);
  const visible = filtered.slice(0, limit);
  const mapLocations = useMemo(() => buildMeetingMapLocations(filtered), [filtered]);
  const mappedListingCount = mapLocations.reduce((count, location) => count + location.meetings.length, 0);
  const inPersonResultCount = filtered.filter((meeting) => meeting.mode === 'in-person').length;
  const unmappedInPersonCount = inPersonResultCount - mappedListingCount;

  function clearFilters() {
    setFellowship('all');
    setDay('today');
    setCity('all');
    setFormat('all');
    setQuery('');
    setStartAfter('');
    setStartBefore('');
    setLimit(30);
  }

  return (
    <div className="page-stack meetings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Local peer support</p>
          <h1>Meetings in Stanislaus County.</h1>
          <p>Filter the dated AA and NA snapshot by day, format and local time; search group details and source platform notes, including Zoom when the listing names it. Food Addicts meetings open in the official live finder.</p>
        </div>
        <span className="pill"><UsersRound size={14} aria-hidden="true" /> AA · NA · FA finder</span>
      </header>

      <section className="card meetings-sources" aria-labelledby="meeting-sources-title">
        <div className="card-header">
          <div><p className="eyebrow">Check the current schedule</p><h2 id="meeting-sources-title">Official local directories</h2></div>
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <div className="meeting-source-links">
          <a href={meetingSources.AA} {...sourceLinkProps}>AA · Central Valley Intergroup <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.NA} {...sourceLinkProps}>NA · SVGNA local schedule <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.FA} {...sourceLinkProps}>FA · Food Addicts live finder <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.NAWorldServicesFinder} {...sourceLinkProps}>NA World Services meeting finder <ExternalLink size={14} aria-hidden="true" /></a>
        </div>
        <p className="meeting-source-note">Local AA/NA snapshot checked {checkedDateLabel()}. Food Addicts listings remain on the live official finder and are not bundled in this snapshot. Schedules can change; confirm time and location with the official source before traveling. These are independent directories, not an endorsement or claim of affiliation.</p>
      </section>

      <section className="card" aria-labelledby="meeting-list-title">
        <div className="card-header meetings-list-heading">
          <div><p className="eyebrow">A local snapshot, stored with the app</p><h2 id="meeting-list-title">Find a meeting</h2></div>
          <span className="pill">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</span>
        </div>
        <div className="meeting-filter-grid">
          <label className="field-label" htmlFor="meeting-fellowship">Fellowship
            <select id="meeting-fellowship" value={fellowship} onChange={(event) => { setFellowship(event.target.value as FellowshipFilter); setLimit(30); }}>
              <option value="all">All local listings</option><option value="AA">AA only</option><option value="NA">NA only</option><option value="FA">Food Addicts · official finder</option>
            </select>
          </label>
          <label className="field-label" htmlFor="meeting-format">Meeting format
            <select id="meeting-format" value={format} onChange={(event) => { setFormat(event.target.value as MeetingFormatFilter); setLimit(30); }}>
              <option value="all">All formats</option><option value="in-person">In-person only</option><option value="online">Online only</option><option value="zoom">Zoom · source-labeled</option>
            </select>
          </label>
          <label className="field-label" htmlFor="meeting-day">Day
            <select id="meeting-day" value={String(day)} onChange={(event) => { setDay(dayFilterValue(event.target.value)); setLimit(30); }}>
              <option value="today">Today · {weekdayNames[today]}</option><option value="all">All days</option>
              {weekdayNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="meeting-city">City
            <select id="meeting-city" value={city} onChange={(event) => { setCity(event.target.value); setLimit(30); }}>
              <option value="all">All listed communities</option>{cityNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="field-label meeting-search" htmlFor="meeting-search">
            <span>Search group, city, address or platform</span>
            <span className="meeting-search-control"><Search size={16} aria-hidden="true" /><input id="meeting-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(30); }} placeholder="Try a group, city or Zoom" /></span>
          </label>
          <div className="meeting-time-filter" role="group" aria-labelledby="meeting-time-title">
            <span className="field-label meeting-time-title" id="meeting-time-title">Local meeting start time</span>
            <label className="field-label" htmlFor="meeting-start-after">Start time after
              <input id="meeting-start-after" type="time" value={startAfter} onChange={(event) => { setStartAfter(event.target.value); setLimit(30); }} aria-describedby="meeting-time-hint" />
            </label>
            <label className="field-label" htmlFor="meeting-start-before">Start time before
              <input id="meeting-start-before" type="time" value={startBefore} onChange={(event) => { setStartBefore(event.target.value); setLimit(30); }} aria-describedby="meeting-time-hint" />
            </label>
            <p className="meeting-time-hint" id="meeting-time-hint">Boundaries are inclusive. If “before” is earlier than “after,” the range crosses midnight.</p>
          </div>
        </div>
        <div className="meeting-result-summary" role="status" aria-live="polite">
          Showing {visible.length} of {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}{day === 'today' ? ` for ${weekdayNames[today]}` : ''}{startAfter || startBefore ? ` · time ${startAfter || 'any'}–${startBefore || 'any'}` : ''}.
          <button type="button" className="button button-quiet meeting-clear-button" onClick={clearFilters}>Clear filters</button>
        </div>

        {mapLocations.length > 0 && <section className="meeting-map-panel" aria-labelledby="meeting-map-title">
          <div className="meeting-map-panel-heading">
            <div>
              <p className="eyebrow">Optional map · {mapLocations.length} approximate locations</p>
              <h3 id="meeting-map-title">Explore this filtered list</h3>
            </div>
            <button
              type="button"
              className="button button-secondary meeting-map-toggle"
              aria-controls="interactive-meeting-map"
              aria-expanded={mapOpen}
              onClick={() => setMapOpen((open) => !open)}
            >
              <MapPin size={15} aria-hidden="true" /> {mapOpen ? 'Hide interactive map' : 'Load interactive map'}
            </button>
          </div>
          <p className="meeting-map-disclosure">
            {mappedListingCount} of {inPersonResultCount} in-person listings in this view have an exact address-range match{unmappedInPersonCount > 0 ? `; ${unmappedInPersonCount} without an exact match are not pinned` : ''}. Pins are approximate address-range positions, not confirmed building entrances. Tiles load from OpenStreetMap only after you choose the map; the tile server receives ordinary connection metadata and the viewed map area, which may correlate with this local filter view, but not your search text, filter values, device location, or recovery information. See the <a href="https://operations.osmfoundation.org/policies/tiles/" {...sourceLinkProps}>tile usage policy</a>.
          </p>
          <div id="interactive-meeting-map" className="meeting-map-slot" hidden={!mapOpen}>
            {mapOpen && <Suspense fallback={<p className="meeting-map-loading" role="status">Loading the interactive map…</p>}>
              <InteractiveMeetingMap locations={mapLocations} />
            </Suspense>}
          </div>
        </section>}

        {visible.length ? <ul className="meeting-cards" aria-label="Meeting listings">
          {visible.map((meeting) => {
            const mapReady = meeting.mode === 'in-person' && Boolean(meeting.address);
            return <li key={meeting.id}>
              <article className="meeting-listing">
                <div className="meeting-listing-top"><span className={`meeting-fellowship-badge ${meeting.fellowship.toLowerCase()}`}>{meeting.fellowship}</span><span>{meeting.dayName} · {meeting.time}</span></div>
                <h3>{meeting.name}</h3>
                <p className="meeting-location"><MapPin size={15} aria-hidden="true" /><span>{meeting.city} · {meeting.address}</span></p>
                {meeting.formatNotes && <p className="meeting-format"><strong>Source format/note:</strong> {meeting.formatNotes}</p>}
                <div className="meeting-listing-actions">
                  <a href={meeting.sourceUrl} {...sourceLinkProps}>Official listing <ExternalLink size={13} aria-hidden="true" /></a>
                  {mapReady && <a href={mapsUrl(meeting.address, meeting.city)} {...sourceLinkProps}>Map <MapPin size={13} aria-hidden="true" /></a>}
                </div>
              </article>
            </li>;
          })}
        </ul> : <div className="empty-state meeting-empty">
          {fellowship === 'FA' ? <>
            <h3>No Food Addicts listings are bundled in this local snapshot.</h3>
            <p>This does not mean there are no meetings nearby. The official live finder supports location, day, type, language and time-of-day filters.</p>
            <a className="button button-secondary meeting-empty-link" href={meetingSources.FA} {...sourceLinkProps}>Open Food Addicts official finder <ExternalLink size={14} aria-hidden="true" /></a>
          </> : format === 'zoom' ? <>
            <h3>No source-labeled Zoom listings match these filters.</h3>
            <p>Only listings whose official source text explicitly identifies Zoom appear here. Generic “online” listings are not assumed to use Zoom; check the current source schedule for updated platform details.</p>
            <div className="meeting-empty-sources"><a href={meetingSources.AA} {...sourceLinkProps}>Check the official AA directory <ExternalLink size={13} aria-hidden="true" /></a><a href={meetingSources.NA} {...sourceLinkProps}>Check the official NA schedule <ExternalLink size={13} aria-hidden="true" /></a></div>
          </> : <>
            <h3>No listings match those filters.</h3>
            <p>Try another day, city, time range or fellowship, or check an official directory above.</p>
            <button className="button button-secondary" type="button" onClick={clearFilters}>Show today’s meetings</button>
          </>}
        </div>}

        {visible.length < filtered.length && <div className="meeting-show-more"><button className="button button-secondary" type="button" onClick={() => setLimit((value) => value + 30)}>Show 30 more</button></div>}
      </section>

      <p className="fine-print meetings-privacy-note">Stillpoint does not request your location, record attendance, or transmit meeting search text, filter values, or recovery details to a service. The list is available offline. Loading the optional in-app map sends OpenStreetMap tile requests that reveal the viewed map area, which may correlate with local filters; per-listing official-directory and external-map links open a new site only after you choose them. FA search criteria are entered on the official external site only after you choose its link. NA format abbreviations follow the source’s key.</p>
    </div>
  );
}
