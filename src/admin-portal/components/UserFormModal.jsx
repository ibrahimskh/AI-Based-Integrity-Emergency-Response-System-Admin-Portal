import { useEffect, useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import { Field, Input, Select } from '../../shared/components/Field';
import { useToast } from '../../shared/context/ToastContext';
import { dbAdd, dbUpdate } from '../../shared/data/db';
import { validateUserForm } from '../../shared/utils/validation';

const USER_TYPES = ['Patient', 'Blood Donor', 'Ambulance Driver', 'Hospital Staff', 'Hospital Admin', 'System Admin'];
const ROLE_BY_TYPE = { 'Patient': 'patient', 'Blood Donor': 'donor', 'Ambulance Driver': 'driver', 'Hospital Staff': 'hospital', 'Hospital Admin': 'hospital', 'System Admin': 'admin' };

const empty = { name: '', email: '', phone: '', userType: 'Patient' };

export default function UserFormModal({ open, onClose, user, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(user ? { name: user.name, email: user.email, phone: user.phone || '', userType: user.userType } : empty); setErrors({}); }
  }, [open, user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateUserForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (user) {
        await dbUpdate('users', user.id, { ...form, role: ROLE_BY_TYPE[form.userType] });
        toast.success('User updated.');
      } else {
        await dbAdd('users', { ...form, role: ROLE_BY_TYPE[form.userType], status: 'active' });
        toast.success('User added.');
      }
      onSaved();
      onClose();
    } catch {
      toast.error('Could not save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit User' : 'Add User'} footer={
      <>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>{user ? 'Save Changes' : 'Add User'}</Button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <Field label="Full Name" required error={errors.name}>
          <Input value={form.name} onChange={set('name')} error={errors.name} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email} onChange={set('email')} error={errors.email} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={set('phone')} error={errors.phone} />
        </Field>
        <Field label="User Type" required error={errors.userType}>
          <Select value={form.userType} onChange={set('userType')}>
            {USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
