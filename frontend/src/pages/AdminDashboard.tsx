import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
  Building2, Eye, QrCode, Percent, LogOut, Loader2, 
  Globe, Ban, CheckCircle, IndianRupee, TrendingUp, Search, 
  Trash2, ShieldCheck, UserPlus, X, Store, Megaphone, Send
} from 'lucide-react';
import { usePageMetadata } from '../utils/usePageMetadata';

interface PlatformSummary {
  totalRestaurants: number;
  totalViews: number;
  totalScans: number;
  totalOrders: number;
  totalPlatformRevenue?: number;
  todayPlatformRevenue?: number;
  averageOrderValue?: number;
}

interface PlatformRestaurant {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName?: string;
  isActive: boolean;
  isAcceptingOrders?: boolean;
  createdAt: string;
  viewsCount: number;
  ordersCount: number;
  revenue?: number;
}

interface TrafficTrend {
  date: string;
  views: number;
  scans: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  usePageMetadata('Super Admin Console | Platform Analytics', 'admin');
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [restaurants, setRestaurants] = useState<PlatformRestaurant[]>([]);
  const [trafficTrend, setTrafficTrend] = useState<TrafficTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Announcement Broadcast State
  const [announcementText, setAnnouncementText] = useState('');
  const [currentAnnouncement, setCurrentAnnouncement] = useState<any>(null);
  const [postingBroadcast, setPostingBroadcast] = useState(false);

