import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Caucasus airfield data (embedded for frontend use) ──
const CAUCASUS_AIRFIELDS = [
  { name: 'Batumi', icao: 'UGSB', tower: '131.000', ils: '110.30', tacan: '16X', elev: '33ft', lat: 41.6103, lon: 41.5997 },
  { name: 'Kutaisi', icao: 'UGKO', tower: '134.000', ils: '109.75', tacan: '44X', elev: '147ft', lat: 42.1766, lon: 42.4826 },
  { name: 'Senaki-Kolkhi', icao: 'UGKS', tower: '132.000', ils: '108.90', tacan: '31X', elev: '43ft', lat: 42.2396, lon: 42.0478 },
  { name: 'Kobuleti', icao: 'UG5X', tower: '133.000', ils: '111.50', tacan: '67X', elev: '59ft', lat: 41.9308, lon: 41.8631 },
  { name: 'Tbilisi-Lochini', icao: 'UGTB', tower: '138.000', ils: '110.30', tacan: '25X', elev: '1474ft', lat: 41.6692, lon: 44.9547 },
  { name: 'Vaziani', icao: 'UG24', tower: '140.000', ils: '108.75', tacan: '22X', elev: '1523ft', lat: 41.6293, lon: 45.0287 },
  { name: 'Sukhumi-Babushara', icao: 'UGSS', tower: '129.000', ils: '', tacan: '', elev: '43ft', lat: 42.8582, lon: 41.1281 },
  { name: 'Gudauta', icao: 'UG23', tower: '130.000', ils: '', tacan: '', elev: '68ft', lat: 43.1041, lon: 40.5783 },
  { name: 'Sochi-Adler', icao: 'URSS', tower: '127.000', ils: '', tacan: '', elev: '98ft', lat: 43.4500, lon: 39.9566 },
  { name: 'Mineralnye Vody', icao: 'URMM', tower: '135.000', ils: '', tacan: '', elev: '1054ft', lat: 44.2191, lon: 43.0819 },
  { name: 'Nalchik', icao: 'URMN', tower: '136.000', ils: '', tacan: '', elev: '1411ft', lat: 43.5133, lon: 43.6366 },
  { name: 'Beslan', icao: 'URMO', tower: '141.000', ils: '', tacan: '', elev: '1673ft', lat: 43.2051, lon: 44.6066 },
];

// ── Theater center positions ──
const THEATER_CENTERS = {
  'Caucasus':        { lat: 42.5, lon: 42.0, zoom: 7 },
  'NTTR':            { lat: 36.8, lon: -115.8, zoom: 7 },
  'Persian Gulf':    { lat: 26.2, lon: 54.5, zoom: 7 },
  'Syria':           { lat: 34.8, lon: 37.0, zoom: 7 },
  'Mariana Islands': { lat: 14.0, lon: 145.0, zoom: 7 },
  'South Atlantic':  { lat: -51.5, lon: -59.0, zoom: 7 },
  'Sinai':           { lat: 29.5, lon: 33.5, zoom: 7 },
  'Kola':            { lat: 68.5, lon: 33.0, zoom: 7 },
  'Afghanistan':     { lat: 34.5, lon: 69.0, zoom: 7 },
};

// ── Custom icon factories ──
function svgIcon(svg, size = [20, 20], anchor) {
  return L.divIcon({
    html: svg,
    className: 'custom-map-icon',
    iconSize: size,
    iconAnchor: anchor || [size[0] / 2, size[1] / 2],
  });
}

const waypointIcon = (num, isFirst, isLast) => {
  const color = isFirst ? '#00ff88' : isLast ? '#ff2233' : '#00d4ff';
  const label = isFirst ? 'DEP' : isLast ? 'RCV' : num;
  return svgIcon(
    `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <polygon points="14,2 26,14 14,26 2,14" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.9"/>
      <text x="14" y="16" text-anchor="middle" fill="${color}" font-size="8" font-family="monospace" font-weight="bold">${label}</text>
    </svg>`,
    [28, 28]
  );
};

const bullseyeIcon = svgIcon(
  `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="none" stroke="#ffaa00" stroke-width="1" opacity="0.8"/>
    <circle cx="18" cy="18" r="10" fill="none" stroke="#ffaa00" stroke-width="1" opacity="0.6"/>
    <circle cx="18" cy="18" r="4" fill="none" stroke="#ffaa00" stroke-width="1" opacity="0.8"/>
    <circle cx="18" cy="18" r="1.5" fill="#ffaa00"/>
    <line x1="18" y1="0" x2="18" y2="6" stroke="#ffaa00" stroke-width="0.8" opacity="0.5"/>
    <line x1="18" y1="30" x2="18" y2="36" stroke="#ffaa00" stroke-width="0.8" opacity="0.5"/>
    <line x1="0" y1="18" x2="6" y2="18" stroke="#ffaa00" stroke-width="0.8" opacity="0.5"/>
    <line x1="30" y1="18" x2="36" y2="18" stroke="#ffaa00" stroke-width="0.8" opacity="0.5"/>
  </svg>`,
  [36, 36]
);

