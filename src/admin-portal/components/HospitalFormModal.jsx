import { useEffect, useState } from 'react';
import { Modal } from '../../shared/components/Modal';
import Button from '../../shared/components/Button';
import { Field, Input, Textarea } from '../../shared/components/Field';
import { useToast } from '../../shared/context/ToastContext';
import { dbAdd, dbUpdate } from '../../shared/data/db';
import { validateHospitalForm } from '../../shared/utils/validation';

const empty = { name: '', address: '', contact: '', emergencyContact: '', edInfo: '', totalBeds: 50, availableBeds: 50, icuBeds: 10, availableIcuBeds: 10 };

export default function HospitalFormModal({ open, onClose, hospital, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(hospital ? { ...hospital } : empty); setErrors({}); }
  }, [open, hospital]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateHospitalForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = { ...form, totalBeds: Number(form.totalBeds), availableBeds: Number(form.availableBeds ?? form.totalBeds), icuBeds: Number(form.icuBeds), availableIcuBeds: Number(form.availableIcuBeds ?? form.icuBeds) };
      if (hospital) {
        await dbUpdate('hospitals', hospital.id, payload);
        toast.success('Hospital updated.');
      } else {
        await dbAdd('hospitals', { ...payload, status: 'active' });
        toast.success('Hospital added.');
      }
      onSaved();
      onClose();
    } catch {
      toast.error('Could not save hospital.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={hospital ? 'Edit Hospital' : 'Add Hospital'} size="lg" footer={
      <>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>{hospital ? 'Save Changes' : 'Add Hospital'}</Button>
      </>
    }>
      <form onSubmit={handleSubmit}>
        <Field label="Hospital Name" required error={errors.name}>
          <Input value={form.name} onChange={set('name')} error={errors.name} />
        </Field>
        <Field label="Address" required error={errors.address}>
          <Textarea value={form.address} onChange={set('address')} error={errors.address} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contact" required error={errors.contact}>
            <Input value={form.contact} onChange={set('contact')} error={errors.contact} />
          </Field>
          <Field label="Emergency Contact">
            <Input value={form.emergencyContact || ''} onChange={set('emergencyContact')} />
          </Field>
        </div>
        <Field label="Emergency Department Info">
          <Input value={form.edInfo || ''} onChange={set('edInfo')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total Beds" required error={errors.totalBeds}>
            <Input type="number" min={0} value={form.totalBeds} onChange={set('totalBeds')} error={errors.totalBeds} />
          </Field>
          <Field label="ICU Beds" required error={errors.icuBeds}>
            <Input type="number" min={0} value={form.icuBeds} onChange={set('icuBeds')} error={errors.icuBeds} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
