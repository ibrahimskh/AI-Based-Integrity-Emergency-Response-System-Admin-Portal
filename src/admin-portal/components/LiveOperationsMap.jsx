import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Ambulance, Building2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Custom marker icons built as inline SVG (no external image assets needed,
// so nothing breaks under Vite's bundler — the classic Leaflet marker-icon
// png path issue is avoided entirely).
// ---------------------------------------------------------------------------

const AMBULANCE_COLORS = {
  available: '#10b981',
  assigned: '#3b82f6',
  en_route: '#f59e0b',
  at_hospital: '#8b5cf6',
  returning: '#64748b',
  offline: '#94a3b8',
};

function ambulanceIcon(status, pulse) {
  const color = AMBULANCE_COLORS[status] || '#64748b';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:30px;height:30px;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.35;animation:lifeline-pulse 1.6s ease-out infinite;"></span>` : ''}
        <div style="position:relative;width:30px;height:30px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M8 8v4"/><path d="M9 18h6"/><path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function hospitalIcon(critical) {
  const color = critical ? '#d92d3c' : '#1b1d29';
  return L.divIcon({
    className: '',
    html: `
      <div style="width:34px;height:34px;border-radius:10px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2"/><path d="M18 22V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v18"/></svg>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
    popupAnchor: [0, -28],
  });
}

// Fits the map to all visible markers whenever the set changes.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [JSON.stringify(points)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const ACTIVE_STATUSES = ['assigned', 'en_route', 'at_hospital'];

export default function LiveOperationsMap({ ambulances = [], hospitals = [], height = 460 }) {
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);

  const located = useMemo(
    () => ambulances.filter((a) => typeof a.lat === 'number' && typeof a.lng === 'number'),
    [ambulances]
  );
  const locatedHospitals = useMemo(
    () => hospitals.filter((h) => typeof h.lat === 'number' && typeof h.lng === 'number'),
    [hospitals]
  );

  const allPoints = useMemo(() => [
    ...located.map((a) => [a.lat, a.lng]),
    ...locatedHospitals.map((h) => [h.lat, h.lng]),
  ], [located, locatedHospitals]);

  const center = allPoints.length ? allPoints[0] : [25.396, 68.3578];

  const activeCount = located.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const avgEta = (() => {
    const etas = located.filter((a) => ACTIVE_STATUSES.includes(a.status) && typeof a.eta === 'number').map((a) => a.eta);
    if (!etas.length) return null;
    return (etas.reduce((s, v) => s + v, 0) / etas.length).toFixed(1);
  })();

  return (
    <div className="relative rounded-2xl overflow-hidden border border-lifeline-border" style={{ height }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {showHospitals && locatedHospitals.map((h) => {
          const critical = h.availableBeds < h.totalBeds * 0.15;
          return (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon(critical)}
              eventHandlers={{ click: () => setSelectedZone({ type: 'hospital', ...h }) }}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-sm mb-1">{h.name}</p>
                  <p className="text-slate-500 mb-1">{h.address}</p>
                  <p><b>{h.availableBeds}</b> / {h.totalBeds} beds available</p>
                  <p><b>{h.availableIcuBeds}</b> / {h.icuBeds} ICU beds</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {showAmbulances && located.map((a) => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={ambulanceIcon(a.status, a.status === 'en_route')}
            eventHandlers={{ click: () => setSelectedZone({ type: 'ambulance', ...a }) }}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-sm mb-1">{a.id}</p>
                <p className="text-slate-500 mb-1">{a.driverName} · {a.driverPhone}</p>
                <p className="capitalize mb-1">Status: <b>{a.status.replace(/_/g, ' ')}</b></p>
                {a.eta != null && <p>ETA: <b>{a.eta} min</b></p>}
                <p className="text-slate-500">{a.currentLocation}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating zone / stats card, top-left, styled like the reference design */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-lifeline-border shadow-lg px-4 py-3 w-52 pointer-events-none">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold">{selectedZone ? (selectedZone.type === 'hospital' ? selectedZone.name : selectedZone.id) : 'Live Fleet'}</p>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-lifeline-sub">Active Units</span>
            <span className="font-bold">{activeCount}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-lifeline-sub">Avg ETA</span>
            <span className="font-bold">{avgEta ? `${avgEta} min` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Layer toggle, top-right, like the reference screenshot */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-lg border border-lifeline-border shadow-lg flex text-[11px] font-bold overflow-hidden">
        <button
          onClick={() => setShowAmbulances((v) => !v)}
          className={`px-3 py-2 flex items-center gap-1.5 transition-colors ${showAmbulances ? 'bg-lifeline-red text-white' : 'text-lifeline-sub hover:bg-slate-50'}`}
        >
          <Ambulance size={13} /> AMBULANCES
        </button>
        <button
          onClick={() => setShowHospitals((v) => !v)}
          className={`px-3 py-2 flex items-center gap-1.5 border-l border-lifeline-border transition-colors ${showHospitals ? 'bg-lifeline-ink text-white' : 'text-lifeline-sub hover:bg-slate-50'}`}
        >
          <Building2 size={13} /> HOSPITALS
        </button>
      </div>

      <style>{`
        @keyframes lifeline-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
      `}</style>
    </div>
  );
}
