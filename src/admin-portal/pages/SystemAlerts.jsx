import { useEffect, useMemo, useState } from 'react';
import { BedDouble, HeartPulse, Ambulance, AlertTriangle, Sparkles, ServerCrash } from 'lucide-react';
import Card from '../../shared/components/Card';
import { Spinner, EmptyState } from '../../shared/components/States';
import { dbSubscribe } from '../../shared/data/db';
import { timeAgo } from '../../shared/utils/format';

export default function SystemAlerts() {
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [patients, setPatients] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const subs = [
      dbSubscribe('hospitals', setHospitals),
      dbSubscribe('ambulances', setAmbulances),
      dbSubscribe('patients', setPatients),
      dbSubscribe('ai_predictions', setPredictions),
      dbSubscribe('system_logs', (l) => { setLogs(l); setLoading(false); }),
    ];
    return () => subs.forEach((u) => u());
  }, []);

  const alerts = useMemo(() => {
    const list = [];
    hospitals.forEach((h) => {
      if (h.availableBeds < h.totalBeds * 0.15) list.push({ icon: BedDouble, tone: 'amber', title: `Low bed availability — ${h.name}`, detail: `${h.availableBeds} of ${h.totalBeds} beds remaining`, ts: new Date().toISOString() });
      if (h.availableIcuBeds === 0) list.push({ icon: HeartPulse, tone: 'red', title: `No ICU availability — ${h.name}`, detail: `0 of ${h.icuBeds} ICU beds free`, ts: new Date().toISOString() });
    });
    ambulances.forEach((a) => {
      if (a.status === 'offline') list.push({ icon: Ambulance, tone: 'slate', title: `Ambulance offline — ${a.id}`, detail: `Driver: ${a.driverName}`, ts: a.lastUpdated });
    });
    patients.filter((p) => p.severity === 'critical' && !['discharged', 'cancelled'].includes(p.status)).forEach((p) => {
      list.push({ icon: AlertTriangle, tone: 'red', title: `Critical patient — ${p.name}`, detail: `${p.emergencyType} · status: ${p.status.replace(/_/g, ' ')}`, ts: p.createdAt });
    });
    predictions.filter((p) => p.error).forEach((p) => {
      list.push({ icon: Sparkles, tone: 'amber', title: 'AI prediction failed', detail: p.error, ts: p.requestedAt });
    });
    logs.filter((l) => l.level === 'error').forEach((l) => {
      list.push({ icon: ServerCrash, tone: 'red', title: 'System error', detail: l.message, ts: l.createdAt });
    });
    return list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }, [hospitals, ambulances, patients, predictions, logs]);

  const TONE = { red: 'bg-red-50 text-lifeline-red', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-100 text-slate-500' };

  if (loading) return <Spinner label="Scanning system status…" />;

  return (
    <Card padded={false}>
      {alerts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No active alerts" description="Everything is operating within normal thresholds." />
      ) : (
        <ul className="divide-y divide-lifeline-border">
          {alerts.map((a, i) => (
            <li key={i} className="px-5 py-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${TONE[a.tone]}`}>
                <a.icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-lifeline-sub mt-0.5">{a.detail}</p>
              </div>
              <span className="text-xs text-lifeline-sub shrink-0">{timeAgo(a.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
