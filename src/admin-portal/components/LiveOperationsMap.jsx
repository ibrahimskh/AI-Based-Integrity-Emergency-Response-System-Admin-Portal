import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { Ambulance, Building2 } from 'lucide-react';

const AMBULANCE_COLORS = {
  available: '#10b981',
  assigned: '#3b82f6',
  en_route: '#f59e0b',
  at_hospital: '#8b5cf6',
  returning: '#64748b',
  offline: '#94a3b8',
};

const KARACHI = [24.8607, 67.0011];

function ambulanceIcon(status, pulse) {
  const color = AMBULANCE_COLORS[status] || '#64748b';
  return L.divIcon({
    className: 'lifeline-pin',
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.35;animation:lifeline-pulse 1.6s ease-out infinite;"></span>` : ''}
        <div style="position:relative;width:28px;height:28px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M8 8v4"/><path d="M9 18h6"/><path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function hospitalIcon(critical) {
  const color = critical ? '#d92d3c' : '#1b1d29';
  return L.divIcon({
    className: 'lifeline-pin',
    html: `
      <div style="width:30px;height:30px;border-radius:9px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 8h-4"/><path d="M18 12h2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2"/><path d="M18 22V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v18"/></svg>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 26],
    popupAnchor: [0, -24],
  });
}

function clusterIcon(count, kind) {
  const size = count > 500 ? 50 : count > 100 ? 44 : count > 20 ? 38 : 34;
  const bg = kind === 'hospital' ? '#1b1d29' : '#d92d3c';
  return L.divIcon({
    className: 'lifeline-cluster',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:white;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;font:700 12px/1 Inter,system-ui,sans-serif;">${count > 999 ? `${Math.round(count / 1000)}k` : count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function hasCoord(item) {
  return Number.isFinite(item?.lat) && Number.isFinite(item?.lng) && !(item.lat === 0 && item.lng === 0);
}

function isCriticalHospital(h) {
  return h.totalBeds > 0 && h.availableBeds < h.totalBeds * 0.15;
}

function ambulancePopup(a) {
  return `<div class="text-xs" style="min-width:160px">
    <p style="font-weight:700;font-size:13px;margin:0 0 4px">${a.registrationNumber || a.id}</p>
    <p style="color:#64748b;margin:0 0 4px">${a.driverName || '—'} · ${a.driverPhone || ''}</p>
    <p style="margin:0 0 2px;text-transform:capitalize">Status: <b>${String(a.status || '').replace(/_/g, ' ')}</b></p>
    ${a.eta != null ? `<p style="margin:0">ETA: <b>${a.eta} min</b></p>` : ''}
    <p style="color:#64748b;margin:4px 0 0">${a.currentLocation || ''}</p>
  </div>`;
}

function hospitalPopup(h) {
  return `<div class="text-xs" style="min-width:180px">
    <p style="font-weight:700;font-size:13px;margin:0 0 4px">${h.name || 'Hospital'}</p>
    <p style="color:#64748b;margin:0 0 6px">${h.address || ''}</p>
    <p style="margin:0"><b>${h.availableBeds ?? 0}</b> / ${h.totalBeds ?? 0} beds available</p>
    <p style="margin:2px 0 0"><b>${h.availableIcuBeds ?? 0}</b> / ${h.icuBeds ?? 0} ICU beds</p>
  </div>`;
}

function ClusterLayer({ items, kind, onSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!items.length) return undefined;

    const group = L.markerClusterGroup({
      maxClusterRadius: kind === 'hospital' ? 72 : 48,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.6,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: kind === 'hospital' ? 16 : 15,
      chunkedLoading: true,
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount(), kind),
    });

    const markers = items.map((item, index) => {
      const marker = L.marker([item.lat, item.lng], {
        icon: kind === 'hospital'
          ? hospitalIcon(isCriticalHospital(item))
          : ambulanceIcon(item.status, item.status === 'en_route'),
        keyboard: false,
      });
      marker.bindPopup(kind === 'hospital' ? hospitalPopup(item) : ambulancePopup(item), { maxWidth: 240 });
      marker.on('click', () => onSelect?.({ type: kind, ...item }));
      marker.options.alt = item.docId || item.id || String(index);
      return marker;
    });

    group.addLayers(markers);
    map.addLayer(group);

    return () => {
      group.clearLayers();
      map.removeLayer(group);
    };
  }, [map, items, kind, onSelect]);

  return null;
}

function FitToFleet({ points }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !points.length) return;
    fitted.current = true;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 12 });
  }, [map, points]);

  return null;
}

const ACTIVE_STATUSES = ['assigned', 'en_route', 'at_hospital'];

export default function LiveOperationsMap({ ambulances = [], hospitals = [], height = 460 }) {
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [hospitalMode, setHospitalMode] = useState('clustered'); // clustered | critical
  const [selectedZone, setSelectedZone] = useState(null);

  const located = useMemo(
    () => ambulances.filter(hasCoord),
    [ambulances]
  );
  const locatedHospitals = useMemo(
    () => hospitals.filter(hasCoord),
    [hospitals]
  );
  const visibleHospitals = useMemo(
    () => (hospitalMode === 'critical' ? locatedHospitals.filter(isCriticalHospital) : locatedHospitals),
    [locatedHospitals, hospitalMode]
  );

  const fleetPoints = useMemo(
    () => located.filter((a) => ACTIVE_STATUSES.includes(a.status)).map((a) => [a.lat, a.lng]),
    [located]
  );
  const fitPoints = fleetPoints.length ? fleetPoints : located.slice(0, 40).map((a) => [a.lat, a.lng]);

  const activeCount = located.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const avgEta = (() => {
    const etas = located.filter((a) => ACTIVE_STATUSES.includes(a.status) && typeof a.eta === 'number').map((a) => a.eta);
    if (!etas.length) return null;
    return (etas.reduce((s, v) => s + v, 0) / etas.length).toFixed(1);
  })();
  const criticalCount = locatedHospitals.filter(isCriticalHospital).length;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-lifeline-border" style={{ height }}>
      <MapContainer
        center={KARACHI}
        zoom={11}
        minZoom={9}
        maxZoom={17}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToFleet points={fitPoints} />
        {showHospitals && (
          <ClusterLayer items={visibleHospitals} kind="hospital" onSelect={setSelectedZone} />
        )}
        {showAmbulances && (
          <ClusterLayer items={located} kind="ambulance" onSelect={setSelectedZone} />
        )}
      </MapContainer>

      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-lifeline-border shadow-lg px-4 py-3 w-52 pointer-events-none">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold truncate pr-2">
            {selectedZone ? (selectedZone.type === 'hospital' ? selectedZone.name : (selectedZone.registrationNumber || selectedZone.id)) : 'Live Fleet'}
          </p>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
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
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-lifeline-sub">Hospitals</span>
            <span className="font-bold">{visibleHospitals.length.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        <div className="bg-white/95 backdrop-blur rounded-lg border border-lifeline-border shadow-lg flex text-[11px] font-bold overflow-hidden">
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
        {showHospitals && (
          <div className="bg-white/95 backdrop-blur rounded-lg border border-lifeline-border shadow-lg flex text-[11px] font-bold overflow-hidden">
            <button
              onClick={() => setHospitalMode('clustered')}
              className={`px-3 py-1.5 transition-colors ${hospitalMode === 'clustered' ? 'bg-slate-800 text-white' : 'text-lifeline-sub hover:bg-slate-50'}`}
            >
              Clustered
            </button>
            <button
              onClick={() => setHospitalMode('critical')}
              className={`px-3 py-1.5 border-l border-lifeline-border transition-colors ${hospitalMode === 'critical' ? 'bg-lifeline-red text-white' : 'text-lifeline-sub hover:bg-slate-50'}`}
            >
              Low beds ({criticalCount})
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes lifeline-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
        .marker-cluster, .lifeline-cluster { background: transparent !important; }
        .lifeline-pin { background: transparent; border: none; }
      `}</style>
    </div>
  );
}