const airfieldIcon = svgIcon(
  `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="9" width="16" height="4" fill="none" stroke="#5a7a8a" stroke-width="1" rx="1"/>
    <line x1="11" y1="5" x2="11" y2="17" stroke="#5a7a8a" stroke-width="0.8"/>
    <text x="11" y="21" text-anchor="middle" fill="#5a7a8a" font-size="5" font-family="monospace">AF</text>
  </svg>`,
  [22, 22]
);

const threatIcon = (type) => {
  const colors = { SAM: '#ff2233', AAA: '#ff6644', MANPAD: '#ff8855', EWR: '#ffaa00', Fighter: '#ff2233', Ship: '#ff4466', Other: '#ff6666' };
  const color = colors[type] || '#ff2233';
  return svgIcon(
    `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,3 22,21 2,21" fill="none" stroke="${color}" stroke-width="1.5"/>
      <text x="12" y="18" text-anchor="middle" fill="${color}" font-size="7" font-family="monospace" font-weight="bold">!</text>
    </svg>`,
    [24, 24]
  );
};

// ── Parse coordinate string to lat/lon ──
function parseCoord(locStr) {
  if (!locStr) return null;
  // Handle "N42.123 E044.567" or "42.123, 44.567" or "42.123 44.567"
  const dms = locStr.match(/([NS]?)\s*([\d.]+)\s*[,\s]+\s*([EW]?)\s*([\d.]+)/i);
  if (dms) {
    let lat = parseFloat(dms[2]);
    let lon = parseFloat(dms[4]);
    if (dms[1].toUpperCase() === 'S') lat = -lat;
    if (dms[3].toUpperCase() === 'W') lon = -lon;
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return [lat, lon];
  }
  return null;
}

// ── Parse bullseye string ──
function parseBullseye(str) {
  if (!str) return null;
  const coord = parseCoord(str);
  if (coord) return coord;
  return null;
}

// ── NM to meters ──
const nmToMeters = (nm) => nm * 1852;

