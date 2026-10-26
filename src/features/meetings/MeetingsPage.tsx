import { lazy, Suspense, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDays, ExternalLink, MapPin, Search, UsersRound } from 'lucide-react';
import { meetingListings, meetingSnapshotCheckedAt, meetingSources, onlineWorkbookDuplicateRowCount } from '../../data/meetings';
import { meetingVenueCoordinateFor } from '../../data/meeting-coordinates';
import { workbookMeetingCoverage } from '../../data/workbook-meeting-coverage';
import { onlineWorkbookCoverage } from '../../data/online-workbook-coverage';
import { db } from '../../db/database';
import { filterMeetingListings, type FellowshipFilter, type MeetingDayFilter, type MeetingFormatFilter } from '../../domain/meetings';
import { buildMeetingMapLocations } from '../../domain/meeting-map';
import './meetings.css';

const InteractiveMeetingMap = lazy(() => import('../../components/InteractiveMeetingMap'));
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const countyNames = [...new Set(meetingListings.map((meeting) => meeting.county ?? 'Stanislaus County'))].sort((a, b) => a.localeCompare(b));
const cityNames = [...new Set(meetingListings.map((meeting) => meeting.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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

/** Render locally filtered meeting snapshots and opt-in device-only reminders. */
export function MeetingsPage() {
  const today = new Date().getDay();
  const preferences = useLiveQuery(() => db.preferences.get('preferences'), []);
  const [fellowship, setFellowship] = useState<FellowshipFilter>('all');
  const [day, setDay] = useState<MeetingDayFilter | 'today'>('today');
  const [county, setCounty] = useState('all');
  const [city, setCity] = useState('all');
  const [format, setFormat] = useState<MeetingFormatFilter>('all');
  const [query, setQuery] = useState('');
  const [startAfter, setStartAfter] = useState('');
  const [startBefore, setStartBefore] = useState('');
  const [limit, setLimit] = useState(30);
  const [mapOpen, setMapOpen] = useState(false);
  const [reminderNotice, setReminderNotice] = useState('');
  const effectiveDay = day === 'today' ? today : day;
  const hasSnapshotForScope = county !== 'all' && meetingListings.some((meeting) =>
    (meeting.county ?? 'Stanislaus County') === county && (fellowship === 'all' || meeting.fellowship === fellowship));
  const filtered = useMemo(() => filterMeetingListings(meetingListings, {
    fellowship,
    day: effectiveDay,
    county,
    city,
    format,
    query,
    startAfterMinutes: timeToMinutes(startAfter),
    startBeforeMinutes: timeToMinutes(startBefore),
  }), [fellowship, effectiveDay, county, city, format, query, startAfter, startBefore]);
  const visible = filtered.slice(0, limit);
  const mapLocations = useMemo(() => buildMeetingMapLocations(filtered), [filtered]);
  const mappedListingCount = mapLocations.reduce((count, location) => count + location.meetings.length, 0);
  const mapCountyNames = useMemo(() => [...new Set(mapLocations.flatMap((location) => location.meetings.map((meeting) => meeting.county ?? 'Stanislaus County')))].sort((a, b) => a.localeCompare(b)), [mapLocations]);
  const physicalOrHybridResultCount = filtered.filter((meeting) => meeting.mode === 'in-person' || meeting.mode === 'hybrid').length;
  const unmappedPhysicalOrHybridCount = physicalOrHybridResultCount - mappedListingCount;

  function clearFilters() {
    setFellowship('all');
    setDay('today');
    setCounty('all');
    setCity('all');
    setFormat('all');
    setQuery('');
    setStartAfter('');
    setStartBefore('');
    setLimit(30);
  }

  async function changeMeetingReminder(meetingId: string, enabled: boolean) {
    try {
      const current = await db.preferences.get('preferences');
      if (!current) { setReminderNotice('Finish local setup before saving a meeting reminder.'); return; }
      const existing = current.meetingReminders ?? [];
      if (!enabled) {
        await db.preferences.update('preferences', { meetingReminders: existing.filter((item) => item.meetingId !== meetingId), updatedAt: new Date().toISOString() });
        setReminderNotice('The weekly meeting reminder was removed from this device.');
        return;
      }
      if (typeof Notification === 'undefined') { setReminderNotice('Browser notifications are unavailable here.'); return; }
      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') { setReminderNotice('Notifications were not enabled. You can change this in browser settings.'); return; }
      if (existing.some((item) => item.meetingId === meetingId)) return;
      await db.preferences.update('preferences', {
        meetingReminders: [...existing, { id: `meeting-reminder:${meetingId}`, meetingId, leadMinutes: 30, createdAt: new Date().toISOString() }],
        updatedAt: new Date().toISOString(),
      });
      setReminderNotice('A weekly reminder is saved on this device. It can alert while Stillpoint is open.');
    } catch { setReminderNotice('The reminder could not be saved. Check local browser storage and try again.'); }
  }

  async function changeReminderLead(meetingId: string, leadMinutes: 15 | 30 | 60) {
    const current = await db.preferences.get('preferences');
    if (!current) return;
    const meetingReminders = (current.meetingReminders ?? []).map((item) => item.meetingId === meetingId ? { ...item, leadMinutes } : item);
    await db.preferences.update('preferences', { meetingReminders, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="page-stack meetings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Local peer support</p>
          <h1>Local meeting finder.</h1>
          <p>Search offline meeting snapshots by fellowship, county, day, format and time. A missing listing means the snapshot does not include it—not that no meeting exists. Confirm details with the official source before traveling.</p>
        </div>
          <span className="pill"><UsersRound size={14} aria-hidden="true" /> AA · NA · FA · SMART finder</span>
      </header>

      <section className="card meetings-sources" aria-labelledby="meeting-sources-title">
        <div className="card-header">
          <div><p className="eyebrow">Check the current schedule</p><h2 id="meeting-sources-title">Official local directories</h2></div>
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <div className="meeting-source-links">
          <a href={meetingSources.AA} {...sourceLinkProps}>AA · Central Valley Intergroup <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.AAFresno} {...sourceLinkProps}>AA · Greater Fresno Area Intergroup <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.AAMariposa} {...sourceLinkProps}>AA · Mariposa Fellowship <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.NA} {...sourceLinkProps}>NA · SVGNA local schedule <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.NAFresno} {...sourceLinkProps}>NA · Central California NA <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.FA} {...sourceLinkProps}>FA · Food Addicts live finder <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.SMART} {...sourceLinkProps}>SMART Recovery live finder <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={meetingSources.NAWorldServicesFinder} {...sourceLinkProps}>NA World Services meeting finder <ExternalLink size={14} aria-hidden="true" /></a>
        </div>
        <p className="meeting-source-note">The Stanislaus AA/NA snapshot was checked {checkedDateLabel()}. The local directory includes a user-validated 233-row workbook snapshot and a separate 157-row online/hybrid schedule snapshot, both dated October 26, 2026, plus earlier regional examples. These are partial snapshots, not complete county directories. Exact repeats from earlier snapshots are shown once. All listings are source-linked and may change; verify the time, host scope, venue and access before attending. A missing listing is not evidence that no meeting exists. These independent directories are not endorsements or claims of affiliation.</p>
        <details className="meeting-coverage-details">
          <summary>Workbook row counts and county coverage notes</summary>
          <p>{workbookMeetingCoverage.completenessNote}</p>
          <ul>
            {workbookMeetingCoverage.countyCoverage.map((coverage) => (
              <li key={coverage.county}><strong>{coverage.county} · {coverage.rowsIncluded} workbook rows.</strong> {coverage.limitation}</li>
            ))}
          </ul>
        </details>
        <details className="meeting-coverage-details">
          <summary>Online / hybrid snapshot: {onlineWorkbookCoverage.rowsImported} source rows; {onlineWorkbookDuplicateRowCount} repeats kept once</summary>
          <p>{onlineWorkbookCoverage.completenessNote}</p>
          <p>{onlineWorkbookCoverage.credentialNotice}</p>
          <ul>
            {onlineWorkbookCoverage.countyCoverage.map((coverage) => (
              <li key={coverage.county}><strong>{coverage.county} · {coverage.rowsIncluded} rows · {coverage.status}.</strong> {coverage.limitation}</li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card" aria-labelledby="meeting-list-title">
        <div className="card-header meetings-list-heading">
          <div><p className="eyebrow">A local snapshot, stored with the app</p><h2 id="meeting-list-title">Find a meeting</h2></div>
          <span className="pill">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</span>
        </div>
        <div className="meeting-filter-grid">
          <label className="field-label" htmlFor="meeting-county">County
            <select id="meeting-county" value={county} onChange={(event) => { setCounty(event.target.value); setCity('all'); setLimit(30); }}>
              <option value="all">All requested counties</option>{countyNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="field-label" htmlFor="meeting-fellowship">Fellowship
            <select id="meeting-fellowship" value={fellowship} onChange={(event) => { setFellowship(event.target.value as FellowshipFilter); setLimit(30); }}>
              <option value="all">All bundled listings</option><option value="AA">AA only</option><option value="NA">NA only</option><option value="FA">Food Addicts (FA)</option><option value="SMART">SMART Recovery</option>
            </select>
          </label>
          <label className="field-label" htmlFor="meeting-format">Meeting format
            <select id="meeting-format" value={format} onChange={(event) => { setFormat(event.target.value as MeetingFormatFilter); setLimit(30); }}>
              <option value="all">All formats</option><option value="in-person">In-person only</option><option value="online">Online only</option><option value="hybrid">Hybrid only</option><option value="zoom">Zoom · source-labeled</option>
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
            <span className="field-label meeting-time-title" id="meeting-time-title">Listed meeting start time</span>
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
          Showing {visible.length} of {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}{county !== 'all' ? ` in ${county}` : ''}{day === 'today' ? ` for ${weekdayNames[today]}` : ''}{startAfter || startBefore ? ` · time ${startAfter || 'any'}–${startBefore || 'any'}` : ''}.
          <button type="button" className="button button-quiet meeting-clear-button" onClick={clearFilters}>Clear filters</button>
        </div>
        <p className="meeting-reminder-status" role="status" aria-live="polite">{reminderNotice}</p>

        {mapLocations.length > 0 && <section className="meeting-map-panel" aria-labelledby="meeting-map-title">
          <div className="meeting-map-panel-heading">
            <div>
              <p className="eyebrow">Optional map · {mapLocations.length} approximate locations</p>
              <h3 id="meeting-map-title">Explore this filtered list</h3>
              <p className="meeting-map-counties">Mapped counties: {mapCountyNames.join(' · ')}</p>
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
            {mappedListingCount} of {physicalOrHybridResultCount} in-person or hybrid listings in this view have an exact address-range match{unmappedPhysicalOrHybridCount > 0 ? `; ${unmappedPhysicalOrHybridCount} without an exact match are not pinned` : ''}. Pins are approximate address-range positions, not confirmed building entrances. Tiles load from OpenStreetMap only after you choose the map; the tile server receives ordinary connection metadata and the viewed map area, which may correlate with this local filter view, but not your search text, filter values, device location, or recovery information. See the <a href="https://operations.osmfoundation.org/policies/tiles/" {...sourceLinkProps}>tile usage policy</a>.
          </p>
          <div id="interactive-meeting-map" className="meeting-map-slot" hidden={!mapOpen}>
            {mapOpen && <Suspense fallback={<p className="meeting-map-loading" role="status">Loading the interactive map…</p>}>
              <InteractiveMeetingMap locations={mapLocations} />
            </Suspense>}
          </div>
        </section>}

        {visible.length ? <ul className="meeting-cards" aria-label="Meeting listings">
          {visible.map((meeting) => {
            const mapReady = (meeting.mode === 'in-person' || meeting.mode === 'hybrid') && Boolean(meetingVenueCoordinateFor(meeting));
            const reminder = preferences?.meetingReminders?.find((item) => item.meetingId === meeting.id);
            const locality = [meeting.city, meeting.county ?? 'Stanislaus County'].filter(Boolean).join(', ');
            return <li key={meeting.id}>
              <article className="meeting-listing">
                <div className="meeting-listing-top"><span className={`meeting-fellowship-badge ${meeting.fellowship.toLowerCase()}`}>{meeting.fellowship}</span><span>{meeting.modalityLabel ?? meeting.mode} · {meeting.dayName} · {meeting.time}</span></div>
                <h3>{meeting.name}</h3>
                <p className="meeting-location"><MapPin size={15} aria-hidden="true" /><span>{locality || 'Locality not listed'} · {meeting.address}</span></p>
                {meeting.scopeNote && <p className="meeting-format"><strong>Host city / directory scope:</strong> {meeting.scopeNote}</p>}
                {meeting.sourceTitle && <p className="meeting-format"><strong>Source:</strong> {meeting.sourceTitle}</p>}
                {meeting.formatNotes && <p className="meeting-format"><strong>Access / format:</strong> {meeting.formatNotes}</p>}
                {meeting.timeZoneNote && <p className="meeting-format"><strong>Timezone / time note:</strong> {meeting.timeZoneNote}</p>}
                {meeting.verificationNote && <p className="meeting-format"><strong>Verification note:</strong> {meeting.verificationNote}</p>}
                {meeting.checkedAt && <p className="meeting-format">This listing was checked {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${meeting.checkedAt}T12:00:00Z`))}.</p>}
                <div className="meeting-listing-actions">
                  <a href={meeting.sourceUrl} {...sourceLinkProps}>Official listing <ExternalLink size={13} aria-hidden="true" /></a>
                  {mapReady && <a href={mapsUrl(meeting.address, meeting.city)} {...sourceLinkProps}>Map <MapPin size={13} aria-hidden="true" /></a>}
                </div>
                <div className="meeting-reminder-controls">
                  <label className="meeting-reminder-toggle"><input type="checkbox" checked={Boolean(reminder)} onChange={(event) => void changeMeetingReminder(meeting.id, event.target.checked)} aria-label={`${reminder ? 'Remove' : 'Set'} weekly reminder for ${meeting.name}`} /><span>Weekly reminder</span></label>
                  {reminder && <label className="meeting-reminder-lead">Notify me
                    <select aria-label={`Reminder lead time for ${meeting.name}`} value={reminder.leadMinutes} onChange={(event) => void changeReminderLead(meeting.id, Number(event.target.value) as 15 | 30 | 60)}>
                      <option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option>
                    </select>
                  </label>}
                  <small>Saved only on this device. While Stillpoint is open; background delivery varies by browser.</small>
                </div>
              </article>
            </li>;
          })}
        </ul> : <div className="empty-state meeting-empty">
          {county !== 'all' && !hasSnapshotForScope ? <>
            <h3>No bundled {fellowship === 'all' ? 'AA, NA, FA or SMART Recovery' : fellowship} snapshot is available for {county}.</h3>
            <p>This reflects the limited checked source sample, not the presence or absence of local meetings. Review the official local directories above for current coverage.</p>
          </> : fellowship === 'FA' && !meetingListings.some((meeting) => meeting.fellowship === 'FA' && (county === 'all' || meeting.county === county)) ? <>
            <h3>No Food Addicts listing is bundled for this selection.</h3>
            <p>This does not mean there are no meetings nearby. The bundled extract is incomplete; the official live finder supports location, day, type, language and time-of-day filters.</p>
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

      <p className="fine-print meetings-privacy-note">Stillpoint does not request your location, record attendance, or transmit meeting search text, filter values, or recovery details to a service. Bundled listings and reminder choices stay on this device. The public demo intentionally omits direct Zoom invitations, meeting IDs and passcodes; use the linked official detail page for current access information. Loading the optional in-app map sends OpenStreetMap tile requests that reveal the viewed map area, which may correlate with local filters; external directory and map links open only after you choose them. FA search criteria are entered on the official external site only after you choose its link. NA format abbreviations follow the source’s key.</p>
    </div>
  );
}
