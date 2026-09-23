import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Ambulance, Siren, BedDouble, HeartPulse, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Card from '../../shared/components/Card';
import StatCard from '../../shared/components/StatCard';
import { Spinner, ErrorState } from '../../shared/components/States';
import { dbGetAll, dbSubscribe } from '../../shared/data/db';
import LiveOperationsMap from '../components/LiveOperationsMap';
import ActiveDispatches from '../components/ActiveDispatches';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);

  // Live-subscribed feeds power the map + dispatch panel so they reflect
  // changes made anywhere else in the app (Ambulance Management, etc.)
  // in real time, without a page refresh.
  const [liveAmbulances, setLiveAmbulances] = useState([]);
  const [liveHospitals, setLiveHospitals] = useState([]);
  const [liveEmergencies, setLiveEmergencies] = useState([]);

  const load = async () => {
    setStatus('loading');
    try {
      const [users, hospitals, ambulances, emergencies] = await Promise.all([
        dbGetAll('users'), dbGetAll('hospitals'), dbGetAll('ambulances'), dbGetAll('emergencies'),
      ]);
      setData({ users, hospitals, ambulances, emergencies });
      setStatus('ready');
    } catch { setStatus('error'); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const u1 = dbSubscribe('ambulances', setLiveAmbulances);
    const u2 = dbSubscribe('hospitals', setLiveHospitals);
    const u3 = dbSubscribe('emergencies', setLiveEmergencies);
    return () => { u1(); u2(); u3(); };
  }, []);

  if (status === 'loading') return <Spinner label="Loading admin dashboard…" />;
  if (status === 'error') return <ErrorState onRetry={load} />;

  const { users, hospitals, ambulances, emergencies } = data;
  const activeEmergencies = emergencies.filter((e) => e.status === 'in_progress');
  const completedEmergencies = emergencies.filter((e) => e.status === 'resolved');
  const totalBeds = hospitals.reduce((s, h) => s + h.availableBeds, 0);
  const totalIcu = hospitals.reduce((s, h) => s + h.availableIcuBeds, 0);
  const lowBedHospitals = hospitals.filter((h) => h.availableBeds < h.totalBeds * 0.15);
  const offlineAmbulances = ambulances.filter((a) => a.status === 'offline');
  const alertCount = lowBedHospitals.length + offlineAmbulances.length;

  const bedChart = {
    labels: hospitals.map((h) => h.name.split(' ').slice(0, 2).join(' ')),
    datasets: [
      { label: 'Available Beds', data: hospitals.map((h) => h.availableBeds), backgroundColor: '#d92d3c', borderRadius: 6 },
      { label: 'Total Beds', data: hospitals.map((h) => h.totalBeds), backgroundColor: '#e6e7ee', borderRadius: 6 },
    ],
  };

  const userTypeCounts = users.reduce((acc, u) => { acc[u.userType] = (acc[u.userType] || 0) + 1; return acc; }, {});
  const userChart = {
    labels: Object.keys(userTypeCounts),
    datasets: [{ data: Object.values(userTypeCounts), backgroundColor: ['#d92d3c', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'] }],
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
        <span className="demo-badge">DEMO DATA</span> — connect Firebase for live platform data.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={users.length} tone="blue" />
        <StatCard icon={Building2} label="Total Hospitals" value={hospitals.length} tone="blue" />
        <StatCard icon={Ambulance} label="Total Ambulances" value={ambulances.length} tone="amber" />
        <StatCard icon={Siren} label="Active Emergencies" value={activeEmergencies.length} alert={activeEmergencies.length > 0} />
        <StatCard icon={BedDouble} label="Available Beds" value={totalBeds} tone="emerald" />
        <StatCard icon={HeartPulse} label="ICU Availability" value={totalIcu} tone="red" />
        <StatCard icon={CheckCircle2} label="Completed Emergencies" value={completedEmergencies.length} tone="emerald" />
        <StatCard icon={AlertOctagon} label="System Alerts" value={alertCount} alert={alertCount > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-2">
          <h3 className="font-bold px-1">Live Operations Map</h3>
          <LiveOperationsMap ambulances={liveAmbulances.length ? liveAmbulances : ambulances} hospitals={liveHospitals.length ? liveHospitals : hospitals} />
        </div>
        <ActiveDispatches
          emergencies={liveEmergencies.length ? liveEmergencies : emergencies}
          onManage={(e) => navigate('/emergencies')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-bold mb-4">Bed Utilization by Hospital</h3>
          <div className="h-64"><Bar data={bedChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Users by Type</h3>
          <div className="h-64"><Doughnut data={userChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} /></div>
        </Card>
      </div>
    </div>
  );
}
