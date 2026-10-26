import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MeetingMapLocation } from '../domain/meeting-map';

const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

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
    details.textContent = `${meeting.name} · ${meeting.fellowship} · ${meeting.dayName} · ${meeting.time}`;

    const link = document.createElement('a');
    link.href = meeting.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.textContent = 'Official listing';

    item.append(details, link);
    list.append(item);
  }
  wrapper.append(list);
  return wrapper;
}

interface InteractiveMeetingMapProps {
  locations: readonly MeetingMapLocation[];
}

export default function InteractiveMeetingMap({ locations }: InteractiveMeetingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerByIdRef = useRef(new Map<string, L.CircleMarker>());
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);

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
    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize());

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      tiles.off('tileload', handleTileLoad);
      tiles.off('tileerror', handleTileError);
      map.remove();
      mapRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return undefined;

    const markerLayer = L.layerGroup().addTo(map);
    const markers = new Map<string, L.CircleMarker>();
    const markerColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#456b5f';

    for (const location of locations) {
      const marker = L.circleMarker([location.latitude, location.longitude], {
        radius: 7,
        color: markerColor,
        weight: 2,
        fillColor: markerColor,
        fillOpacity: 0.82,
        bubblingMouseEvents: false,
      });
      marker.bindPopup(createPopupContent(location), { maxWidth: 360 });
      marker.addTo(markerLayer);
      markers.set(location.id, marker);
    }

    markerByIdRef.current = markers;
    const bounds = L.latLngBounds(locations.map((location) => [location.latitude, location.longitude] as [number, number]));
    if (locations.length === 1) map.setView(bounds.getCenter(), 14);
    else map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });

    return () => {
      markerLayer.remove();
      markerByIdRef.current = new Map();
    };
  }, [locations]);

  function centerOn(location: MeetingMapLocation) {
    const map = mapRef.current;
    const marker = markerByIdRef.current.get(location.id);
    if (!map || !marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14));
    marker.openPopup();
  }

  return (
    <div className="meeting-map-widget">
      <p id="meeting-map-instructions" className="sr-only">Use the plus and minus controls or arrow keys to explore the map. A list of mapped venues is available below.</p>
      <div
        ref={containerRef}
        className="meeting-map-canvas"
        role="application"
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
      <details className="meeting-map-directory">
        <summary>Browse mapped venues as a list ({locations.length})</summary>
        <ul>
          {locations.map((location) => (
            <li key={location.id}>
              <button type="button" onClick={() => centerOn(location)}>
                <span>{location.city} · {location.address}</span>
                <small>{location.meetings.length} {location.meetings.length === 1 ? 'meeting' : 'meetings'}</small>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
