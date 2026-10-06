import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip 
} from 'recharts';
import { 
  Building2, Eye, QrCode, Percent, LogOut, Loader2, 
  Globe, Ban, CheckCircle, IndianRupee, TrendingUp, Search, 
  Trash2, ShieldCheck, UserPlus, X, Store, Megaphone, Send,
  Lock, ArrowUpRight, RefreshCw
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
  usePageMetadata('MenuQR — Super Admin Console', 'admin');
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [restaurants, setRestaurants] = useState<PlatformRestaurant[]>([]);
  const [trafficTrend, setTrafficTrend] = useState<TrafficTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');

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

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const fetchPlatformData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const response = await api.get('/api/admin/analytics/platform');
      setSummary(response.data.summary);
      setRestaurants(response.data.restaurants || []);
      setTrafficTrend(response.data.trafficTrend || []);

      const annRes = await api.get('/api/public/announcement');
      setCurrentAnnouncement(annRes.data.announcement || null);
      setError('');
    } catch (err: any) {
      console.error('Failed to load platform data', err);
      setError('Failed to fetch platform metrics. Please check admin authorization.');
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleLogout = () => {
    // Only clear admin keys — preserve any cafe owner session that may be active
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
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
      alert('Broadcast announcement successfully deployed to all cafe dashboards!');
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
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" and all associated menus/orders? This cannot be undone.`)) {
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
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-center items-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
          <Loader2 className="animate-spin text-indigo-400" size={24} />
        </div>
        <p className="text-sm text-slate-400 font-mono">Initializing Super Admin Control Center...</p>
      </div>
    );
  }

  const scanRate = summary && summary.totalViews > 0 
    ? parseFloat(((summary.totalScans / summary.totalViews) * 100).toFixed(1)) 
    : 0;

  const filteredRestaurants = restaurants
    .filter((r) => {
      if (filterStatus === 'ACTIVE') return r.isActive;
      if (filterStatus === 'BANNED') return !r.isActive;
      return true;
    })
    .filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0E1322]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          {/* Brand & Security Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-md shadow-indigo-500/10">
                <ShieldCheck size={20} className="text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white tracking-tight">MenuQR</span>
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/30 uppercase tracking-widest font-mono">
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Control Center</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">All Services Online</span>
            </div>
          </div>

          {/* User Meta & Action Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
              <Lock size={12} className="text-indigo-400" />
              <span className="truncate max-w-[200px]">{user.email || 'Super Admin'}</span>
              <span className="bg-indigo-500/10 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">Root</span>
            </div>

            <button
              onClick={() => fetchPlatformData(true)}
              disabled={refreshing}
              title="Refresh platform data"
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              <UserPlus size={14} />
              <span>Onboard Café</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/60 text-slate-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-all"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-7">

        {/* Global Error Banner if any */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-200 text-xs p-4 rounded-2xl flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchPlatformData(true)} className="underline text-red-300 hover:text-white">Retry</button>
          </div>
        )}

        {/* Executive KPI Stats Cards */}
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Gross Platform Revenue */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0D2419] to-[#081510] border border-emerald-600/30 p-6 rounded-2xl shadow-lg shadow-emerald-950/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono block">
                      Total Platform Gross Revenue
                    </span>
                    <p className="text-3xl lg:text-4xl font-black text-white font-mono mt-2 tracking-tight">
                      ₹{(summary.totalPlatformRevenue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-emerald-300/70 mt-1 flex items-center gap-1 font-medium">
                      <span>Across all registered cafes & digital orders</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <IndianRupee size={24} className="text-emerald-300" />
                  </div>
                </div>
              </div>

              {/* Today's Platform Revenue */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#131B2E] to-[#0C1220] border border-indigo-700/40 p-6 rounded-2xl shadow-lg shadow-indigo-950/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-mono block">
                      Today's Live Gross Volume
                    </span>
                    <p className="text-3xl lg:text-4xl font-black text-white font-mono mt-2 tracking-tight">
                      ₹{(summary.todayPlatformRevenue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-indigo-300/70 mt-1 flex items-center gap-1 font-medium">
                      <TrendingUp size={12} className="text-indigo-400" />
                      <span>Today's aggregate customer checkouts</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                    <TrendingUp size={24} className="text-indigo-300" />
                  </div>
                </div>
              </div>

              {/* Average Order Value (AOV) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#241A10] to-[#140E08] border border-amber-600/30 p-6 rounded-2xl shadow-lg shadow-amber-950/40">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
                      Average Order Value (AOV)
                    </span>
                    <p className="text-3xl lg:text-4xl font-black text-white font-mono mt-2 tracking-tight">
                      ₹{(summary.averageOrderValue || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-amber-300/70 mt-1 font-medium">
                      <span>{summary.totalOrders || 0} total fulfilled orders platform-wide</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Store size={24} className="text-amber-300" />
                  </div>
                </div>
              </div>

            </div>

            {/* Secondary Operational Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Total Cafes</span>
                  <Building2 size={16} className="text-indigo-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono">{summary.totalRestaurants}</p>
                <span className="text-[10px] text-slate-500 block font-medium">Registered tenants</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Platform Views</span>
                  <Eye size={16} className="text-indigo-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono">{summary.totalViews.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-slate-500 block font-medium">Digital menu impressions</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">QR Code Scans</span>
                  <QrCode size={16} className="text-indigo-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono">{summary.totalScans.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-slate-500 block font-medium">Physical table scans</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Scan Conversion</span>
                  <Percent size={16} className="text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white font-mono">{scanRate}%</p>
                <span className="text-[10px] text-slate-500 block font-medium">Scan to pageview efficiency</span>
              </div>

            </div>
          </div>
        )}

        {/* Global Broadcast Announcement Station */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Megaphone size={16} className="text-indigo-400" />
                Global Platform Broadcast System
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Broadcast real-time maintenance or system alerts to all café owner dashboards instantly.
              </p>
            </div>

            {currentAnnouncement && (
              <button
                onClick={handleClearBroadcast}
                className="text-xs text-red-400 hover:text-red-300 font-semibold underline transition-colors"
              >
                Deactivate Current Banner
              </button>
            )}
          </div>

          {currentAnnouncement && (
            <div className="bg-amber-950/50 border border-amber-700/50 text-amber-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold uppercase tracking-wider text-[9px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 text-amber-300">
                  Live Banner Active
                </span>
                <span>{currentAnnouncement.message}</span>
              </div>
            </div>
          )}

          <form onSubmit={handlePostBroadcast} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. UPI gateway update scheduled tonight at 2:00 AM. No downtime expected..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={postingBroadcast || !announcementText.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 shadow-md shadow-indigo-600/20"
            >
              {postingBroadcast ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Deploy Broadcast</span>
            </button>
          </form>
        </div>

        {/* Platform 30-Day Activity Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Platform Traffic & Scan Telemetry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Aggregated 30-day views vs physical QR scans across all active menus</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Total Views
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> QR Scans
              </span>
            </div>
          </div>

          <div className="h-72 w-full text-xs font-mono pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#64748B" tickFormatter={(str) => str.substring(8, 10)} />
                <YAxis stroke="#64748B" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  labelClassName="text-slate-300 font-bold"
                />
                <Line type="monotone" dataKey="views" name="Views" stroke="#6366F1" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="scans" name="QR Scans" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Registered Cafes Management Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Registered Café Accounts
                </h3>
                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                  {filteredRestaurants.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit tenants, inspect digital menu links, toggle account statuses, or terminate accounts.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              {/* Status Filter Buttons */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    filterStatus === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({restaurants.length})
                </button>
                <button
                  onClick={() => setFilterStatus('ACTIVE')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    filterStatus === 'ACTIVE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({restaurants.filter(r => r.isActive).length})
                </button>
                <button
                  onClick={() => setFilterStatus('BANNED')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    filterStatus === 'BANNED' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Suspended ({restaurants.filter(r => !r.isActive).length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search cafe name, email, slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 text-left">Café Identity</th>
                  <th className="px-5 py-3.5 text-left">Owner Contact</th>
                  <th className="px-5 py-3.5 text-left">Onboard Date</th>
                  <th className="px-5 py-3.5 text-center">Traffic & Orders</th>
                  <th className="px-5 py-3.5 text-center">Gross Revenue</th>
                  <th className="px-5 py-3.5 text-center">Account Status</th>
                  <th className="px-5 py-3.5 text-center">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-xs">
                      No café accounts match the current filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{restaurant.name}</div>
                        <a 
                          href={`/menu/${restaurant.slug}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 mt-1 font-medium"
                        >
                          <Globe size={11} />
                          <span>/menu/{restaurant.slug}</span>
                          <ArrowUpRight size={10} />
                        </a>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-300 font-mono">
                        {restaurant.ownerEmail}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono">
                        {new Date(restaurant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-center font-mono">
                        <div>Views: <span className="font-bold text-white">{restaurant.viewsCount}</span></div>
                        <div className="text-slate-400 text-[10px] mt-0.5">Orders: {restaurant.ordersCount}</div>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-emerald-400">
                        ₹{(restaurant.revenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-mono ${
                          restaurant.isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/50'
                            : 'bg-red-950/60 text-red-400 border border-red-800/50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${restaurant.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {restaurant.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleActive(restaurant.id, restaurant.isActive)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              restaurant.isActive
                                ? 'bg-slate-900 text-amber-400 hover:bg-amber-950/30 border-amber-800/40'
                                : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950/30 border-emerald-800/40'
                            }`}
                            title={restaurant.isActive ? 'Suspend Cafe' : 'Reactivate Cafe'}
                          >
                            {restaurant.isActive ? (
                              <>
                                <Ban size={12} />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={12} />
                                <span>Activate</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-red-800/60 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                            title="Delete Cafe Account"
                          >
                            <Trash2 size={14} />
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

      </main>

      {/* Onboard New Cafe Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0E1322] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Onboard New Café Account</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Create and provision a new cafe tenant on MenuQR</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="bg-red-950/40 border border-red-800/60 text-red-200 text-xs p-3 rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCafe} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold font-mono uppercase text-[10px]">Owner Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anmol Kapoor"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold font-mono uppercase text-[10px]">Owner Login Email</label>
                <input
                  type="email"
                  required
                  placeholder="owner@mycafe.com"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold font-mono uppercase text-[10px]">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newOwnerPassword}
                  onChange={(e) => setNewOwnerPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold font-mono uppercase text-[10px]">Café / Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Roastery Coffee House"
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
