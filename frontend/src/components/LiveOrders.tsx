import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../api/api';
import { Play, Check, X, Loader2, Volume2 } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: string;
  notes: string | null;
  menuItem: {
    name: string;
  };
}

interface Order {
  id: string;
  tableNumber: string | null;
  status: 'RECEIVED' | 'PREPARING' | 'SERVED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

interface LiveOrdersProps {
  restaurantId: string;
}

export default function LiveOrders({ restaurantId }: LiveOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const playBeep = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Short double beep
      const beep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + timeOffset); // E5 note
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.15);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.15);
      };

      beep(0);
      beep(0.2);
    } catch (e) {
      console.warn('AudioContext beep failed:', e);
    }
  };

  useEffect(() => {
    // 1. Fetch initial orders
    async function loadOrders() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/orders`);
        setOrders(response.data.orders);
      } catch (err) {
        console.error('Failed to load orders', err);
        setError('Failed to fetch orders.');
      } finally {
        setLoading(false);
      }
    }
    loadOrders();

    // 2. Set up socket.io connection
    const socket = io(API_BASE_URL);

    socket.on('connect', () => {
      socket.emit('join_restaurant', restaurantId);
    });

    socket.on('new_order', (newOrder: Order) => {
      setOrders((prevOrders) => [newOrder, ...prevOrders]);
      playBeep();
    });

    socket.on('order_updated', (updatedOrder: Order) => {
      setOrders((prevOrders) =>
        prevOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  const handleUpdateStatus = async (orderId: string, nextStatus: 'PREPARING' | 'SERVED' | 'CANCELLED') => {
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Could not update order status.');
    }
  };

  const activeOrders = orders.filter((o) => o.status === 'RECEIVED' || o.status === 'PREPARING');
  const pastOrders = orders.filter((o) => o.status === 'SERVED' || o.status === 'CANCELLED');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Kitchen</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time incoming customer orders from QR menus</p>
        </div>

        <button
          onClick={() => setAudioEnabled(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            audioEnabled
              ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
              : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
          }`}
        >
          <Volume2 size={14} />
          {audioEnabled ? 'Sound On' : 'Muted'}
        </button>
      </div>

      {/* Grid of active orders */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          Active Orders
          <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full font-bold">
            {activeOrders.length}
          </span>
        </h3>

        {activeOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-12 text-center text-slate-400">
            <p className="text-lg">No active orders</p>
            <p className="text-sm text-slate-500 mt-1">New orders will show up here in real time as customers scan and place them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className={`border rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between ${
                  order.status === 'RECEIVED'
                    ? 'bg-slate-900 border-indigo-500/30'
                    : 'bg-slate-900 border-amber-500/30'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header info */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        order.status === 'RECEIVED'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {order.tableNumber && (
                      <span className="text-xs font-bold text-white bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono">
                        Table: {order.tableNumber}
                      </span>
                    )}
                  </div>

                  {/* List of items */}
                  <div className="divide-y divide-slate-850 py-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-2 flex justify-between gap-4 text-sm">
                        <div>
                          <span className="font-bold text-white">{item.quantity}x</span> {item.menuItem.name}
                          {item.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">Note: "{item.notes}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-850">
                  {order.status === 'RECEIVED' ? (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <Play size={12} />
                      Start Cook
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <Check size={12} />
                      Complete & Serve
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                    className="p-2 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-red-400 rounded-xl transition-all"
                    title="Cancel Order"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past/Served orders listing */}
      {pastOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Recent Past Orders
          </h3>

          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-850">
              {pastOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm bg-slate-900/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        order.status === 'SERVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {order.status}
                      </span>
                      {order.tableNumber && (
                        <span className="text-xs text-slate-400 font-mono font-semibold">Table {order.tableNumber}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                    </p>
                  </div>
                  
                  <span className="text-xs text-slate-500 font-mono shrink-0">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
