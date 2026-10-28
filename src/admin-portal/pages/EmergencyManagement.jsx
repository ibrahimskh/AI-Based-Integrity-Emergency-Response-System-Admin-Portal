import { useEffect, useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Input, Select } from '../../shared/components/Field';
import { Modal } from '../../shared/components/Modal';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbUpdate } from '../../shared/data/db';
import { fmtDateTime } from '../../shared/utils/format';

const STATUSES = ['in_progress', 'resolved'];

export default function EmergencyManagement() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [emergencies, setEmergencies] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const u1 = dbSubscribe('emergencies', (list) => { setEmergencies(list); setLoading(false); });
    const u2 = dbSubscribe('hospitals', setHospitals);
    return () => { u1(); u2(); };
  }, []);

  const hospitalName = (id) => hospitals.find((h) => h.id === id)?.name || id;

  const filtered = useMemo(() => emergencies.filter((e) => {
    const q = !query || (e.patientName || '').toLowerCase().includes(query.toLowerCase()) || (e.id || '').toLowerCase().includes(query.toLowerCase());
    const s = statusFilter === 'all' || e.status === statusFilter;
    return q && s;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [emergencies, query, statusFilter]);

  const updateStatus = async (em, status) => {
    try {
      await dbUpdate('emergencies', em.id, { status });
      toast.success(`Emergency ${em.id} marked ${status.replace(/_/g, ' ')}.`);
    } catch { toast.error('Could not update emergency.'); }
  };

  if (loading) return <Spinner label="Loading emergencies…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by patient or emergency ID…" className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState title="No emergencies found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-lifeline-sub border-b border-lifeline-border">
                  <th className="px-5 py-3">Emergency</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Hospital</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lifeline-border">
                {filtered.map((em) => (
                  <tr key={em.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-semibold">{em.id}</td>
                    <td className="px-5 py-3.5">{em.patientName}</td>
                    <td className="px-5 py-3.5 text-lifeline-sub">{hospitalName(em.hospitalId)}</td>
                    <td className="px-5 py-3.5"><Badge value={em.severity} /></td>
                    <td className="px-5 py-3.5"><Badge value={em.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {em.status === 'in_progress' && (
                          <Button size="sm" variant="success" onClick={() => updateStatus(em, 'resolved')}>Resolve</Button>
                        )}
                        <Button size="sm" variant="outline" icon={Eye} onClick={() => setViewing(em)}>View</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Emergency ${viewing?.id}`} footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs font-bold uppercase text-lifeline-sub">Patient</p><p>{viewing.patientName}</p></div>
            <div><p className="text-xs font-bold uppercase text-lifeline-sub">Ambulance</p><p>{viewing.ambulanceId}</p></div>
            <div><p className="text-xs font-bold uppercase text-lifeline-sub">Hospital</p><p>{hospitalName(viewing.hospitalId)}</p></div>
            <div><p className="text-xs font-bold uppercase text-lifeline-sub">Location</p><p>{viewing.location}</p></div>
            <div><p className="text-xs font-bold uppercase text-lifeline-sub">ETA</p><p>{viewing.eta != null ? `${viewing.eta} min` : '—'}</p></div>
            <div><p className="text-xs font-bold uppercase text-lifeline-sub">Created</p><p>{fmtDateTime(viewing.createdAt)}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