// ── Coordinate display ──
function formatLatLon(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${latDir}${Math.abs(lat).toFixed(4)} ${lonDir}${Math.abs(lon).toFixed(4)}`;
}

// ── Map click handler for coordinate readout ──
function MapClickHandler({ onCoordClick }) {
  useMapEvents({
    click(e) {
      if (onCoordClick) onCoordClick(e.latlng);
    },
  });
  return null;
}

// ── Recenter map when theater changes ──
function TheaterRecenter({ theater }) {
  const map = useMap();
  useEffect(() => {
    const center = THEATER_CENTERS[theater] || THEATER_CENTERS['Caucasus'];
    map.setView([center.lat, center.lon], center.zoom, { animate: true });
  }, [theater, map]);
  return null;
}

// ── Sidebar panel sections ──
const PANELS = [
  { id: 'waypoints', label: 'WAYPOINTS', icon: '\u25C7' },
  { id: 'threats',   label: 'THREATS',   icon: '\u26A0' },
  { id: 'airfields', label: 'AIRFIELDS', icon: '\u2708' },
  { id: 'info',      label: 'MAP INFO',  icon: '\u2139' },
];

export default function MissionMap({ missionData, onUpdateField }) {
  const [expandedPanel, setExpandedPanel] = useState('waypoints');
  const [showAirfields, setShowAirfields] = useState(true);
  const [showThreats, setShowThreats]     = useState(true);
  const [showRoute, setShowRoute]         = useState(true);
  const [cursorCoord, setCursorCoord]     = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  const theater = missionData.theater || 'Caucasus';
  const center = THEATER_CENTERS[theater] || THEATER_CENTERS['Caucasus'];

  // Build waypoint positions array
  const waypointPositions = useMemo(() => {
    return missionData.waypoints
      .map((wp, idx) => {
        const lat = parseFloat(wp.lat);
        const lon = parseFloat(wp.lon);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90) {
          return { ...wp, lat, lon, idx };
        }
        return null;
      })
      .filter(Boolean);
  }, [missionData.waypoints]);

  // Build route polyline
  const routeLine = useMemo(() => {
    return waypointPositions.map(wp => [wp.lat, wp.lon]);
  }, [waypointPositions]);

  // Build threat positions
  const threatPositions = useMemo(() => {
    return missionData.threats
      .map((t, idx) => {
        // Try lat/lon first, then parse location string
        let lat = parseFloat(t.lat);
        let lon = parseFloat(t.lon);
        if (isNaN(lat) || isNaN(lon)) {
          const parsed = parseCoord(t.location);
          if (parsed) { lat = parsed[0]; lon = parsed[1]; }
          else return null;
        }
        const range = parseFloat(t.range_nm) || 0;
        return { ...t, lat, lon, range, idx };
      })
      .filter(Boolean);
  }, [missionData.threats]);

  // Bullseye
  const bullseyePos = useMemo(() => parseBullseye(missionData.bullseye), [missionData.bullseye]);

  const handleCoordClick = useCallback((latlng) => {
    setCursorCoord(latlng);
  }, []);

  const togglePanel = (id) => {
    setExpandedPanel(prev => prev === id ? null : id);
  };

  // Airfields for current theater
  const airfields = theater === 'Caucasus' ? CAUCASUS_AIRFIELDS : [];

  return (
    <div className="mission-map-container">
      {/* Map sidebar toggle */}
      <button
        className="map-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {sidebarOpen ? '\u25C0' : '\u25B6'}
      </button>

      {/* Collapsible sidebar */}
      {sidebarOpen && (
        <div className="map-sidebar">
          <div className="map-sidebar-header">
            <span>MISSION OVERLAY</span>
          </div>

          {/* Layer toggles */}
          <div className="map-layer-toggles">
            <label className="map-toggle">
              <input type="checkbox" checked={showRoute} onChange={() => setShowRoute(!showRoute)} />
              <span className="toggle-label route">Route</span>
            </label>
            <label className="map-toggle">
              <input type="checkbox" checked={showThreats} onChange={() => setShowThreats(!showThreats)} />
              <span className="toggle-label threats">Threats</span>
            </label>
            <label className="map-toggle">
              <input type="checkbox" checked={showAirfields} onChange={() => setShowAirfields(!showAirfields)} />
              <span className="toggle-label airfields">Airfields</span>
            </label>
          </div>

          {/* Accordion panels */}
          {PANELS.map(p => (
            <div key={p.id} className={`map-panel ${expandedPanel === p.id ? 'expanded' : ''}`}>
              <button className="map-panel-header" onClick={() => togglePanel(p.id)}>
                <span>{p.icon} {p.label}</span>
                <span className="panel-chevron">{expandedPanel === p.id ? '\u25B4' : '\u25BE'}</span>
              </button>
              {expandedPanel === p.id && (
                <div className="map-panel-body">
                  {p.id === 'waypoints' && (
                    <>
                      {waypointPositions.length === 0 ? (
                        <div className="map-panel-empty">No waypoints with coordinates.<br/>Add lat/lon in the Waypoints tab.</div>
                      ) : (
                        <div className="map-panel-list">
                          {waypointPositions.map((wp, i) => (
                            <div key={i} className="map-panel-item">
                              <span className="wp-num">{wp.number}</span>
                              <span className="wp-name">{wp.name || 'WP'}</span>
                              <span className="wp-coord">{formatLatLon(wp.lat, wp.lon)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="map-panel-stat">
                        {waypointPositions.length} plotted / {missionData.waypoints.length} total
                      </div>
                    </>
                  )}
                  {p.id === 'threats' && (
                    <>
                      {threatPositions.length === 0 ? (
                        <div className="map-panel-empty">No threats with coordinates.<br/>Use "N42 E044" format in location.</div>
                      ) : (
                        <div className="map-panel-list">
                          {threatPositions.map((t, i) => (
                            <div key={i} className="map-panel-item threat">
                              <span className="threat-type">{t.type}</span>
                              <span className="threat-name">{t.name || 'Unknown'}</span>
                              <span className="threat-range">{t.range}nm</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {p.id === 'airfields' && (
                    <div className="map-panel-list">
                      {airfields.map((af, i) => (
                        <div key={i} className="map-panel-item airfield">
                          <span className="af-icao">{af.icao}</span>
                          <span className="af-name">{af.name}</span>
                          <span className="af-freq">{af.tower}</span>
                        </div>
                      ))}
                      {airfields.length === 0 && (
                        <div className="map-panel-empty">No airfield data for {theater}.</div>
                      )}
                    </div>
                  )}
                  {p.id === 'info' && (
                    <div className="map-panel-info">
                      <div className="info-row"><span>THEATER</span><span>{theater}</span></div>
                      <div className="info-row"><span>BULLSEYE</span><span>{missionData.bullseye || 'NOT SET'}</span></div>
                      <div className="info-row"><span>AIRCRAFT</span><span>{missionData.aircraft_type || '--'}</span></div>
                      <div className="info-row"><span>CALLSIGN</span><span>{missionData.callsign || '--'}</span></div>
                      {cursorCoord && (
                        <>
                          <div className="info-divider" />
                          <div className="info-row cursor"><span>CURSOR</span><span>{formatLatLon(cursorCoord.lat, cursorCoord.lng)}</span></div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* The map */}
      <div className="map-canvas">
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={center.zoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Dark military-style tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            maxZoom={18}
          />
          {/* Labels layer on top */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            maxZoom={18}
            opacity={0.4}
          />

          <TheaterRecenter theater={theater} />
          <MapClickHandler onCoordClick={handleCoordClick} />

          {/* ── Bullseye ── */}
          {bullseyePos && (
            <Marker position={bullseyePos} icon={bullseyeIcon}>
              <Tooltip permanent direction="right" offset={[18, 0]} className="map-tooltip bullseye-tooltip">
                BULLSEYE
              </Tooltip>
            </Marker>
          )}

          {/* ── Waypoint route line ── */}
          {showRoute && routeLine.length > 1 && (
            <>
              <Polyline positions={routeLine} pathOptions={{ color: '#00d4ff', weight: 1.5, opacity: 0.7, dashArray: '8 4' }} />
              {/* Leg distance labels */}
            </>
          )}

          {/* ── Waypoint markers ── */}
          {showRoute && waypointPositions.map((wp, i) => (
            <Marker
              key={`wp-${i}`}
              position={[wp.lat, wp.lon]}
              icon={waypointIcon(wp.number, i === 0, i === waypointPositions.length - 1)}
            >
              <Tooltip direction="right" offset={[14, 0]} className="map-tooltip wp-tooltip">
                <div className="tt-header">WP {wp.number} {wp.name && `- ${wp.name}`}</div>
                <div className="tt-row">ALT: {wp.alt_ft || '--'} ft</div>
                <div className="tt-row">SPD: {wp.speed_kts || '--'} kts</div>
                {wp.tos && <div className="tt-row">TOS: {wp.tos}</div>}
                {wp.action && <div className="tt-row">ACT: {wp.action}</div>}
              </Tooltip>
            </Marker>
          ))}

          {/* ── Threat rings ── */}
          {showThreats && threatPositions.map((t, i) => (
            <React.Fragment key={`threat-${i}`}>
              {t.range > 0 && (
                <Circle
                  center={[t.lat, t.lon]}
                  radius={nmToMeters(t.range)}
                  pathOptions={{
                    color: t.type === 'EWR' ? '#ffaa00' : '#ff2233',
                    weight: 1,
                    opacity: 0.6,
                    fillColor: t.type === 'EWR' ? '#ffaa00' : '#ff2233',
                    fillOpacity: 0.06,
                    dashArray: t.type === 'EWR' ? '6 3' : undefined,
                  }}
                />
              )}
              <Marker position={[t.lat, t.lon]} icon={threatIcon(t.type)}>
                <Tooltip direction="right" offset={[12, 0]} className="map-tooltip threat-tooltip">
                  <div className="tt-header">{t.name || t.type}</div>
                  <div className="tt-row">TYPE: {t.type}</div>
                  <div className="tt-row">RANGE: {t.range} nm</div>
                  {t.notes && <div className="tt-row">{t.notes}</div>}
                </Tooltip>
              </Marker>
            </React.Fragment>
          ))}

          {/* ── Airfield markers ── */}
          {showAirfields && airfields.map((af, i) => (
            <Marker key={`af-${i}`} position={[af.lat, af.lon]} icon={airfieldIcon}>
              <Popup className="map-popup">
                <div className="popup-title">{af.name}</div>
                <div className="popup-row"><span>ICAO:</span> {af.icao}</div>
                <div className="popup-row"><span>TWR:</span> {af.tower}</div>
                {af.ils && <div className="popup-row"><span>ILS:</span> {af.ils}</div>}
                {af.tacan && <div className="popup-row"><span>TCN:</span> {af.tacan}</div>}
                <div className="popup-row"><span>ELEV:</span> {af.elev}</div>
              </Popup>
              <Tooltip direction="top" offset={[0, -12]} className="map-tooltip af-tooltip">
                {af.icao}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Coordinate readout overlay */}
        <div className="map-coord-readout">
          {cursorCoord
            ? formatLatLon(cursorCoord.lat, cursorCoord.lng)
            : 'Click map for coordinates'}
        </div>

        {/* Mission tag overlay */}
        <div className="map-mission-tag">
          {missionData.mission_name || '135TH MISSION MAP'} / {theater.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
