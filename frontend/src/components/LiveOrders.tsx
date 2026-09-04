import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';
import { getSocket, joinRestaurantRoom } from '../utils/socket';
import { Play, Check, X, Bell, Clock, IndianRupee, RefreshCw, Radio } from 'lucide-react';
import { unlockAudioContext } from '../utils/audio';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: string;
  notes: string | null;
  menuItem: { name: string; imageUrl?: string | null };
}

interface Order {
  id: string;
  restaurantId?: string;
  customerName: string | null;
  tableNumber: string | null;
  paymentMethod?: string | null;
  status: 'PAYMENT_PENDING_VERIFICATION' | 'RECEIVED' | 'PREPARING' | 'SERVED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

interface LiveOrdersProps {
  restaurantId: string;
  audioArmed: boolean; // passed from Dashboard so we share the same armed state
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

const PAST_STATUS_LABEL: Record<string, string> = {
  SERVED: 'Served',
  CANCELLED: 'Cancelled',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-[var(--cream-dark)] rounded-full" />
          <div className="h-4 w-32 bg-[var(--cream-dark)] rounded-full" />
          <div className="h-3 w-16 bg-[var(--cream-dark)] rounded-full" />
        </div>
        <div className="h-8 w-16 bg-[var(--cream-dark)] rounded-xl" />
      </div>
      <div className="bg-[var(--cream)] rounded-2xl p-3 space-y-2">
        <div className="h-3 w-full bg-[var(--cream-dark)] rounded-full" />
        <div className="h-3 w-3/4 bg-[var(--cream-dark)] rounded-full" />
      </div>
      <div className="h-9 w-full bg-[var(--cream-dark)] rounded-xl" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiveOrders({ restaurantId, audioArmed }: LiveOrdersProps) {
  const cached = (() => {
    try {
      const data = sessionStorage.getItem(`orders_${restaurantId}`);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  })();

  const [orders, setOrders] = useState<Order[]>(cached || []);
  const [staffCalls, setStaffCalls] = useState<{ tableNumber: string; requestType: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(!cached);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  // Keep a ref so async socket/polling callbacks always see the latest state without stale closures
  const audioArmedRef = useRef(audioArmed);
  useEffect(() => { audioArmedRef.current = audioArmed; }, [audioArmed]);

  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // ── New order sound notification ──────────────
  const playNewOrderBeep = useCallback(() => {
    if (!audioArmedRef.current) return;
    try {
      unlockAudioContext();
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const beep = (t: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 659.25;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      };
      beep(0); beep(0.22);
    } catch (e) { console.warn('playNewOrderBeep', e); }
  }, []);

  // ── Silent background orders sync ──────────────
  const syncOrdersSilently = useCallback(async (manual = false) => {
    if (!restaurantId) return;
    if (manual) setIsSyncing(true);
    try {
      const response = await api.get(`/api/restaurants/${restaurantId}/orders`);
      const fetchedList: Order[] = response.data.orders || [];
      const currentMap = new Map(ordersRef.current.map((o) => [o.id, o]));
      
      // Check if there are newly added orders that were placed while connected
      const hasNewOrder = fetchedList.some((o) => !currentMap.has(o.id));
      if (hasNewOrder && ordersRef.current.length > 0) {
        playNewOrderBeep();
      }

      setOrders(fetchedList);
      sessionStorage.setItem(`orders_${restaurantId}`, JSON.stringify(fetchedList));
      setLastSyncTime(new Date());
      setError('');
    } catch (err: any) {
      console.warn('Orders sync notice:', err);
      if (manual && !ordersRef.current.length) {
        setError(err.response?.data?.error || 'Failed to fetch orders.');
      }
    } finally {
      if (manual) setIsSyncing(false);
      setLoading(false);
    }
  }, [restaurantId, playNewOrderBeep]);

  // ── Initial load & real-time Socket listener ──────────────
  useEffect(() => {
    if (!restaurantId) return;

    // 1. Initial fetch
    syncOrdersSilently(false);

    // 2. Setup robust Socket.io
    const socket = getSocket();
    joinRestaurantRoom(restaurantId);

    const onConnect = () => {
      setSocketConnected(true);
      joinRestaurantRoom(restaurantId);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onNewOrder = (newOrder: Order) => {
      console.log('⚡ [LiveKitchen] Real-time new_order received:', newOrder);
      setOrders((prev) => {
        // Prevent duplicate if already exists
        const exists = prev.some((o) => o.id === newOrder.id);
        const updated = exists ? prev.map((o) => (o.id === newOrder.id ? newOrder : o)) : [newOrder, ...prev];
        sessionStorage.setItem(`orders_${restaurantId}`, JSON.stringify(updated));
        return updated;
      });

      playNewOrderBeep();

      const cust = newOrder.customerName || 'Guest';
      const tbl = newOrder.tableNumber ? `Table ${newOrder.tableNumber}` : 'Counter';
      setNewOrderAlert(`🔔 New order from ${cust} (${tbl})!`);
      setTimeout(() => setNewOrderAlert(null), 6000);
    };

    const onOrderUpdated = (updated: Order) => {
      console.log('⚡ [LiveKitchen] Real-time order_updated received:', updated);
      setOrders((prev) => {
        const list = prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
        sessionStorage.setItem(`orders_${restaurantId}`, JSON.stringify(list));
        return list;
      });
    };

    if (socket.connected) {
      setSocketConnected(true);
      joinRestaurantRoom(restaurantId);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_order', onNewOrder);
    socket.on('order_updated', onOrderUpdated);

    // 3. Smart Background Auto-Polling (every 2.5s) to guarantee zero missed orders
    const pollTimer = setInterval(() => {
      syncOrdersSilently(false);
    }, 2500);

    // 4. Tab Focus & Screen Wakeup listener
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncOrdersSilently(false);
        joinRestaurantRoom(restaurantId);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_order', onNewOrder);
      socket.off('order_updated', onOrderUpdated);
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [restaurantId, syncOrdersSilently, playNewOrderBeep]);

  // ── Status update ──────────────────────────────────────────────────────────
  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: 'RECEIVED' | 'PREPARING' | 'SERVED' | 'CANCELLED',
  ) => {
    const prev = [...orders];
    // Optimistic local state update for instant UI feedback
    setOrders((c) => c.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    try {
      const res = await api.put(`/api/orders/${orderId}/status`, { status: nextStatus });
      if (res.data.order) {
        setOrders((c) => c.map((o) => (o.id === orderId ? res.data.order : o)));
      }
    } catch (err) {
      setOrders(prev);
      alert('Could not update order status. Please check your internet connection.');
    }
  };

  const activeOrders = orders.filter((o) =>
    ['PAYMENT_PENDING_VERIFICATION', 'RECEIVED', 'PREPARING'].includes(o.status),
  );
  const pastOrders = orders.filter((o) => ['SERVED', 'CANCELLED'].includes(o.status));

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-32 bg-[var(--cream-dark)] rounded-xl animate-pulse mb-1" />
          <div className="h-4 w-48 bg-[var(--cream-dark)] rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      </div>
    );
  }

  // ── Render: main ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-medium text-[var(--text)]">Live Kitchen</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Real-time instant orders from QR menus</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Live indicator badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
            <div className="relative w-2.5 h-2.5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500 live-ping opacity-75" />
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
            </div>
            <span className="text-xs font-bold text-emerald-700">
              {socketConnected ? 'Real-Time Active' : 'Live Sync Active'}
            </span>
          </div>

          {/* Quick sync button */}
          <button
            onClick={() => syncOrdersSilently(true)}
            disabled={isSyncing}
            title="Force sync orders now"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--cream-border)] hover:bg-[var(--cream)] text-[var(--text-mid)] rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-[var(--sage)]' : ''} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Real-time Order Popup Banner */}
      {newOrderAlert && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-bounce">
          <div className="flex items-center gap-2.5 font-semibold text-sm">
            <Radio size={18} className="animate-pulse" />
            <span>{newOrderAlert}</span>
          </div>
          <button
            onClick={() => setNewOrderAlert(null)}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl">
          {error}
        </div>
      )}

      {/* Staff Call Alerts */}
      {staffCalls.length > 0 && (
        <div className="space-y-2">
          {staffCalls.slice(0, 3).map((call, idx) => (
            <div
              key={idx}
              className="bg-[var(--amber-light)] border border-[var(--amber)]/30 text-[var(--brown)] px-4 py-3 rounded-2xl flex items-center justify-between text-sm notification-slide"
            >
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[var(--amber)] shrink-0" />
                <span className="font-semibold">{call.tableNumber}:</span>
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
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Active Orders</h3>
            <span className="bg-[var(--sage-light)] text-[var(--sage)] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[var(--sage)]/20">
              {activeOrders.length}
            </span>
          </div>
          <span className="text-[11px] text-[var(--muted)] font-mono">
            Synced: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-12 text-center shadow-xs">
            <div className="w-16 h-16 bg-[var(--cream)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-[var(--muted)]" />
            </div>
            <p className="font-semibold text-[var(--text)]">No active orders right now</p>
            <p className="text-sm text-[var(--muted)] mt-1">When customers order from the QR menu, they will pop up here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const orderTotal = order.items.reduce(
                (s, i) => s + parseFloat(i.priceAtOrder) * i.quantity,
                0,
              );
              const ageMin = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
              const isStalePending =
                order.status === 'PAYMENT_PENDING_VERIFICATION' && ageMin > 15;

              return (
                <div
                  key={order.id}
                  className={`bg-white border border-[var(--cream-border)] border-l-4 rounded-3xl p-5 space-y-4 shadow-sm flex flex-col transition-all ${
                    isStalePending
                      ? 'border-l-red-500 bg-red-50/20'
                      : STATUS_COLORS[order.status] || ''
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
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_BADGE[order.status]}`}
                        >
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      )}
                      <p className="text-sm font-bold text-[var(--text)]">
                        {order.customerName || 'Guest'}
                        {order.tableNumber && (
                          <span className="text-[var(--muted)] font-normal ml-1.5">
                            · Table {order.tableNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {order.paymentMethod === 'UPI' && (
                          <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            UPI
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--cream)] border border-[var(--cream-border)] px-3 py-1.5 rounded-xl shrink-0">
                      <IndianRupee size={12} className="text-[var(--sage)]" />
                      <span className="font-mono font-bold text-[var(--sage)] text-sm">
                        {orderTotal.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-[var(--cream)] rounded-2xl divide-y divide-[var(--cream-border)] overflow-hidden">
                    {order.items.map((item) => (
                      <div key={item.id} className="px-3.5 py-2.5 flex justify-between gap-3 text-sm">
                        <div>
                          <span className="font-bold text-[var(--text)]">{item.quantity}×</span>
                          <span className="ml-1.5 text-[var(--text-mid)]">{item.menuItem?.name || 'Item'}</span>
                          {item.notes && (
                            <p className="text-xs text-[var(--muted)] italic mt-0.5">"{item.notes}"</p>
                          )}
                        </div>
                        <span className="font-mono text-xs text-[var(--muted)] shrink-0">
                          ₹{(parseFloat(item.priceAtOrder) * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 mt-auto">
                    {order.status === 'PAYMENT_PENDING_VERIFICATION' ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'RECEIVED')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Check size={15} /> Mark as Paid
                      </button>
                    ) : order.status === 'RECEIVED' ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Play size={13} /> Start Preparing
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Check size={15} /> Complete & Serve
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                      title="Cancel order"
                      className="p-2.5 border border-[var(--cream-border)] hover:bg-red-50 hover:border-red-200 text-[var(--muted)] hover:text-red-600 rounded-xl transition-all cursor-pointer"
                    >
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
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Recent Completed
          </h3>
          <div className="bg-white border border-[var(--cream-border)] rounded-3xl overflow-hidden divide-y divide-[var(--cream-dark)] shadow-xs">
            {pastOrders.slice(0, 6).map((order) => {
              const total = order.items.reduce(
                (s, i) => s + parseFloat(i.priceAtOrder) * i.quantity,
                0,
              );
              const isServed = order.status === 'SERVED';
              return (
                <div key={order.id} className="px-5 py-3.5 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isServed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {PAST_STATUS_LABEL[order.status] || order.status}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--text)]">
                        {order.customerName || 'Guest'}
                        {order.tableNumber && (
                          <span className="text-[var(--muted)] font-normal ml-1.5 text-xs">
                            · Table {order.tableNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {order.items.map((i) => `${i.quantity}× ${i.menuItem?.name || 'Item'}`).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-[var(--sage)] text-sm">
                      ₹{total.toFixed(0)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
