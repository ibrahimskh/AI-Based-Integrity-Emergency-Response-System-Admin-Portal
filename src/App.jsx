import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { ToastProvider } from './shared/context/ToastContext';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { seedIfEmpty } from './shared/data/db';

import AdminLogin from './admin-portal/pages/Login';
import AdminLayout from './admin-portal/AdminLayout';
import AdminDashboard from './admin-portal/pages/Dashboard';
import UserManagement from './admin-portal/pages/UserManagement';
import HospitalManagement from './admin-portal/pages/HospitalManagement';
import AmbulanceManagement from './admin-portal/pages/AmbulanceManagement';
import EmergencyManagement from './admin-portal/pages/EmergencyManagement';
import Analytics from './admin-portal/pages/Analytics';
import SystemAlerts from './admin-portal/pages/SystemAlerts';
import AdminSettings from './admin-portal/pages/Settings';

export default function App() {
  useEffect(() => { seedIfEmpty(); }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />

            <Route path="/" element={
              <ProtectedRoute role="admin" loginPath="/login">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="hospitals" element={<HospitalManagement />} />
              <Route path="ambulances" element={<AmbulanceManagement />} />
              <Route path="emergencies" element={<EmergencyManagement />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="alerts" element={<SystemAlerts />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
