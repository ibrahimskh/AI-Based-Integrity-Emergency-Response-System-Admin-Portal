import { Ambulance } from 'lucide-react';
import Card from '../../shared/components/Card';
import Badge from '../../shared/components/Badge';
import { EmptyState } from '../../shared/components/States';

export default function ActiveDispatches({ emergencies = [], onManage }) {
  const active = emergencies
    .filter((e) => e.status === 'in_progress')
    .sort((a, b) => (a.eta ?? 999) - (b.eta ?? 999));

  return (
    <Card padded={false} className="flex flex-col">
      <div className="px-5 py-4 border-b border-lifeline-border flex items-center justify-between">
        <h3 className="font-bold">Active Dispatches</h3>
        <span className="text-xs font-bold text-lifeline-sub">{active.length} live</span>
      </div>

      {active.length === 0 ? (
        <EmptyState title="No active dispatches" description="Emergencies in progress will appear here." />
      ) : (
        <ul className="divide-y divide-lifeline-border overflow-y-auto" style={{ maxHeight: 400 }}>
          {active.map((e) => (
            <li key={e.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-lifeline-red flex items-center justify-center shrink-0">
                    <Ambulance size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{e.patientName}</p>
                    <p className="text-[11px] text-lifeline-sub truncate">REF #{e.id}</p>
                  </div>
                </div>
                <Badge value={e.severity} />
              </div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-lifeline-sub">Ambulance <b className="text-lifeline-ink">{e.ambulanceId}</b></span>
                <span className="text-lifeline-sub">ETA <b className="text-lifeline-ink">{e.eta != null ? `${e.eta} min` : '—'}</b></span>
              </div>
              <button
                onClick={() => onManage?.(e)}
                className="w-full text-center text-xs font-bold py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                MANAGE UNIT
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
