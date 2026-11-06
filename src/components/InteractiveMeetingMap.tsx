import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin, X } from 'lucide-react';
import type { MeetingMapLocation } from '../domain/meeting-map';
import { distanceInMiles } from '../domain/meeting-map';

const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function prefersReducedMotion() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) return true;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function meetingSummary(meeting: MeetingMapLocation['meetings'][number]) {
  return `${meeting.name} · ${meeting.fellowshipLabel ?? meeting.fellowship} · ${meeting.modalityLabel ?? meeting.mode} · ${meeting.dayName} · ${meeting.time}${meeting.timeZoneNote ? ` · ${meeting.timeZoneNote}` : ''}`;
}

function venueLabel(location: MeetingMapLocation) {
  const count = location.meetings.length;
  return `${location.city}, ${location.address}: ${count} ${count === 1 ? 'meeting' : 'meetings'}`;
}

function createPopupContent(location: MeetingMapLocation): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'meeting-map-popup';

  const heading = document.createElement('strong');
  heading.textContent = `${location.city} · ${location.address}`;
  wrapper.append(heading);

  const accuracy = document.createElement('p');
  accuracy.textContent = 'Approximate address-range position. Confirm the venue with the official listing.';
  wrapper.append(accuracy);

  const list = document.createElement('ul');
  for (const meeting of location.meetings) {
    const item = document.createElement('li');
    const details = document.createElement('span');
    details.textContent = meetingSummary(meeting);

    const link = document.createElement('a');
    link.href = meeting.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.textContent = meeting.sourceTitle ? `Source: ${meeting.sourceTitle}` : 'Official listing';

    item.append(details, link);
    list.append(item);
  }
  wrapper.append(list);
  return wrapper;
}

const pinIcon = L.divIcon({
  className: 'meeting-map-pin',
  html: '<span class="meeting-map-pin__dot"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -10],
});

