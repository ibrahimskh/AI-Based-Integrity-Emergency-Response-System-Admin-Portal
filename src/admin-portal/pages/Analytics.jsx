import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import Card from '../../shared/components/Card';
import { Spinner, ErrorState } from '../../shared/components/States';
import { dbGetAll } from '../../shared/data/db';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

const SEVERITY_COLORS = { critical: '#dc2626', high: '#f59e0b', moderate: '#3b82f6', low: '#64748b' };
const AMB_COLORS = { available: '#10b981', assigned: '#3b82f6', en_route: '#f59e0b', at_hospital: '#8b5cf6', returning: '#94a3b8', offline: '#475569' };

export default function Analytics() {
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);

  const load = async () => {
    setStatus('loading');
    try {
      const [hospitals, patients, ambulances, emergencies] = await Promise.all([
        dbGetAll('hospitals'), dbGetAll('patients'), dbGetAll('ambulances'), dbGetAll('emergencies'),
      ]);
      setData({ hospitals, patients, ambulances, emergencies });
      setStatus('ready');
    } catch { setStatus('error'); }
  };

  useEffect(() => { load(); }, []);

  if (status === 'loading') return <Spinner label="Crunching analytics…" />;
  if (status === 'error') return <ErrorState onRetry={load} />;

  const { hospitals, patients, ambulances, emergencies } = data;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const casesOverTime = {
    labels: last7.map((d) => d.toLocaleDateString(undefined, { weekday: 'short' })),
    datasets: [{
      label: 'Emergency Cases',
      data: last7.map((d) => emergencies.filter((e) => new Date(e.createdAt).toDateString() === d.toDateString()).length),
      borderColor: '#d92d3c', backgroundColor: 'rgba(217,45,60,0.1)', fill: true, tension: 0.35,
    }],
  };

  const bedUtilization = {
    labels: hospitals.map((h) => h.name.split(' ').slice(0, 2).join(' ')),
    datasets: [{ label: 'Occupancy %', data: hospitals.map((h) => Math.round(((h.totalBeds - h.availableBeds) / h.totalBeds) * 100)), backgroundColor: '#d92d3c', borderRadius: 6 }],
  };

  const icuUtilization = {
    labels: hospitals.map((h) => h.name.split(' ').slice(0, 2).join(' ')),
    datasets: [{ label: 'ICU Occupancy %', data: hospitals.map((h) => Math.round(((h.icuBeds - h.availableIcuBeds) / h.icuBeds) * 100)), backgroundColor: '#8b5cf6', borderRadius: 6 }],
  };

  const severityCounts = patients.reduce((acc, p) => { acc[p.severity] = (acc[p.severity] || 0) + 1; return acc; }, {});
  const severityChart = {
    labels: Object.keys(severityCounts).map((s) => s[0].toUpperCase() + s.slice(1)),
    datasets: [{ data: Object.values(severityCounts), backgroundColor: Object.keys(severityCounts).map((s) => SEVERITY_COLORS[s]) }],
  };

  const ambStatusCounts = ambulances.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const ambChart = {
    labels: Object.keys(ambStatusCounts).map((s) => s.replace(/_/g, ' ')),
    datasets: [{ data: Object.values(ambStatusCounts), backgroundColor: Object.keys(ambStatusCounts).map((s) => AMB_COLORS[s]) }],
  };

  const workload = {
    labels: hospitals.map((h) => h.name.split(' ').slice(0, 2).join(' ')),
    datasets: [{ label: 'Assigned Patients', data: hospitals.map((h) => patients.filter((p) => p.assignedHospitalId === h.id).length), backgroundColor: '#3b82f6', borderRadius: 6 }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold mb-4">Emergency Cases — Last 7 Days</h3>
          <div className="h-56"><Line data={casesOverTime} options={chartOpts} /></div>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Hospital Workload</h3>
          <div className="h-56"><Bar data={workload} options={chartOpts} /></div>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Bed Utilization</h3>
          <div className="h-56"><Bar data={bedUtilization} options={{ ...chartOpts, scales: { y: { max: 100 } } }} /></div>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">ICU Utilization</h3>
          <div className="h-56"><Bar data={icuUtilization} options={{ ...chartOpts, scales: { y: { max: 100 } } }} /></div>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Patient Severity Distribution</h3>
          <div className="h-56"><Doughnut data={severityChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} /></div>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Ambulance Usage</h3>
          <div className="h-56"><Doughnut data={ambChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} /></div>
        </Card>
      </div>
    </div>
  );
}
