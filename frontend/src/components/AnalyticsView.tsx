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

interface TrendEvent { date: string; views: number; scans: number; }
interface ProductEarning { name: string; qtySold: number; totalRevenue: number; }
interface AnalyticsViewProps { restaurantId: string; }

export default function AnalyticsView({ restaurantId }: AnalyticsViewProps) {
  const cached = (() => {
    try {
      const data = sessionStorage.getItem(`analytics_${restaurantId}`);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  })();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(cached?.summary || null);
  const [viewsTrend, setViewsTrend] = useState<TrendEvent[]>(cached?.viewsTrend || []);
  const [productEarnings, setProductEarnings] = useState<ProductEarning[]>(cached?.productEarnings || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/analytics`);
        setSummary(response.data.summary);
        setViewsTrend(response.data.viewsTrend);
        if (response.data.productEarnings) setProductEarnings(response.data.productEarnings);
        sessionStorage.setItem(`analytics_${restaurantId}`, JSON.stringify({
          summary: response.data.summary,
          viewsTrend: response.data.viewsTrend,
          productEarnings: response.data.productEarnings || [],
        }));
      } catch (err) {
        if (!summary) setError('Failed to fetch analytics.');
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) loadAnalytics();
  }, [restaurantId]);

  const handleDownloadCSV = () => {
    if (!productEarnings.length) { alert('No sales data available to export.'); return; }
    const headers = ['Product Name', 'Quantity Sold', 'Total Revenue (INR)'];
    const rows = productEarnings.map((p) => [`"${p.name.replace(/"/g, '""')}"`, p.qtySold, p.totalRevenue.toFixed(2)]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-[var(--sage)]" size={36} /></div>;
  }
  if (error || !summary) {
    return <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl">{error || 'Failed to load analytics.'}</div>;
  }

  const maxRevenue = Math.max(...productEarnings.map((p) => p.totalRevenue), 1);

  const metricCards = [
    { label: 'Total Scans', value: summary.totalScans, sub: 'QR code scans', Icon: QrCode },
    { label: 'Total Views', value: summary.totalViews, sub: 'Direct + scan views', Icon: Eye },
    { label: 'Conversion', value: `${summary.conversionRate}%`, sub: 'Scan-to-order rate', Icon: Percent },
    { label: 'Total Orders', value: summary.totalOrders, sub: 'All time orders', Icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-medium text-[var(--text)]">Analytics & Revenue</h2>
        <p className="text-sm text-[var(--muted)] mt-0.5">Track scans, earnings, and menu performance</p>
      </div>

      {/* Revenue hero cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--sage)] text-white p-6 rounded-3xl flex items-center justify-between shadow-lg shadow-[var(--sage)]/20">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Today's Earnings</p>
            <p className="font-mono font-black text-4xl mt-1">₹{(summary.todayEarnings || 0).toLocaleString('en-IN')}</p>
            <p className="text-white/50 text-xs mt-1">From today's completed orders</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <IndianRupee size={26} className="text-white/70" />
          </div>
        </div>

        <div className="bg-white border border-[var(--cream-border)] p-6 rounded-3xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[var(--muted)] text-xs uppercase tracking-wider font-semibold">All-Time Revenue</p>
            <p className="font-mono font-black text-4xl mt-1 text-[var(--text)]">₹{(summary.totalEarnings || 0).toLocaleString('en-IN')}</p>
            <p className="text-[var(--muted)] text-xs mt-1">Lifetime total earned</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[var(--sage-light)] border border-[var(--sage)]/20 flex items-center justify-center shrink-0">
            <TrendingUp size={26} className="text-[var(--sage)]" />
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map(({ label, value, sub, Icon }) => (
          <div key={label} className="bg-white border border-[var(--cream-border)] p-5 rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider">{label}</p>
              <div className="w-8 h-8 rounded-xl bg-[var(--sage-light)] flex items-center justify-center">
                <Icon size={15} className="text-[var(--sage)]" />
              </div>
            </div>
            <p className="text-2xl font-black text-[var(--text)]">{value}</p>
            <p className="text-xs text-[var(--muted)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Product Revenue Table */}
      <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
              <PackageCheck size={17} className="text-[var(--sage)]" /> Product Revenue
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">Revenue earned per menu item</p>
          </div>
          <button onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-xs font-semibold transition-all shadow-sm">
            <Download size={13} /> Export CSV
          </button>
        </div>

        {productEarnings.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--muted)]">
            No sales data yet. Earnings will appear as customers place orders.
          </div>
        ) : (
          <div className="divide-y divide-[var(--cream-dark)]">
            {productEarnings.map((product, idx) => {
              const pct = Math.round((product.totalRevenue / maxRevenue) * 100);
              return (
                <div key={idx} className="py-3.5 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-[var(--text)]">{product.name}</span>
                      <span className="font-mono text-sm font-bold text-[var(--sage)]">₹{product.totalRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-[var(--cream-dark)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--sage)] h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted)] font-mono bg-[var(--cream)] border border-[var(--cream-border)] px-2.5 py-1 rounded-lg shrink-0">
                    {product.qtySold} sold
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Traffic Chart */}
      <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-[var(--text)]">Visitor Traffic</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">Scans & views over the last 30 days</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={viewsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DC" />
              <XAxis dataKey="date" stroke="#8A7968" tickFormatter={(s) => s.substring(8, 10)} tick={{ fontSize: 11 }} />
              <YAxis stroke="#8A7968" allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#DDD8CC', borderRadius: '12px', fontSize: '12px' }} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="views" name="Page Views" stroke="#3D5A47" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="scans" name="QR Scans" stroke="#C17D3C" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
