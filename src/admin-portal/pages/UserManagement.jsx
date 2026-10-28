import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Ban, CheckCircle2 } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import Badge from '../../shared/components/Badge';
import { Input, Select } from '../../shared/components/Field';
import { ConfirmDialog } from '../../shared/components/Modal';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbUpdate, dbDelete } from '../../shared/data/db';
import UserFormModal from '../components/UserFormModal';

const USER_TYPES = ['Patient', 'Blood Donor', 'Ambulance Driver', 'Hospital Staff', 'Hospital Admin', 'System Admin'];

export default function UserManagement() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'toggle', user }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = dbSubscribe('users', (list) => { setUsers(list); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => users.filter((u) => {
    const q = !query || (u.name || '').toLowerCase().includes(query.toLowerCase()) || (u.email || '').toLowerCase().includes(query.toLowerCase());
    const t = typeFilter === 'all' || u.userType === typeFilter;
    return q && t;
  }), [users, query, typeFilter]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u) => { setEditing(u); setFormOpen(true); };

  const toggleStatus = async () => {
    const u = confirmAction.user;
    setBusy(true);
    try {
      await dbUpdate('users', u.id, { status: u.status === 'active' ? 'disabled' : 'active' });
      toast.success(`${u.name} ${u.status === 'active' ? 'disabled' : 'enabled'}.`);
      setConfirmAction(null);
    } catch { toast.error('Could not update user status.'); }
    finally { setBusy(false); }
  };

  const deleteUser = async () => {
    const u = confirmAction.user;
    setBusy(true);
    try {
      await dbDelete('users', u.id);
      toast.success(`${u.name} deleted.`);
      setConfirmAction(null);
    } catch { toast.error('Could not delete user.'); }
    finally { setBusy(false); }
  };

  if (loading) return <Spinner label="Loading users…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-56">
          <option value="all">All user types</option>
          {USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Button icon={Plus} onClick={openAdd} className="shrink-0">Add User</Button>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState title="No matching users" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-lifeline-sub border-b border-lifeline-border">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lifeline-border">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-semibold">{u.name}</td>
                    <td className="px-5 py-3.5 text-lifeline-sub">{u.email}</td>
                    <td className="px-5 py-3.5">{u.userType}</td>
                    <td className="px-5 py-3.5"><Badge value={u.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button title="Edit" onClick={() => openEdit(u)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"><Pencil size={15} /></button>
                        <button
                          title={u.status === 'active' ? 'Disable' : 'Enable'}
                          onClick={() => setConfirmAction({ type: 'toggle', user: u })}
                          className={`p-1.5 rounded-md hover:bg-slate-100 ${u.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}`}
                        >
                          {u.status === 'active' ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                        <button title="Delete" onClick={() => setConfirmAction({ type: 'delete', user: u })} className="p-1.5 rounded-md hover:bg-red-50 text-lifeline-red"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editing} onSaved={() => {}} />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction?.type === 'delete' ? deleteUser : toggleStatus}
        title={confirmAction?.type === 'delete' ? `Delete ${confirmAction?.user?.name}?` : `${confirmAction?.user?.status === 'active' ? 'Disable' : 'Enable'} ${confirmAction?.user?.name}?`}
        description={confirmAction?.type === 'delete' ? 'This will permanently remove the user account. This cannot be undone.' : 'This changes the user\u2019s access to the platform immediately.'}
        confirmLabel={confirmAction?.type === 'delete' ? 'Delete' : 'Confirm'}
        variant={confirmAction?.type === 'delete' ? 'danger' : 'dark'}
        loading={busy}
      />
    </div>
  );
}
