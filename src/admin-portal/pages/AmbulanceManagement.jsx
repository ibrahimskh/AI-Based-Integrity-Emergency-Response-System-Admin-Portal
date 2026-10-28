import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Power, MapPin } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Field, Input, Select } from '../../shared/components/Field';
import { Modal, ConfirmDialog } from '../../shared/components/Modal';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbAdd, dbUpdate } from '../../shared/data/db';
import { validateAmbulanceForm } from '../../shared/utils/validation';

const STATUSES = ['available', 'assigned', 'en_route', 'at_hospital', 'returning', 'offline'];
const emptyForm = { id: '', driverName: '', driverPhone: '', currentLocation: '', status: 'available' };

export default function AmbulanceManagement() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [ambulances, setAmbulances] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = dbSubscribe('ambulances', (list) => { setAmbulances(list); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => ambulances.filter((a) => {
    const q = !query || (a.registrationNumber || a.id || '').toLowerCase().includes(query.toLowerCase()) || (a.driverName || '').toLowerCase().includes(query.toLowerCase());
    const s = statusFilter === 'all' || a.status === statusFilter;
    return q && s;
  }), [ambulances, query, statusFilter]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setFormOpen(true); };
  const openEdit = (a) => { setEditing(a); setForm(a); setErrors({}); setFormOpen(true); };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateAmbulanceForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (editing) {
        await dbUpdate('ambulances', editing.id, form);
        toast.success('Ambulance updated.');
      } else {
        if (ambulances.some((a) => a.id === form.id)) throw new Error('duplicate');
        await dbAdd('ambulances', { ...form, assignedPatientId: null, eta: null, lastUpdated: new Date().toISOString() });
        toast.success('Ambulance added.');
      }
      setFormOpen(false);
    } catch (err) {
      if (err.message === 'duplicate') setErrors({ id: 'An ambulance with this ID already exists.' });
      else toast.error('Could not save ambulance.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const a = toggleTarget;
    setBusy(true);
    try {
      await dbUpdate('ambulances', a.id, { status: a.status === 'offline' ? 'available' : 'offline' });
      toast.success(`${a.id} ${a.status === 'offline' ? 'activated' : 'deactivated'}.`);
      setToggleTarget(null);
    } catch { toast.error('Could not update ambulance.'); }
    finally { setBusy(false); }
  };

  if (loading) return <Spinner label="Loading ambulance fleet…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID or driver…" className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <Button icon={Plus} onClick={openAdd} className="shrink-0">Add Ambulance</Button>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState title="No matching ambulances" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-lifeline-sub border-b border-lifeline-border">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lifeline-border">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-semibold">{a.registrationNumber || a.id}</td>
                    <td className="px-5 py-3.5">{a.driverName}<p className="text-xs text-lifeline-sub">{a.driverPhone}</p></td>
                    <td className="px-5 py-3.5 text-lifeline-sub"><span className="inline-flex items-center gap-1"><MapPin size={12} /> {a.currentLocation}</span></td>
                    <td className="px-5 py-3.5"><Badge value={a.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button title="Edit" onClick={() => openEdit(a)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                        <button title={a.status === 'offline' ? 'Activate' : 'Deactivate'} onClick={() => setToggleTarget(a)} className={`p-1.5 rounded-md hover:bg-slate-100 ${a.status === 'offline' ? 'text-emerald-600' : 'text-amber-600'}`}><Power size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Ambulance' : 'Add Ambulance'} footer={
        <>
          <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>{editing ? 'Save Changes' : 'Add Ambulance'}</Button>
        </>
      }>
        <form onSubmit={handleSubmit}>
          <Field label="Ambulance ID" required error={errors.id}>
            <Input value={form.id} onChange={set('id')} disabled={!!editing} placeholder="e.g. AMB-150" error={errors.id} />
          </Field>
          <Field label="Driver Name" required error={errors.driverName}>
            <Input value={form.driverName} onChange={set('driverName')} error={errors.driverName} />
          </Field>
          <Field label="Driver Phone" required error={errors.driverPhone}>
            <Input value={form.driverPhone} onChange={set('driverPhone')} error={errors.driverPhone} />
          </Field>
          <Field label="Current Location">
            <Input value={form.currentLocation} onChange={set('currentLocation')} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={toggleActive}
        title={`${toggleTarget?.status === 'offline' ? 'Activate' : 'Deactivate'} ${toggleTarget?.id}?`}
        confirmLabel="Confirm"
        variant="dark"
        loading={busy}
      />
    </div>
  );
}