const positionIcon = L.divIcon({
  className: 'meeting-map-position',
  html: '<span class="meeting-map-position__halo"></span><span class="meeting-map-position__dot"></span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

type DevicePosition = { latitude: number; longitude: number };
type LocateState = 'idle' | 'locating' | 'shown' | 'denied' | 'unavailable';

interface InteractiveMeetingMapProps {
  locations: readonly MeetingMapLocation[];
}

/**
 * Optional OpenStreetMap view of the filtered meeting list. Loaded lazily and
 * only after the person asks for it. Every pin is a keyboard-focusable button,
 * and the same venues are available as a plain list with inline details so the
 * map is never the only way to reach the information. Device position is
 * requested only when the person presses "Show my approximate position"; it is
 * kept in component memory, never stored or sent to Stillpoint, and is cleared
 * when the map closes.
 */
export default function InteractiveMeetingMap({ locations }: InteractiveMeetingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerByIdRef = useRef(new Map<string, L.Marker>());
  const positionLayerRef = useRef<L.LayerGroup | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [locateState, setLocateState] = useState<LocateState>('idle');

  const orderedLocations = useMemo(() => {
    if (!position) return locations.map((location) => ({ location, miles: null as number | null }));
    return locations
      .map((location) => ({ location, miles: distanceInMiles(position, location) as number | null }))
      .sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
  }, [locations, position]);
  const selected = locations.find((location) => location.id === selectedId) ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: false,
      keyboard: true,
      minZoom: 8,
      maxZoom: 19,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });
    const tiles = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      minZoom: 8,
      maxZoom: 19,
      keepBuffer: 0,
      updateWhenIdle: true,
      updateWhenZooming: false,
    });

    const handleTileLoad = () => setTilesLoaded(true);
    const handleTileError = () => setTileError(true);
    tiles.on('tileload', handleTileLoad);
    tiles.on('tileerror', handleTileError);
    tiles.addTo(map);
    mapRef.current = map;
    positionLayerRef.current = L.layerGroup().addTo(map);
    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize());

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      tiles.off('tileload', handleTileLoad);
      tiles.off('tileerror', handleTileError);
      map.remove();
      mapRef.current = null;
      positionLayerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return undefined;

    // Give the map a view first so markers render immediately and can be labelled.
    const bounds = L.latLngBounds(locations.map((location) => [location.latitude, location.longitude] as [number, number]));
    if (locations.length === 1) map.setView(bounds.getCenter(), 14, { animate: false });
    else map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12, animate: false });

    const markerLayer = L.layerGroup().addTo(map);
    const markers = new Map<string, L.Marker>();

    for (const location of locations) {
      const label = venueLabel(location);
      const marker = L.marker([location.latitude, location.longitude], {
        icon: pinIcon,
        keyboard: true,
        title: label,
        alt: label,
        riseOnHover: true,
        bubblingMouseEvents: false,
      });
      marker.bindPopup(createPopupContent(location), { maxWidth: 360, autoPanPadding: [24, 24] });
      marker.on('click', () => setSelectedId(location.id));
      marker.addTo(markerLayer);
      const element = marker.getElement();
      if (element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', `${label}. Press Enter for details.`);
      }
      markers.set(location.id, marker);
    }

    markerByIdRef.current = markers;

    return () => {
      markerLayer.remove();
      markerByIdRef.current = new Map();
    };
  }, [locations]);

  useEffect(() => {
    for (const [id, marker] of markerByIdRef.current) marker.getElement()?.classList.toggle('is-selected', id === selectedId);
  }, [selectedId, locations]);

  useEffect(() => {
    const layer = positionLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!position) return;
    // A DOM-based marker (not canvas/SVG) so it also works where canvas is blocked for privacy.
    L.marker([position.latitude, position.longitude], {
      icon: positionIcon,
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(layer);
  }, [position]);

  function centerOn(location: MeetingMapLocation) {
    setSelectedId(location.id);
    const map = mapRef.current;
    const marker = markerByIdRef.current.get(location.id);
    if (!map || !marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14), { animate: !prefersReducedMotion() });
    marker.openPopup();
  }

  function moveListFocus(event: KeyboardEvent<HTMLUListElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-venue-id]') ?? []);
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? buttons.length - 1
        : event.key === 'ArrowDown' ? Math.min(buttons.length - 1, index + 1)
          : Math.max(0, index - 1);
    event.preventDefault();
    buttons[next]?.focus();
  }

  function showMyPosition() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setLocateState('unavailable'); return; }
    setLocateState('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setPosition(next);
        setLocateState('shown');
        mapRef.current?.setView([next.latitude, next.longitude], Math.max(mapRef.current.getZoom(), 11), { animate: !prefersReducedMotion() });
      },
      (error) => setLocateState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 15_000 },
    );
  }

  function clearMyPosition() {
    setPosition(null);
    setLocateState('idle');
  }

  const locateMessage = {
    idle: '',
    locating: 'Asking your browser for an approximate position…',
    shown: 'Your approximate position is shown on the map and venues are listed nearest first. It is kept only on this page and is cleared when the map closes.',
    denied: 'Location permission was not granted. The map and list work the same without it.',
    unavailable: 'An approximate position is not available in this browser right now. The map and list work the same without it.',
  }[locateState];

  return (
    <div className="meeting-map-widget">
      <p id="meeting-map-instructions" className="sr-only">Use Tab to move between map pins and press Enter to open a pin’s details. Use the plus and minus controls, or arrow keys when the map itself is focused, to explore. The same venues are listed below the map.</p>
      <div className="meeting-map-locate">
        {position
          ? <button type="button" className="button button-quiet button-small" onClick={clearMyPosition}><X size={14} aria-hidden="true" /> Remove my position</button>
          : <button type="button" className="button button-secondary button-small" onClick={showMyPosition} disabled={locateState === 'locating'} aria-describedby="meeting-map-locate-note"><LocateFixed size={14} aria-hidden="true" /> Show my approximate position</button>}
        <small id="meeting-map-locate-note">Optional. Your browser asks first. The position is never saved or sent to Stillpoint; centering the map near you requests map tiles for that area from OpenStreetMap.</small>
      </div>
      <p className="meeting-map-locate-status" role="status" aria-live="polite">{locateMessage}</p>
      <div
        ref={containerRef}
        className="meeting-map-canvas"
        role="region"
        aria-label="Interactive map of eligible meeting addresses"
        aria-describedby="meeting-map-instructions"
      />
      <p className="meeting-map-service-status" role="status" aria-live="polite">
        {tileError
          ? 'One or more map tiles could not be loaded. Meeting listings and official links remain available below.'
          : tilesLoaded
            ? 'Map tiles loaded from OpenStreetMap.'
            : 'Loading map tiles from OpenStreetMap…'}
      </p>
      <details className="meeting-map-directory" open>
        <summary>Mapped venues as a list ({locations.length}){position ? ' · nearest first' : ''}</summary>
        <p className="meeting-map-directory-hint">Choose a venue to center the map on it and show its meetings. Arrow keys move through the list.</p>
        <ul ref={listRef} onKeyDown={moveListFocus}>
          {orderedLocations.map(({ location, miles }) => (
            <li key={location.id}>
              <button
                type="button"
                data-venue-id={location.id}
                aria-pressed={selectedId === location.id}
                aria-controls="meeting-map-selected"
                onClick={() => centerOn(location)}
              >
                <span><MapPin size={13} aria-hidden="true" /> {location.city} · {location.address}</span>
                <small>
                  {location.meetings.length} {location.meetings.length === 1 ? 'meeting' : 'meetings'}
                  {miles !== null ? ` · about ${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away` : ''}
                </small>
              </button>
            </li>
          ))}
        </ul>
      </details>
      <section id="meeting-map-selected" className="meeting-map-selected" aria-live="polite" aria-label="Selected venue">
        {selected ? <>
          <h4>{selected.city} · {selected.address}</h4>
          <p className="meeting-map-selected-note">Approximate address-range position. Confirm the venue with the official listing.</p>
          <ul>
            {selected.meetings.map((meeting) => (
              <li key={meeting.id}>
                <span>{meetingSummary(meeting)}</span>
                {meeting.sourceUrl && <a href={meeting.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{meeting.sourceTitle ? `Source: ${meeting.sourceTitle}` : 'Official listing'}<span className="sr-only"> (opens in a new tab)</span></a>}
              </li>
            ))}
          </ul>
        </> : null}
      </section>
    </div>
  );
}
