import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  Building2, Eye, QrCode, Percent, LogOut, Loader2, 
  Globe, Ban, CheckCircle 
} from 'lucide-react';

interface PlatformSummary {
  totalRestaurants: number;
  totalViews: number;
  totalScans: number;
  totalOrders: number;
}

interface PlatformRestaurant {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  isActive: boolean;
  createdAt: string;
  viewsCount: number;
  ordersCount: number;
}

interface TrafficTrend {
  date: string;
  views: number;
  scans: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [restaurants, setRestaurants] = useState<PlatformRestaurant[]>([]);
  const [trafficTrend, setTrafficTrend] = useState<TrafficTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchPlatformData = async () => {
    try {
      const response = await api.get('/api/admin/analytics/platform');
      setSummary(response.data.summary);
      setRestaurants(response.data.restaurants);
      setTrafficTrend(response.data.trafficTrend);
    } catch (err) {
      console.error('Failed to load platform data', err);
      setError('Failed to fetch platform metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/restaurants/${id}`, {
        isActive: !currentStatus,
      });
      fetchPlatformData();
    } catch (err) {
      console.error('Failed to toggle status', err);
      alert('Could not toggle restaurant subscription status.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-sm text-slate-400 font-medium">Loading platform console...</p>
      </div>
    );
  }

  const scanRate = summary && summary.totalViews > 0 
    ? parseFloat(((summary.totalScans / summary.totalViews) * 100).toFixed(1)) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              Menu<span className="text-indigo-400">QR</span> Console
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
              Super Admin Control Center • {user.name} ({user.email})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Cafes</span>
                <Building2 size={18} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{summary.totalRestaurants}</p>
              <span className="text-[10px] text-slate-500 block">Registered accounts</span>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Platform Views</span>
                <Eye size={18} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{summary.totalViews}</p>
              <span className="text-[10px] text-slate-500 block">Total traffic tracked</span>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Platform Scans</span>
                <QrCode size={18} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{summary.totalScans}</p>
              <span className="text-[10px] text-slate-500 block">QR code scans</span>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Platform Conversion</span>
                <Percent size={18} className="text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{scanRate}%</p>
              <span className="text-[10px] text-slate-500 block">QR vs organic view rate</span>
            </div>
          </div>
        )}

        {/* Platform Trend Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Platform Traffic activity</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Aggregate traffic logs over the last 30 days</p>
          </div>

          <div className="h-72 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tickFormatter={(str) => str.substring(8, 10)} />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelClassName="text-slate-400 font-bold"
                />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="views" name="Total Views" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="scans" name="QR Scans" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cafe Accounts Listing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Registered Cafes</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage and review cafe accounts</p>
          </div>

          <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/40">
            <table className="min-w-full divide-y divide-slate-850 text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left">Cafe Details</th>
                  <th className="px-6 py-4 text-left">Owner Details</th>
                  <th className="px-6 py-4 text-left">Sign Up</th>
                  <th className="px-6 py-4 text-center">Metric Logs</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-slate-900/30">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{restaurant.name}</div>
                      <a 
                        href={`/menu/${restaurant.slug}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 mt-1"
                      >
                        <Globe size={10} />
                        /menu/{restaurant.slug}
                      </a>
                    </td>
                    <td className="px-6 py-4 font-medium">{restaurant.ownerEmail}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {new Date(restaurant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <div>Views: <span className="font-bold text-white">{restaurant.viewsCount}</span></div>
                      <div className="text-slate-500 text-[10px] mt-0.5">Orders: {restaurant.ordersCount}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        restaurant.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {restaurant.isActive ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(restaurant.id, restaurant.isActive)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          restaurant.isActive
                            ? 'text-red-400 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/20'
                            : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/10 hover:border-emerald-500/20'
                        }`}
                      >
                        {restaurant.isActive ? (
                          <>
                            <Ban size={11} />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle size={11} />
                            Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
