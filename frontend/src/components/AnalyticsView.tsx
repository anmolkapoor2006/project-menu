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
        <Loader2 className="animate-spin text-[#5E6F58]" size={40} />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 text-red-700 text-xs p-4 rounded-xl">
        {error || 'Failed to aggregate metrics.'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#1C1917]">Performance Analytics</h2>
        <p className="text-xs text-[#7A7571] mt-1">Track visitor scans, menu engagement, and orders over time</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
          <div className="flex justify-between items-center text-[#7A7571]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Scans</span>
            <QrCode size={18} className="text-[#5E6F58]" />
          </div>
          <p className="text-2xl font-black text-[#1C1917]">{summary.totalScans}</p>
          <span className="text-[9px] text-slate-400 block font-medium">QR code scans</span>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
          <div className="flex justify-between items-center text-[#7A7571]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Views</span>
            <Eye size={18} className="text-[#5E6F58]" />
          </div>
          <p className="text-2xl font-black text-[#1C1917]">{summary.totalViews}</p>
          <span className="text-[9px] text-slate-400 block font-medium">Scans + direct views</span>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
          <div className="flex justify-between items-center text-[#7A7571]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Scan Rate</span>
            <Percent size={18} className="text-[#5E6F58]" />
          </div>
          <p className="text-2xl font-black text-[#1C1917]">{summary.conversionRate}%</p>
          <span className="text-[9px] text-slate-400 block font-medium">QR conversion rate</span>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-[#EAE8E4] p-5 rounded-2xl space-y-3 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
          <div className="flex justify-between items-center text-[#7A7571]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Orders</span>
            <ClipboardList size={18} className="text-[#5E6F58]" />
          </div>
          <p className="text-2xl font-black text-[#1C1917]">{summary.totalOrders}</p>
          <span className="text-[9px] text-slate-400 block font-medium">Completed orders</span>
        </div>
      </div>

      {/* Traffic Trend Chart */}
      <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571]">Visitor Traffic</h3>
          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Scans and page views over the last 30 days</p>
        </div>

        <div className="h-72 w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={viewsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" />
              <XAxis dataKey="date" stroke="#7A7571" tickFormatter={(str) => str.substring(8, 10)} />
              <YAxis stroke="#7A7571" allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#EAE8E4', borderRadius: '12px' }}
                labelClassName="text-[#1C1917] font-bold"
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="views" name="Page Views" stroke="#5E6F58" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="scans" name="QR Scans" stroke="#A78B71" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Items Chart */}
      {topItems.length > 0 ? (
        <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571]">Popular Menu Items</h3>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Top 5 items by total order quantity</p>
          </div>

          <div className="h-64 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1EFEA" />
                <XAxis dataKey="name" stroke="#7A7571" />
                <YAxis stroke="#7A7571" allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#FAF9F5', opacity: 0.5 }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#EAE8E4', borderRadius: '12px' }}
                  labelClassName="text-[#1C1917] font-bold"
                />
                <Bar dataKey="value" name="Qty Sold" fill="#5E6F58" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#EAE8E4] p-6 rounded-2xl text-center text-[#7A7571] text-xs">
          Order analytics charts will populate as soon as customers place live orders.
        </div>
      )}
    </div>
  );
}