  // Modal State for Onboarding New Cafe
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newRestName, setNewRestName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchPlatformData = async () => {
    try {
      const response = await api.get('/api/admin/analytics/platform');
      setSummary(response.data.summary);
      setRestaurants(response.data.restaurants);
      setTrafficTrend(response.data.trafficTrend);

      const annRes = await api.get('/api/public/announcement');
      setCurrentAnnouncement(annRes.data.announcement || null);
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

  const handlePostBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setPostingBroadcast(true);

    try {
      const res = await api.post('/api/admin/announcements', {
        message: announcementText,
        type: 'INFO',
      });
      setCurrentAnnouncement(res.data.announcement);
      setAnnouncementText('');
      alert('Broadcast announcement published to all cafe dashboards!');
    } catch (err: any) {
      console.error('Failed to publish broadcast', err);
      alert(err.response?.data?.error || 'Could not publish announcement.');
    } finally {
      setPostingBroadcast(false);
    }
  };

  const handleClearBroadcast = async () => {
    if (!currentAnnouncement) return;
    try {
      await api.delete(`/api/admin/announcements/${currentAnnouncement.id}`);
      setCurrentAnnouncement(null);
      alert('Broadcast announcement cleared.');
    } catch (err) {
      console.error('Failed to clear announcement', err);
      alert('Could not clear announcement.');
    }
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

  const handleDeleteRestaurant = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/restaurants/${id}`);
      fetchPlatformData();
    } catch (err) {
      console.error('Failed to delete restaurant', err);
      alert('Could not delete restaurant account.');
    }
  };

  const handleCreateCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      await api.post('/api/auth/register', {
        name: newOwnerName,
        email: newOwnerEmail,
        password: newOwnerPassword,
        restaurantName: newRestName,
      });

      setShowCreateModal(false);
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPassword('');
      setNewRestName('');
      fetchPlatformData();
    } catch (err: any) {
      console.error('Failed to onboard cafe', err);
      setCreateError(err.response?.data?.error || 'Failed to onboard cafe.');
    } finally {
      setCreating(false);
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

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#EAE8E4] pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-normal text-[#1C1917] tracking-tight font-serif-display">
                Menu<span className="text-[#5E6F58] italic font-normal">QR</span> Console
              </h1>
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} />
                Systems Operational
              </span>
            </div>
            <p className="text-[10px] text-[#7A7571] mt-1.5 uppercase tracking-wider font-semibold">
              Super Admin Control Center • Logged in as {user.name} ({user.email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <UserPlus size={14} />
              Onboard New Cafe
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#EAE8E4] hover:bg-[#F6F4F0] text-[#7A7571] hover:text-[#1C1917] rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-750 text-xs p-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Platform Revenue Highlights */}
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white p-6 rounded-2xl space-y-2 shadow-sm border border-emerald-700/50 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Total Gross Platform Revenue</span>
                  <p className="text-3xl font-black font-mono">₹{(summary.totalPlatformRevenue || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-emerald-200 block font-medium mt-1">Sum of completed orders across all cafes</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <IndianRupee size={24} className="text-emerald-300" />
                </div>
              </div>

              <div className="bg-white border border-[#EAE8E4] p-6 rounded-2xl space-y-2 shadow-[0_4px_20px_rgb(28,25,23,0.01)] flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7571] block">Today's Platform Revenue</span>
                  <p className="text-3xl font-black text-[#1C1917] font-mono">₹{(summary.todayPlatformRevenue || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-slate-400 block font-medium mt-1">Gross earnings today</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#5E6F58]/10 flex items-center justify-center shrink-0 border border-[#5E6F58]/20">
                  <TrendingUp size={24} className="text-[#5E6F58]" />
                </div>
              </div>

              <div className="bg-white border border-[#EAE8E4] p-6 rounded-2xl space-y-2 shadow-[0_4px_20px_rgb(28,25,23,0.01)] flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7571] block">Average Order Value (AOV)</span>
                  <p className="text-3xl font-black text-[#1C1917] font-mono">₹{(summary.averageOrderValue || 0).toLocaleString('en-IN')}</p>
                  <span className="text-[10px] text-slate-400 block font-medium mt-1">Average transaction size</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Store size={24} className="text-amber-600" />
                </div>
              </div>
            </div>

            {/* Secondary Platform Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
                <div className="flex justify-between items-center text-[#7A7571]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Total Cafes</span>
                  <Building2 size={18} className="text-[#5E6F58]" />
                </div>
                <p className="text-2xl font-black text-[#1C1917]">{summary.totalRestaurants}</p>
                <span className="text-[9px] text-slate-400 block font-medium">Active accounts</span>
              </div>

              <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
                <div className="flex justify-between items-center text-[#7A7571]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Platform Views</span>
                  <Eye size={18} className="text-[#5E6F58]" />
                </div>
                <p className="text-2xl font-black text-[#1C1917]">{summary.totalViews}</p>
                <span className="text-[9px] text-slate-400 block font-medium">Total traffic tracked</span>
              </div>

              <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
                <div className="flex justify-between items-center text-[#7A7571]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Platform Scans</span>
                  <QrCode size={18} className="text-[#5E6F58]" />
                </div>
                <p className="text-2xl font-black text-[#1C1917]">{summary.totalScans}</p>
                <span className="text-[9px] text-slate-400 block font-medium">QR code scans</span>
              </div>

              <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
                <div className="flex justify-between items-center text-[#7A7571]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Platform Conversion</span>
                  <Percent size={18} className="text-[#5E6F58]" />
                </div>
                <p className="text-2xl font-black text-[#1C1917]">{scanRate}%</p>
                <span className="text-[9px] text-slate-400 block font-medium">QR conversion rate</span>
              </div>
            </div>
          </div>
        )}

        {/* Global Announcement Broadcast Manager */}
        <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571] flex items-center gap-2">
                <Megaphone size={16} className="text-[#5E6F58]" />
                Platform Broadcast Announcement
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Broadcast alert banners to all cafe owner dashboards</p>
            </div>

            {currentAnnouncement && (
              <button
                onClick={handleClearBroadcast}
                className="text-[10px] text-red-600 hover:text-red-800 font-bold underline"
              >
                Clear Broadcast Banner
              </button>
            )}
          </div>

          {currentAnnouncement && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
              <div>
                <span className="font-bold uppercase tracking-wider text-[9px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-800 mr-2">Active Banner</span>
                {currentAnnouncement.message}
              </div>
            </div>
          )}

          <form onSubmit={handlePostBroadcast} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Scheduled system maintenance tonight at 2:00 AM IST..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
            />
            <button
              type="submit"
              disabled={postingBroadcast || !announcementText.trim()}
              className="px-5 py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {postingBroadcast ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Broadcast Banner
            </button>
          </form>
        </div>

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#7A7571]">Registered Cafe Accounts</h3>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Manage, review, or suspend registered cafes</p>
            </div>

            {/* Search Filter Bar */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-[#7A7571]" />
              <input
                type="text"
                placeholder="Search cafe name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-[#EAE8E4] rounded-xl bg-[#F6F4F0]/30">
            <table className="min-w-full divide-y divide-[#EAE8E4] text-xs">
              <thead className="bg-[#FAF9F5] text-[#7A7571] font-bold uppercase tracking-wider text-[10px] border-b border-[#EAE8E4]">
                <tr>
                  <th className="px-6 py-4 text-left">Cafe Details</th>
                  <th className="px-6 py-4 text-left">Owner Email</th>
                  <th className="px-6 py-4 text-left">Sign Up</th>
                  <th className="px-6 py-4 text-center">Metric Logs</th>
                  <th className="px-6 py-4 text-center">Total Revenue</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE8E4] text-[#1C1917]">
                {filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[#7A7571] text-xs">
                      No cafes found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((restaurant) => (
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
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-700">
                        ₹{(restaurant.revenue || 0).toLocaleString('en-IN')}
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleActive(restaurant.id, restaurant.isActive)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              restaurant.isActive
                                ? 'text-red-650 hover:bg-red-500/5 border-red-500/10 hover:border-red-500/20'
                                : 'text-[#5E6F58] hover:bg-[#5E6F58]/5 border-[#5E6F58]/10 hover:border-[#5E6F58]/20'
                            }`}
                            title={restaurant.isActive ? 'Deactivate Cafe' : 'Activate Cafe'}
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

                          <button
                            onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                            className="p-1.5 border border-red-500/20 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Cafe Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Onboard New Cafe Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#EAE8E4] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#EAE8E4] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1C1917]">Onboard New Cafe</h3>
                <p className="text-xs text-[#7A7571]">Provision a new cafe owner account directly</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#7A7571] hover:text-[#1C1917] p-1 rounded-lg hover:bg-[#F6F4F0]"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-700 text-xs p-3 rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCafe} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#7A7571] font-semibold mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anmol Kapoor"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
                />
              </div>

              <div>
                <label className="block text-[#7A7571] font-semibold mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  placeholder="owner@cafe.com"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
                />
              </div>

              <div>
                <label className="block text-[#7A7571] font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newOwnerPassword}
                  onChange={(e) => setNewOwnerPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
                />
              </div>

              <div>
                <label className="block text-[#7A7571] font-semibold mb-1">Cafe / Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chai Suta Bar"
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-[#EAE8E4] text-[#7A7571] hover:bg-[#F6F4F0] rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  Create Cafe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

