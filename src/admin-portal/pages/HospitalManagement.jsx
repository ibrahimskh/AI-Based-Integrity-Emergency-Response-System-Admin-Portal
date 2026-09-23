import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Eye, Power } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Input, Select } from '../../shared/components/Field';
import { Modal, ConfirmDialog } from '../../shared/components/Modal';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbUpdate } from '../../shared/data/db';
import HospitalFormModal from '../components/HospitalFormModal';

export default function HospitalManagement() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = dbSubscribe('hospitals', (list) => { setHospitals(list); setLoading(false); });
    const u2 = dbSubscribe('patients', setPatients);
    return () => { u1(); u2(); };
  }, []);

  const filtered = useMemo(() => hospitals.filter((h) => {
    const q = !query || h.name.toLowerCase().includes(query.toLowerCase());
    const s = statusFilter === 'all' || h.status === statusFilter;
    return q && s;
  }), [hospitals, query, statusFilter]);

  const toggleActive = async () => {
    const h = toggleTarget;
    setBusy(true);
    try {
      await dbUpdate('hospitals', h.id, { status: h.status === 'active' ? 'inactive' : 'active' });
      toast.success(`${h.name} ${h.status === 'active' ? 'deactivated' : 'activated'}.`);
      setToggleTarget(null);
    } catch { toast.error('Could not update hospital status.'); }
    finally { setBusy(false); }
  };

  if (loading) return <Spinner label="Loading hospitals…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hospitals…" className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }} className="shrink-0">Add Hospital</Button>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState title="No matching hospitals" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-lifeline-sub border-b border-lifeline-border">
                  <th className="px-5 py-3">Hospital</th>
                  <th className="px-5 py-3">Beds</th>
                  <th className="px-5 py-3">ICU</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lifeline-border">
                {filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{h.name}</p>
                      <p className="text-xs text-lifeline-sub">{h.address}</p>
                    </td>
                    <td className="px-5 py-3.5">{h.availableBeds} / {h.totalBeds}</td>
                    <td className="px-5 py-3.5">{h.availableIcuBeds} / {h.icuBeds}</td>
                    <td className="px-5 py-3.5"><Badge value={h.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button title="View" onClick={() => setViewing(h)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"><Eye size={15} /></button>
                        <button title="Edit" onClick={() => { setEditing(h); setFormOpen(true); }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                        <button title={h.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => setToggleTarget(h)} className={`p-1.5 rounded-md hover:bg-slate-100 ${h.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}`}><Power size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <HospitalFormModal open={formOpen} onClose={() => setFormOpen(false)} hospital={editing} onSaved={() => {}} />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name} size="lg" footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs font-bold uppercase text-lifeline-sub">Address</p><p>{viewing.address}</p></div>
              <div><p className="text-xs font-bold uppercase text-lifeline-sub">Contact</p><p>{viewing.contact}</p></div>
              <div><p className="text-xs font-bold uppercase text-lifeline-sub">Beds</p><p>{viewing.availableBeds} available of {viewing.totalBeds}</p></div>
              <div><p className="text-xs font-bold uppercase text-lifeline-sub">ICU</p><p>{viewing.availableIcuBeds} available of {viewing.icuBeds}</p></div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-lifeline-sub mb-2">Incoming Patients</p>
              {patients.filter((p) => p.assignedHospitalId === viewing.id && ['incoming', 'arrived'].includes(p.status)).length === 0 ? (
                <p className="text-sm text-lifeline-sub">No incoming patients right now.</p>
              ) : (
                <ul className="space-y-1.5">
                  {patients.filter((p) => p.assignedHospitalId === viewing.id && ['incoming', 'arrived'].includes(p.status)).map((p) => (
                    <li key={p.id} className="flex justify-between text-sm border border-lifeline-border rounded-lg px-3 py-2">
                      <span>{p.name}</span> <Badge value={p.severity} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={toggleActive}
        title={`${toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'} ${toggleTarget?.name}?`}
        description="This changes whether the hospital can receive new patient assignments."
        confirmLabel="Confirm"
        variant="dark"
        loading={busy}
      />
    </div>
  );
}
