import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../api/api';
import { Play, Check, X, Loader2, Volume2, VolumeX, Bell, Clock, IndianRupee } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: string;
  notes: string | null;
  menuItem: { name: string };
}

interface Order {
  id: string;
  customerName: string | null;
  tableNumber: string | null;
  paymentMethod?: string | null;
  status: 'PAYMENT_PENDING_VERIFICATION' | 'RECEIVED' | 'PREPARING' | 'SERVED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

interface LiveOrdersProps {
  restaurantId: string;
}

const STATUS_COLORS: Record<string, string> = {
  PAYMENT_PENDING_VERIFICATION: 'border-l-amber-400 bg-amber-50/40',
  RECEIVED: 'border-l-[var(--sage)] bg-[var(--sage-light)]/40',
  PREPARING: 'border-l-blue-400 bg-blue-50/40',
};

const STATUS_BADGE: Record<string, string> = {
  PAYMENT_PENDING_VERIFICATION: 'bg-amber-100 text-amber-800 border border-amber-200',
  RECEIVED: 'bg-[var(--sage-light)] text-[var(--sage)] border border-[var(--sage)]/20',
  PREPARING: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const STATUS_LABEL: Record<string, string> = {
  PAYMENT_PENDING_VERIFICATION: '⚡ Awaiting Payment',
  RECEIVED: '✓ Received',
  PREPARING: '👨‍🍳 Preparing',
};

export default function LiveOrders({ restaurantId }: LiveOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffCalls, setStaffCalls] = useState<{ tableNumber: string; requestType: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const playBeep = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const beep = (t: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + t);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + 0.15);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.15);
      };
      beep(0); beep(0.2);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/orders`);
        setOrders(response.data.orders);
      } catch (err) {
        setError('Failed to fetch orders.');
      } finally {
        setLoading(false);
      }
    }
    loadOrders();

    const socket = io(API_BASE_URL);
    socket.on('connect', () => { socket.emit('join_restaurant', restaurantId); });
    socket.on('new_order', (newOrder: Order) => { setOrders((p) => [newOrder, ...p]); playBeep(); });
    socket.on('order_updated', (updated: Order) => { setOrders((p) => p.map((o) => o.id === updated.id ? updated : o)); });
    socket.on('staff_call', (data: { tableNumber: string; requestType: string; timestamp: string }) => {
      setStaffCalls((p) => [data, ...p]); playBeep();
    });
    return () => { socket.disconnect(); };
  }, [restaurantId]);

  const handleUpdateStatus = async (orderId: string, nextStatus: 'RECEIVED' | 'PREPARING' | 'SERVED' | 'CANCELLED') => {
    const prev = [...orders];
    setOrders((c) => c.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o));
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: nextStatus });
    } catch {
      setOrders(prev);
      alert('Could not update order status.');
    }
  };

  const activeOrders = orders.filter((o) => ['PAYMENT_PENDING_VERIFICATION', 'RECEIVED', 'PREPARING'].includes(o.status));
  const pastOrders = orders.filter((o) => ['SERVED', 'CANCELLED'].includes(o.status));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--sage)]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-medium text-[var(--text)]">Live Kitchen</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Real-time orders from QR menus</p>
        </div>
        <button
          onClick={() => setAudioEnabled((p) => !p)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
            audioEnabled
              ? 'bg-[var(--sage-light)] border-[var(--sage)]/20 text-[var(--sage)]'
              : 'bg-white border-[var(--cream-border)] text-[var(--muted)]'
          }`}
        >
          {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          {audioEnabled ? 'Sound On' : 'Muted'}
        </button>
      </div>

      {error && <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl">{error}</div>}

      {/* Staff Call Alerts */}
      {staffCalls.length > 0 && (
        <div className="space-y-2">
          {staffCalls.slice(0, 3).map((call, idx) => (
            <div key={idx} className="bg-[var(--amber-light)] border border-[var(--amber)]/30 text-[var(--brown)] px-4 py-3 rounded-2xl flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[var(--amber)] shrink-0" />
                <span className="font-semibold">Table {call.tableNumber}:</span>
                <span>{call.requestType} requested!</span>
              </div>
              <button
                onClick={() => setStaffCalls((p) => p.filter((_, i) => i !== idx))}
                className="text-xs font-bold text-[var(--amber)] bg-[var(--amber)]/10 px-3 py-1 rounded-lg hover:bg-[var(--amber)]/20 transition-all"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Orders */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Active Orders</h3>
          <span className="bg-[var(--sage-light)] text-[var(--sage)] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[var(--sage)]/20">
            {activeOrders.length}
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-[var(--cream)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-[var(--muted)]" />
            </div>
            <p className="font-semibold text-[var(--text)]">No active orders</p>
            <p className="text-sm text-[var(--muted)] mt-1">New orders appear here in real time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const orderTotal = order.items.reduce((s, i) => s + parseFloat(i.priceAtOrder) * i.quantity, 0);
              const ageMin = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
              const isStalePending = order.status === 'PAYMENT_PENDING_VERIFICATION' && ageMin > 15;

              return (
                <div
                  key={order.id}
                  className={`bg-white border border-[var(--cream-border)] border-l-4 rounded-3xl p-5 space-y-4 shadow-sm flex flex-col ${
                    isStalePending ? 'border-l-red-500 bg-red-50/20' : STATUS_COLORS[order.status] || ''
                  }`}
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      {isStalePending ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                          ⚠️ Unconfirmed — Check Customer
                        </span>
                      ) : (
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_BADGE[order.status]}`}>
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      )}
                      <p className="text-sm font-bold text-[var(--text)]">
                        {order.customerName || 'Guest'}
                        {order.tableNumber && <span className="text-[var(--muted)] font-normal ml-1.5">· Table {order.tableNumber}</span>}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--cream)] border border-[var(--cream-border)] px-3 py-1.5 rounded-xl shrink-0">
                      <IndianRupee size={12} className="text-[var(--sage)]" />
                      <span className="font-mono font-bold text-[var(--sage)] text-sm">{orderTotal.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-[var(--cream)] rounded-2xl divide-y divide-[var(--cream-border)] overflow-hidden">
                    {order.items.map((item) => (
                      <div key={item.id} className="px-3.5 py-2.5 flex justify-between gap-3 text-sm">
                        <div>
                          <span className="font-bold text-[var(--text)]">{item.quantity}×</span>
                          <span className="ml-1.5 text-[var(--text-mid)]">{item.menuItem.name}</span>
                          {item.notes && <p className="text-xs text-[var(--muted)] italic mt-0.5">"{item.notes}"</p>}
                        </div>
                        <span className="font-mono text-xs text-[var(--muted)] shrink-0">₹{(parseFloat(item.priceAtOrder) * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {order.status === 'PAYMENT_PENDING_VERIFICATION' ? (
                      <button onClick={() => handleUpdateStatus(order.id, 'RECEIVED')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all">
                        <Check size={15} /> Mark as Paid
                      </button>
                    ) : order.status === 'RECEIVED' ? (
                      <button onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all">
                        <Play size={13} /> Start Preparing
                      </button>
                    ) : (
                      <button onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all">
                        <Check size={15} /> Complete & Serve
                      </button>
                    )}
                    <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                      title="Cancel"
                      className="p-2.5 border border-[var(--cream-border)] hover:bg-red-50 hover:border-red-200 text-[var(--muted)] hover:text-red-600 rounded-xl transition-all">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Recent Completed</h3>
          <div className="bg-white border border-[var(--cream-border)] rounded-3xl overflow-hidden divide-y divide-[var(--cream-dark)]">
            {pastOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="px-5 py-3.5 flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    order.status === 'SERVED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {order.status}
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{order.customerName || 'Guest'}</p>
                    <p className="text-xs text-[var(--muted)]">{order.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(', ')}</p>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)] font-mono shrink-0">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
