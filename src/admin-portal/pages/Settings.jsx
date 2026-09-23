import { useEffect, useState } from 'react';
import { Save, User, Lock, Bell, Sliders } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import { Field, Input } from '../../shared/components/Field';
import { useAuth } from '../../shared/context/AuthContext';
import { useToast } from '../../shared/context/ToastContext';
import { dbUpdate } from '../../shared/data/db';

export default function AdminSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user.name, email: user.email, phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const [notif, setNotif] = useState({ criticalPatients: true, lowBeds: true, offlineAmbulances: true, systemErrors: true });
  const [autoAssign, setAutoAssign] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await dbUpdate('users', user.id, { name: profile.name, phone: profile.phone });
      toast.success('Profile updated.');
    } catch { toast.error('Could not save profile.'); }
    finally { setSavingProfile(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.current) errs.current = 'Enter your current password.';
    if (pw.next.length < 8) errs.next = 'New password must be at least 8 characters.';
    if (pw.confirm !== pw.next) errs.confirm = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingPw(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.success('Password updated.');
      setPw({ current: '', next: '', confirm: '' });
    } catch { toast.error('Could not update password.'); }
    finally { setSavingPw(false); }
  };

  const toggleNotif = (key) => setNotif((n) => ({ ...n, [key]: !n[key] }));

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-5"><User size={20} className="text-lifeline-red" /><h3 className="font-bold text-lg">Admin Profile</h3></div>
        <form onSubmit={saveProfile}>
          <Field label="Full Name" required>
            <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input value={profile.email} disabled />
          </Field>
          <Field label="Phone">
            <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          </Field>
          <Button type="submit" icon={Save} loading={savingProfile}>Save Profile</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-5"><Lock size={20} className="text-lifeline-red" /><h3 className="font-bold text-lg">Password</h3></div>
        <form onSubmit={savePassword}>
          <Field label="Current Password" error={pwErrors.current} required>
            <Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} error={pwErrors.current} />
          </Field>
          <Field label="New Password" error={pwErrors.next} required>
            <Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} error={pwErrors.next} />
          </Field>
          <Field label="Confirm New Password" error={pwErrors.confirm} required>
            <Input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} error={pwErrors.confirm} />
          </Field>
          <Button type="submit" variant="dark" icon={Save} loading={savingPw}>Update Password</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-5"><Bell size={20} className="text-lifeline-red" /><h3 className="font-bold text-lg">Notification Settings</h3></div>
        <div className="space-y-3">
          {Object.entries({ criticalPatients: 'Critical patient alerts', lowBeds: 'Low bed availability', offlineAmbulances: 'Offline ambulances', systemErrors: 'System errors' }).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between py-2 border-b border-lifeline-border last:border-0">
              <span className="text-sm font-medium">{label}</span>
              <input type="checkbox" checked={notif[key]} onChange={() => toggleNotif(key)} className="w-4 h-4 accent-lifeline-red" />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-5"><Sliders size={20} className="text-lifeline-red" /><h3 className="font-bold text-lg">System Settings</h3></div>
        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto-assign nearest hospital</p>
            <p className="text-xs text-lifeline-sub">Automatically route new incoming patients to the nearest available hospital.</p>
          </div>
          <input type="checkbox" checked={autoAssign} onChange={() => setAutoAssign((v) => !v)} className="w-4 h-4 accent-lifeline-red shrink-0 ml-4" />
        </label>
      </Card>
    </div>
  );
}
