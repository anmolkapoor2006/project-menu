import { useState, useEffect } from 'react';
import api from '../api/api';
import { 
  ResponsiveContainer, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { QrCode, Eye, Percent, ClipboardList, Loader2, IndianRupee, TrendingUp, PackageCheck, Download } from 'lucide-react';

interface AnalyticsSummary {
  totalViews: number;
  totalScans: number;
  conversionRate: number;
  totalOrders: number;
  todayEarnings?: number;
  totalEarnings?: number;
}

interface TrendEvent {
  date: string;
  views: number;
  scans: number;
}

interface ProductEarning {
  name: string;
  qtySold: number;
  totalRevenue: number;
}

interface AnalyticsViewProps {
  restaurantId: string;
}

export default function AnalyticsView({ restaurantId }: AnalyticsViewProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [viewsTrend, setViewsTrend] = useState<TrendEvent[]>([]);
  const [productEarnings, setProductEarnings] = useState<ProductEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/analytics`);
        setSummary(response.data.summary);
        setViewsTrend(response.data.viewsTrend);
        if (response.data.productEarnings) {
          setProductEarnings(response.data.productEarnings);
        }
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

  const handleDownloadCSV = () => {
    if (!productEarnings || productEarnings.length === 0) {
      alert('No sales data available to export.');
      return;
    }

    const headers = ['Product Name', 'Quantity Sold', 'Total Revenue (INR)'];
    const rows = productEarnings.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.qtySold,
      p.totalRevenue.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const maxRevenue = Math.max(...productEarnings.map(p => p.totalRevenue), 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#1C1917]">Performance & Revenue Analytics</h2>
        <p className="text-xs text-[#7A7571] mt-1">Track visitor scans, daily earnings, and product revenue performance</p>
      </div>

      {/* Revenue Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today Earnings Highlight Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white p-6 rounded-2xl space-y-2 shadow-sm border border-emerald-700/50 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Today's Total Earnings</span>
            <p className="text-3xl font-black font-mono">₹{(summary.todayEarnings || 0).toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-emerald-200 block font-medium mt-1">Calculated from today's completed orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
            <IndianRupee size={24} className="text-emerald-300" />
          </div>
        </div>

        {/* All-time Revenue Card */}
        <div className="bg-white border border-[#EAE8E4] p-6 rounded-2xl space-y-2 shadow-[0_4px_20px_rgb(28,25,23,0.01)] flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A7571] block">All-Time Total Revenue</span>
            <p className="text-3xl font-black text-[#1C1917] font-mono">₹{(summary.totalEarnings || 0).toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-slate-400 block font-medium mt-1">Lifetime total revenue earned</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#5E6F58]/10 flex items-center justify-center shrink-0 border border-[#5E6F58]/20">
            <TrendingUp size={24} className="text-[#5E6F58]" />
          </div>
        </div>
      </div>

      {/* Secondary Metric Cards */}
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

      {/* Product Revenue Breakdown Table */}
      <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571] flex items-center gap-2">
              <PackageCheck size={16} className="text-[#5E6F58]" />
              Product Revenue Breakdown
            </h3>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Exact amount earned through each food item</p>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>

        {productEarnings.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#7A7571]">
            No sales data yet. Product earnings breakdown will populate as customers place orders.
          </div>
        ) : (
          <div className="divide-y divide-[#EAE8E4]">
            {productEarnings.map((product, idx) => {
              const pct = Math.round((product.totalRevenue / maxRevenue) * 100);
              return (
                <div key={idx} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex justify-between items-center pr-4">
                      <span className="text-xs font-bold text-[#1C1917]">{product.name}</span>
                      <span className="text-xs font-bold text-[#5E6F58] font-mono">₹{product.totalRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    {/* Visual Revenue Progress Bar */}
                    <div className="w-full bg-[#F6F4F0] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#5E6F58] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-[#7A7571] font-mono bg-[#F6F4F0] border border-[#EAE8E4] px-2.5 py-1 rounded-lg shrink-0">
                    {product.qtySold} sold
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    </div>
  );
}

