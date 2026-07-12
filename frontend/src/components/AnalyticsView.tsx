import { useState, useEffect } from 'react';
import api from '../api/api';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { QrCode, Eye, Percent, ClipboardList, Loader2 } from 'lucide-react';

interface AnalyticsSummary {
  totalViews: number;
  totalScans: number;
  conversionRate: number;
  totalOrders: number;
}

interface TrendEvent {
  date: string;
  views: number;
  scans: number;
}

interface TopItem {
  name: string;
  value: number;
}

interface AnalyticsViewProps {
  restaurantId: string;
}

export default function AnalyticsView({ restaurantId }: AnalyticsViewProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [viewsTrend, setViewsTrend] = useState<TrendEvent[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/analytics`);
        setSummary(response.data.summary);
        setViewsTrend(response.data.viewsTrend);
        setTopItems(response.data.topItems);
      } catch (err) {
        console.error('Failed to load analytics', err);
        setError('Failed to fetch analytics.');
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) {
      loadAnalytics();
    }
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl">
        {error || 'Failed to aggregate metrics.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
        <p className="text-xs text-slate-500 mt-1">Track visitor scans, menu engagement, and orders over time</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Scans</span>
            <QrCode size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{summary.totalScans}</p>
          <span className="text-[10px] text-slate-500 block">QR code scans</span>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
            <Eye size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{summary.totalViews}</p>
          <span className="text-[10px] text-slate-500 block">Scans + direct views</span>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Scan Rate</span>
            <Percent size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{summary.conversionRate}%</p>
          <span className="text-[10px] text-slate-500 block">QR conversion vs direct</span>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <ClipboardList size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{summary.totalOrders}</p>
          <span className="text-[10px] text-slate-500 block">Completed orders</span>
        </div>
      </div>

      {/* Traffic Trend Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Visitor Traffic</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Scans and page views over the last 30 days</p>
        </div>

        <div className="h-72 w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={viewsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tickFormatter={(str) => str.substring(8, 10)} />
              <YAxis stroke="#64748b" allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                labelClassName="text-slate-400 font-bold"
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="views" name="Page Views" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="scans" name="QR Scans" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Items Chart */}
      {topItems.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Popular Menu Items</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Top 5 items by total order quantity</p>
          </div>

          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#0f172a', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelClassName="text-slate-400 font-bold"
                />
                <Bar dataKey="value" name="Qty Sold" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center text-slate-500 text-xs">
          Order analytics charts will populate as soon as customers place live orders.
        </div>
      )}
    </div>
  );
}
