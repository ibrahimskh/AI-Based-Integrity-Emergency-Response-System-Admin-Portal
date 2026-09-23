import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Ambulance, Siren, BarChart3, AlertOctagon, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppShell from '../shared/components/AppShell';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import { dbSubscribe } from '../shared/data/db';

const TITLES = {
  '/dashboard': 'Admin Dashboard',
  '/users': 'User Management',
  '/hospitals': 'Hospital Management',
  '/ambulances': 'Ambulance Management',
  '/emergencies': 'Emergency Management',
  '/analytics': 'Analytics',
  '/alerts': 'System Alerts',
  '/settings': 'Settings',
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const unsub = dbSubscribe('notifications', (list) => {
      setUnread(list.filter((n) => n.scope === 'admin' && !n.read).length);
    });
    return unsub;
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/users', label: 'User Management', icon: Users },
    { to: '/hospitals', label: 'Hospital Management', icon: Building2 },
    { to: '/ambulances', label: 'Ambulance Management', icon: Ambulance },
    { to: '/emergencies', label: 'Emergency Management', icon: Siren },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/alerts', label: 'System Alerts', icon: AlertOctagon, badge: unread },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    await logout();
    toast.success('You have been logged out.');
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      brandLabel="ADMIN COMMAND CENTER"
      navItems={navItems}
      user={user}
      onLogout={handleLogout}
      notifCount={unread}
      onBellClick={() => navigate('/alerts')}
      pageTitle={TITLES[location.pathname] || 'Admin Portal'}
    >
      <Outlet />
    </AppShell>
  );
}
