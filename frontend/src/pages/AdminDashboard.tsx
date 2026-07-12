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
      <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] flex flex-col justify-center items-center">
        <Loader2 className="animate-spin text-[#5E6F58] mb-4" size={40} />
        <p className="text-sm text-slate-400 font-medium">Loading platform console...</p>
      </div>
    );
  }

  const scanRate = summary && summary.totalViews > 0 
    ? parseFloat(((summary.totalScans / summary.totalViews) * 100).toFixed(1)) 
    : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#EAE8E4] pb-6">
          <div>
            <h1 className="text-3xl font-normal text-[#1C1917] tracking-tight flex items-center gap-2.5 font-serif-display">
              Menu<span className="text-[#5E6F58] italic font-normal">QR</span> Console
            </h1>
            <p className="text-[10px] text-[#7A7571] mt-1.5 uppercase tracking-wider font-semibold">
              Super Admin Console • {user.name} ({user.email})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#EAE8E4] hover:bg-[#F6F4F0] text-[#7A7571] hover:text-[#1C1917] rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-750 text-xs p-4 rounded-xl">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
              <div className="flex justify-between items-center text-[#7A7571]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Total Cafes</span>
                <Building2 size={18} className="text-[#5E6F58]" />
              </div>
              <p className="text-2xl font-black text-[#1C1917]">{summary.totalRestaurants}</p>
              <span className="text-[9px] text-slate-400 block font-medium">Registered accounts</span>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
              <div className="flex justify-between items-center text-[#7A7571]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Platform Views</span>
                <Eye size={18} className="text-[#5E6F58]" />
              </div>
              <p className="text-2xl font-black text-[#1C1917]">{summary.totalViews}</p>
              <span className="text-[9px] text-slate-400 block font-medium">Total traffic tracked</span>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
              <div className="flex justify-between items-center text-[#7A7571]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Platform Scans</span>
                <QrCode size={18} className="text-[#5E6F58]" />
              </div>
              <p className="text-2xl font-black text-[#1C1917]">{summary.totalScans}</p>
              <span className="text-[9px] text-slate-400 block font-medium">QR code scans</span>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
              <div className="flex justify-between items-center text-[#7A7571]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Platform Conversion</span>
                <Percent size={18} className="text-[#5E6F58]" />
              </div>
              <p className="text-2xl font-black text-[#1C1917]">{scanRate}%</p>
              <span className="text-[9px] text-slate-400 block font-medium">QR conversion rate</span>
            </div>
          </div>
        )}

        {/* Platform Trend Chart */}
        <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571]">Platform Traffic activity</h3>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Aggregate traffic logs over the last 30 days</p>
          </div>

          <div className="h-72 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" />
                <XAxis dataKey="date" stroke="#7A7571" tickFormatter={(str) => str.substring(8, 10)} />
                <YAxis stroke="#7A7571" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#EAE8E4', borderRadius: '12px' }}
                  labelClassName="text-[#1C1917] font-bold"
                />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="views" name="Total Views" stroke="#5E6F58" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="scans" name="QR Scans" stroke="#A78B71" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cafe Accounts Listing */}
        <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A7571]">Registered Cafes</h3>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Manage and review cafe accounts</p>
          </div>

          <div className="overflow-x-auto border border-[#EAE8E4] rounded-xl bg-[#F6F4F0]/30">
            <table className="min-w-full divide-y divide-[#EAE8E4] text-xs">
              <thead className="bg-[#FAF9F5] text-[#7A7571] font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE8E4]">
                <tr>
                  <th className="px-6 py-4 text-left">Cafe Details</th>
                  <th className="px-6 py-4 text-left">Owner Details</th>
                  <th className="px-6 py-4 text-left">Sign Up</th>
                  <th className="px-6 py-4 text-center">Metric Logs</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8E4] text-[#1C1917]">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-[#FAF9F5]/40">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1C1917] text-sm">{restaurant.name}</div>
                      <a 
                        href={`/menu/${restaurant.slug}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-[#5E6F58] hover:text-[#4E5D49] font-mono flex items-center gap-1 mt-1 font-semibold"
                      >
                        <Globe size={10} />
                        /menu/{restaurant.slug}
                      </a>
                    </td>
                    <td className="px-6 py-4 font-semibold">{restaurant.ownerEmail}</td>
                    <td className="px-6 py-4 text-[#7A7571] font-mono">
                      {new Date(restaurant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-medium">
                      <div>Views: <span className="font-bold text-[#1C1917]">{restaurant.viewsCount}</span></div>
                      <div className="text-slate-400 text-[10px] mt-0.5">Orders: {restaurant.ordersCount}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        restaurant.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        {restaurant.isActive ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(restaurant.id, restaurant.isActive)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          restaurant.isActive
                            ? 'text-red-650 hover:bg-red-500/5 border-red-500/10 hover:border-red-500/20'
                            : 'text-[#5E6F58] hover:bg-[#5E6F58]/5 border-[#5E6F58]/10 hover:border-[#5E6F58]/20'
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
