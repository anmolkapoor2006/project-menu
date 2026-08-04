import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../api/api';
import { Play, Check, X, Loader2, Volume2, Bell } from 'lucide-react';

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
  const [staffCalls, setStaffCalls] = useState<{ tableNumber: string; requestType: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const playBeep = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const beep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + timeOffset);
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.15);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.15);
      };
      beep(0);
      beep(0.2);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
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

    socket.on('staff_call', (data: { tableNumber: string; requestType: string; timestamp: string }) => {
      setStaffCalls((prev) => [data, ...prev]);
      playBeep();
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  const handleUpdateStatus = async (orderId: string, nextStatus: 'PREPARING' | 'SERVED' | 'CANCELLED') => {
    const prevOrders = [...orders];
    // Optimistic UI update - instantly update local state!
    setOrders((current) =>
      current.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      await api.put(`/api/orders/${orderId}/status`, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert if error
      setOrders(prevOrders);
      alert('Could not update order status.');
    }
  };

  const activeOrders = orders.filter((o) => o.status === 'RECEIVED' || o.status === 'PREPARING');
  const pastOrders = orders.filter((o) => o.status === 'SERVED' || o.status === 'CANCELLED');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-[#5E6F58]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-750 text-xs p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1C1917]">Live Kitchen</h2>
          <p className="text-xs text-[#7A7571] mt-1">Real-time incoming customer orders from QR menus</p>
        </div>

        <button
          onClick={() => setAudioEnabled(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            audioEnabled
              ? 'bg-[#5E6F58]/10 border-[#5E6F58]/20 text-[#5E6F58]'
              : 'bg-white border-[#EAE8E4] text-[#7A7571] hover:text-[#1C1917]'
          }`}
        >
          <Volume2 size={14} />
          {audioEnabled ? 'Sound On' : 'Muted'}
        </button>
      </div>

      {/* Real-time Waiter & Water Call Alert Banners */}
      {staffCalls.length > 0 && (
        <div className="space-y-2">
          {staffCalls.slice(0, 3).map((call, idx) => (
            <div key={idx} className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs animate-bounce shadow-sm">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-amber-700 shrink-0" />
                <span className="font-bold">Table {call.tableNumber}:</span>
                <span>{call.requestType} requested!</span>
              </div>
              <button
                onClick={() => setStaffCalls((prev) => prev.filter((_, i) => i !== idx))}
                className="text-[10px] font-bold text-amber-800 bg-amber-500/20 px-2 py-0.5 rounded-lg hover:bg-amber-500/30"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Grid of active orders */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571] mb-4 flex items-center gap-2">
          Active Orders
          <span className="bg-[#5E6F58]/10 text-[#5E6F58] border border-[#5E6F58]/20 text-xs px-2.5 py-0.5 rounded-full font-bold">
            {activeOrders.length}
          </span>
        </h3>

        {activeOrders.length === 0 ? (
          <div className="bg-white border border-[#EAE8E4] rounded-2xl p-12 text-center text-[#7A7571] shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
            <p className="text-base font-bold text-[#1C1917]">No active orders</p>
            <p className="text-xs mt-1">New orders will show up here in real time as customers place them.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-6 space-y-4 shadow-[0_4px_20px_rgb(28,25,23,0.01)] flex flex-col justify-between ${
                  order.status === 'RECEIVED'
                    ? 'border-[#5E6F58]/40'
                    : 'border-amber-400/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        order.status === 'RECEIVED'
                          ? 'bg-[#5E6F58]/10 text-[#5E6F58] border border-[#5E6F58]/20'
                          : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-[10px] text-[#7A7571] mt-2">
                        Received: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {order.tableNumber && (
                      <span className="text-xs font-bold text-[#1C1917] bg-[#F6F4F0] border border-[#EAE8E4] px-3 py-1.5 rounded-xl font-mono">
                        Table: {order.tableNumber}
                      </span>
                    )}
                  </div>

                  {/* List of items */}
                  <div className="divide-y divide-[#EAE8E4] py-1 border-t border-b border-[#F6F4F0]">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-2.5 flex justify-between gap-4 text-xs">
                        <div>
                          <span className="font-bold text-[#1C1917]">{item.quantity}x</span> {item.menuItem.name}
                          {item.notes && (
                            <p className="text-[10px] text-[#7A7571] italic mt-0.5">Note: "{item.notes}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status actions */}
                <div className="flex gap-2 pt-2">
                  {order.status === 'RECEIVED' ? (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Play size={12} />
                      Start Preparing
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Check size={12} />
                      Complete & Serve
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                    className="p-2 border border-[#EAE8E4] hover:bg-[#F6F4F0] text-[#7A7571] hover:text-red-650 rounded-xl transition-all"
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

      {/* Past/Served orders */}
      {pastOrders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7571] mb-4">
            Recent Completed Orders
          </h3>

          <div className="bg-white border border-[#EAE8E4] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
            <div className="divide-y divide-[#EAE8E4]">
              {pastOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs bg-white">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        order.status === 'SERVED'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        {order.status}
                      </span>
                      {order.tableNumber && (
                        <span className="text-xs text-[#7A7571] font-mono font-semibold">Table {order.tableNumber}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A7571]">
                      {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                    </p>
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
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
