import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import QRSection from '../components/QRSection';
import MenuBuilder from './MenuBuilder';
import LiveOrders from '../components/LiveOrders';
import AnalyticsView from '../components/AnalyticsView';
import { API_BASE_URL } from '../config';
import { getSocket, joinRestaurantRoom } from '../utils/socket';
import { startStaffCallRingtone, unlockAudioContext } from '../utils/audio';
import {
  Store, UtensilsCrossed, ClipboardList, BarChart3, LogOut,
  Camera, Loader2, Save, Settings, Megaphone, QrCode, Menu, X,
  CheckCircle2, PauseCircle, Bell
} from 'lucide-react';
import { usePageMetadata } from '../utils/usePageMetadata';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'orders' | 'analytics'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : {};
    } catch { return {}; }
  });
  const [restaurant, setRestaurant] = useState<any>(() => {
    try {
      const r = localStorage.getItem('restaurant');
      return r ? JSON.parse(r) : {};
    } catch { return {}; }
  });
  const [announcement, setAnnouncement] = useState<any>(null);

  usePageMetadata(restaurant?.name ? `${restaurant.name} | Cafe Owner` : 'Cafe Owner | Dashboard', 'chef');

  const [editingProfile, setEditingProfile] = useState(false);
  const [restName, setRestName] = useState(restaurant?.name || '');
  const [restAddress, setRestAddress] = useState(restaurant?.address || '');
  const [restContact, setRestContact] = useState(restaurant?.contactNumber || '');
  const [restUpiId, setRestUpiId] = useState(restaurant?.upiId || '');
  const [restUpiPayeeName, setRestUpiPayeeName] = useState(restaurant?.upiPayeeName || '');
  const [restLogo, setRestLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(restaurant?.logoUrl ? (restaurant.logoUrl.startsWith('http') ? restaurant.logoUrl : `${API_BASE_URL}${restaurant.logoUrl}`) : null);
  const [restUpiQrImage, setRestUpiQrImage] = useState<File | null>(null);
  const [upiQrPreview, setUpiQrPreview] = useState<string | null>(restaurant?.upiQrImageUrl ? (restaurant.upiQrImageUrl.startsWith('http') ? restaurant.upiQrImageUrl : `${API_BASE_URL}${restaurant.upiQrImageUrl}`) : null);
  const [logoError, setLogoError] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Staff Call Alert & 15-second Ringtone tune state
  const [staffCallAlert, setStaffCallAlert] = useState<{ tableNumber: string; requestType: string; timestamp: string } | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  // Global Active Orders Count & Alert state
  const [activeOrderCount, setActiveOrderCount] = useState<number>(0);
  const [incomingOrderAlert, setIncomingOrderAlert] = useState<{ id: string; customerName: string; total: number; tableNumber?: string } | null>(null);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  // Sound armed state — persisted so the owner only needs to enable once per browser
  const [audioArmed, setAudioArmed] = useState<boolean>(() => {
    return localStorage.getItem('dashboard_audio_armed') === 'true';
  });
  // Ref so the socket callback always sees the latest value (no stale closure)
  const audioArmedRef = useRef(audioArmed);
  useEffect(() => { audioArmedRef.current = audioArmed; }, [audioArmed]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await api.get('/api/auth/me');
        if (response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        if (response.data.restaurant) {
          const rest = response.data.restaurant;
          setRestaurant(rest);
          localStorage.setItem('restaurant', JSON.stringify(rest));
          setRestName(rest.name || '');
          setRestAddress(rest.address || '');
          setRestContact(rest.contactNumber || '');
          setRestUpiId(rest.upiId || '');
          setRestUpiPayeeName(rest.upiPayeeName || '');
          if (rest.logoUrl) setLogoPreview(rest.logoUrl.startsWith('http') ? rest.logoUrl : `${API_BASE_URL}${rest.logoUrl}`);
          if (rest.upiQrImageUrl) setUpiQrPreview(rest.upiQrImageUrl.startsWith('http') ? rest.upiQrImageUrl : `${API_BASE_URL}${rest.upiQrImageUrl}`);
        }
      } catch (err: any) {
        console.error('Failed to fetch profile', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('restaurant');
          navigate('/login');
          return;
        }
        const userJson = localStorage.getItem('user');
        const restJson = localStorage.getItem('restaurant');
        if (userJson) setUser(JSON.parse(userJson));
        if (restJson) {
          const rest = JSON.parse(restJson);
          setRestaurant(rest);
          setRestName(rest.name || '');
          setRestAddress(rest.address || '');
          setRestContact(rest.contactNumber || '');
          setRestUpiId(rest.upiId || '');
          setRestUpiPayeeName(rest.upiPayeeName || '');
          if (rest.upiQrImageUrl) setUpiQrPreview(rest.upiQrImageUrl.startsWith('http') ? rest.upiQrImageUrl : `${API_BASE_URL}${rest.upiQrImageUrl}`);
        }
      }
    };

    const fetchAnnouncement = async () => {
      try {
        const res = await api.get('/api/public/announcement');
        if (res.data.announcement) setAnnouncement(res.data.announcement);
      } catch (err) { console.error(err); }
    };

    fetchMe();
    fetchAnnouncement();
  }, []);

  // Re-unlock audio context on any click (backup for page reloads when audioArmed is already true)
  useEffect(() => {
    if (!audioArmed) return;
    const handleClick = () => unlockAudioContext();
    window.addEventListener('click', handleClick, { once: true });
    window.addEventListener('touchstart', handleClick, { once: true });
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleClick);
    };
  }, [audioArmed]);

  // Global socket listener & polling for Staff Call and New Orders
  useEffect(() => {
    if (!restaurant.id) return;

    const socket = getSocket();
    joinRestaurantRoom(restaurant.id);

    const handleStaffCall = (data: { tableNumber: string; requestType: string; timestamp: string }) => {
      const armed = audioArmedRef.current; // always fresh value

      setStaffCallAlert(data);
      setIsRinging(armed);

      if (armed) {
        if (stopRingtoneRef.current) stopRingtoneRef.current();
        const stopFn = startStaffCallRingtone(15000);
        stopRingtoneRef.current = stopFn;
        setTimeout(() => setIsRinging(false), 15000);
      }
    };

    const handleNewOrder = (order: any) => {
      const total = (order.items || []).reduce(
        (s: number, i: any) => s + parseFloat(i.priceAtOrder || 0) * (i.quantity || 1),
        0
      );
      setIncomingOrderAlert({
        id: order.id,
        customerName: order.customerName || 'Guest',
        tableNumber: order.tableNumber || null,
        total,
      });

      if (audioArmedRef.current) {
        unlockAudioContext();
        try {
          const Ctor = window.AudioContext || (window as any).webkitAudioContext;
          if (Ctor) {
            const ctx = new Ctor();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 750;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.28);
          }
        } catch (_) {}
      }
    };

    socket.on('staff_call', handleStaffCall);
    socket.on('new_order', handleNewOrder);

    // Global periodic order counter sync
    const pollActiveOrders = async () => {
      try {
        const res = await api.get(`/api/restaurants/${restaurant.id}/orders`);
        const list = res.data.orders || [];
        const activeList = list.filter((o: any) =>
          ['PAYMENT_PENDING_VERIFICATION', 'RECEIVED', 'PREPARING'].includes(o.status)
        );
        setActiveOrderCount(activeList.length);

        // Check if new orders appeared that weren't in previous set
        const currentIds = new Set<string>(list.map((o: any) => o.id));
        if (prevOrderIdsRef.current.size > 0) {
          const newOrder = list.find((o: any) => !prevOrderIdsRef.current.has(o.id));
          if (newOrder) {
            handleNewOrder(newOrder);
          }
        }
        prevOrderIdsRef.current = currentIds;
      } catch {
        // silent
      }
    };

    pollActiveOrders();
    const interval = setInterval(pollActiveOrders, 2500);

    return () => {
      socket.off('staff_call', handleStaffCall);
      socket.off('new_order', handleNewOrder);
      clearInterval(interval);
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
    };
  }, [restaurant.id]);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { const f = e.target.files[0]; setRestLogo(f); setLogoPreview(URL.createObjectURL(f)); }
  };
  const handleUpiQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { const f = e.target.files[0]; setRestUpiQrImage(f); setUpiQrPreview(URL.createObjectURL(f)); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    const cleanedUpiId = restUpiId.trim();
    if (cleanedUpiId && (!cleanedUpiId.includes('@') || cleanedUpiId.includes(' '))) {
      setProfileError("Invalid UPI ID format. Must contain '@' and no spaces (e.g. cafename@okaxis).");
      setSavingProfile(false);
      return;
    }
    const formData = new FormData();
    formData.append('name', restName);
    formData.append('address', restAddress);
    formData.append('contactNumber', restContact);
    formData.append('upiId', cleanedUpiId);
    formData.append('upiPayeeName', restUpiPayeeName.trim());
    if (restLogo) formData.append('logo', restLogo);
    if (restUpiQrImage) formData.append('upiQrCode', restUpiQrImage);
    try {
      const response = await api.put(`/api/restaurants/${restaurant.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const updatedRest = response.data.restaurant;
      setRestaurant(updatedRest);
      localStorage.setItem('restaurant', JSON.stringify(updatedRest));
      setEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview & QR', icon: Store },
    { id: 'menu', label: 'Menu Builder', icon: UtensilsCrossed },
    { id: 'orders', label: 'Live Kitchen', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-white/10">
        <h1 className="font-display text-2xl text-white font-medium italic">MenuQR</h1>
        <p className="text-white/40 text-[10px] mt-0.5 uppercase tracking-widest">Cafe Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-[var(--sage)] shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={17} />
            <span>{label}</span>
            {id === 'orders' && activeOrderCount > 0 && (
              <span className="ml-auto bg-emerald-400 text-[var(--sage)] text-[11px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                {activeOrderCount}
              </span>
            )}
          </button>
        ))}

        {/* Kitchen toggle */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="text-white/40 text-[10px] uppercase tracking-widest px-4 mb-2">Kitchen Status</p>
          <button
            type="button"
            onClick={async () => {
              const previousState = restaurant.isAcceptingOrders ?? true;
              const nextState = !previousState;
              setRestaurant((prev: any) => ({ ...prev, isAcceptingOrders: nextState }));
              try {
                const res = await api.put(`/api/restaurants/${restaurant.id}`, { isAcceptingOrders: nextState });
                const updatedRest = res.data.restaurant;
                setRestaurant(updatedRest);
                localStorage.setItem('restaurant', JSON.stringify(updatedRest));
              } catch (err) {
                setRestaurant((prev: any) => ({ ...prev, isAcceptingOrders: previousState }));
                alert('Could not toggle kitchen status.');
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              (restaurant.isAcceptingOrders ?? true)
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
          >
            {(restaurant.isAcceptingOrders ?? true)
              ? <><CheckCircle2 size={17} /> Orders Open</>
              : <><PauseCircle size={17} /> Orders Paused</>
            }
            <span className="ml-auto text-[10px] opacity-60">Toggle</span>
          </button>

          {/* Test Ringtone button */}
          <button
            type="button"
            onClick={() => {
              // These must ALL run synchronously inside the click handler
              // so the browser grants AudioContext permission
              unlockAudioContext();
              if (stopRingtoneRef.current) stopRingtoneRef.current();
              const stopFn = startStaffCallRingtone(15000);
              stopRingtoneRef.current = stopFn;
              setStaffCallAlert({
                tableNumber: 'Table 1 (Test)',
                requestType: 'Call Waiter (Sound Test)',
                timestamp: new Date().toISOString()
              });
              setIsRinging(true);
              setTimeout(() => setIsRinging(false), 15000);
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/20 transition-all mt-3 cursor-pointer"
          >
            <span className="flex items-center gap-2">🔔 Test 15s Ringtone</span>
            <span className="text-[10px] bg-amber-400/30 px-1.5 py-0.5 rounded text-amber-100 font-bold">▶ Play</span>
          </button>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm uppercase shrink-0">
            {user.name ? user.name[0] : 'U'}
          </div>
          <div className="truncate">
            <p className="text-white text-sm font-semibold leading-tight truncate">{user.name}</p>
            <p className="text-white/40 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/60 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium transition-all"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--cream)] flex relative">
      {/* Premium Staff Call Notification */}
      {staffCallAlert && (
        <div className="fixed top-0 inset-x-0 z-[9999] flex justify-center px-4 pt-4 pointer-events-none">
          <div className="notification-slide w-full max-w-md pointer-events-auto">
            <div className="bg-[#0c0e14]/95 backdrop-blur-xl border border-white/[0.07] rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/70 flex items-center gap-3.5">

              {/* Pulsing bell */}
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" style={{ animationDuration: '1.3s' }} />
                <div className="relative w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                  <Bell size={17} className="text-rose-400" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-semibold leading-tight">Staff Called</p>
                  {isRinging && (
                    <span className="inline-flex items-center gap-1 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-white/45 text-xs mt-0.5 truncate">
                  {staffCallAlert.tableNumber ? `${staffCallAlert.tableNumber} · ` : ''}
                  {staffCallAlert.requestType || 'Call Waiter'}
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => {
                  if (stopRingtoneRef.current) {
                    stopRingtoneRef.current();
                    stopRingtoneRef.current = null;
                  }
                  setIsRinging(false);
                  setStaffCallAlert(null);
                }}
                className="shrink-0 px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.08] text-white/60 hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                Dismiss
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Global Incoming Order Notification Alert */}
      {incomingOrderAlert && (
        <div className="fixed top-4 inset-x-0 z-[9998] flex justify-center px-4 pointer-events-none">
          <div className="notification-slide w-full max-w-md pointer-events-auto bg-emerald-700 text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                🔔
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight">New Order Received!</p>
                <p className="text-xs text-white/80 mt-0.5 truncate">
                  {incomingOrderAlert.customerName} {incomingOrderAlert.tableNumber ? `· Table ${incomingOrderAlert.tableNumber}` : ''} · ₹{incomingOrderAlert.total.toFixed(0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setIncomingOrderAlert(null);
                }}
                className="bg-white text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
              >
                View Kitchen →
              </button>
              <button
                onClick={() => setIncomingOrderAlert(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[var(--sage)] flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-[var(--sage)] h-full z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
              <X size={20} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-5 py-4 bg-[var(--sage)] sticky top-0 z-40">
          <h1 className="font-display text-xl text-white font-medium italic">MenuQR</h1>
          <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
            <Menu size={22} />
          </button>
        </div>

        <div className="flex-1 p-5 md:p-8 max-w-5xl w-full mx-auto">
          {/* Announcement */}
          {announcement && (
            <div className="bg-[var(--amber-light)] border border-[var(--amber)]/30 text-[var(--brown)] px-4 py-3 rounded-2xl flex items-center gap-3 text-sm mb-6">
              <Megaphone size={18} className="shrink-0" />
              <span className="font-medium">{announcement.message}</span>
            </div>
          )}


          {/* Sound Alerts Banner — only shown on tabs where audio matters */}
          {(activeTab === 'overview' || activeTab === 'orders') && (
            !audioArmed ? (
              <div className="bg-gradient-to-r from-[var(--sage)] to-[var(--sage-mid)] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm mb-6">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Enable Sound Alerts</p>
                    <p className="text-white/65 text-xs mt-0.5">Hear a ringtone instantly when customers call for service</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    unlockAudioContext();
                    const stop = startStaffCallRingtone(1000);
                    setTimeout(stop, 1000);
                    setAudioArmed(true);
                    localStorage.setItem('dashboard_audio_armed', 'true');
                  }}
                  className="shrink-0 bg-white text-[var(--sage)] font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[var(--cream)] transition-all active:scale-95 shadow-sm"
                >
                  Enable Now
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-2 h-2">
                    <div className="absolute inset-0 rounded-full bg-emerald-500 live-ping" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">Sound alerts active</p>
                  <p className="text-emerald-600 text-xs hidden sm:block">— you'll hear a ringtone when customers call</p>
                </div>
                <button
                  onClick={() => {
                    setAudioArmed(false);
                    localStorage.removeItem('dashboard_audio_armed');
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                >
                  Disable
                </button>
              </div>
            )
          )}

          {/* Overview Tab */}
          <div className={activeTab === 'overview' ? 'space-y-6' : 'hidden'}>
            {/* Quick Live Kitchen Status Banner */}
            <div className="bg-gradient-to-r from-[var(--sage)] to-[var(--sage-mid)] rounded-3xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shrink-0">
                  👨‍🍳
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">Live Kitchen Stream</h3>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-400/30 text-emerald-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                      Live Sync Active
                    </span>
                  </div>
                  <p className="text-white/80 text-xs mt-0.5">
                    {activeOrderCount === 0
                      ? 'No pending orders right now. Orders placed on QR menus pop up automatically.'
                      : `⚡ You have ${activeOrderCount} active order(s) right now in the kitchen.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                className="px-4 py-2.5 bg-white text-[var(--sage)] rounded-xl font-bold text-xs hover:bg-[var(--cream)] transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
              >
                <ClipboardList size={14} /> Open Live Kitchen {activeOrderCount > 0 ? `(${activeOrderCount})` : ''} →
              </button>
            </div>

            {/* Cafe Profile Card */}
              <div className="bg-white rounded-3xl border border-[var(--cream-border)] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--cream-dark)]">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text)]">Cafe Profile</h2>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Public info, logo & payment settings</p>
                  </div>
                  {!editingProfile && (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-[var(--cream-border)] hover:bg-[var(--cream)] rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-all"
                    >
                      <Settings size={13} /> Edit
                    </button>
                  )}
                </div>

                <div className="p-6">
                  {profileError && (
                    <div className="mb-4 bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-3.5 rounded-xl">
                      {profileError}
                    </div>
                  )}

                  {editingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Cafe Name</label>
                          <input type="text" required value={restName} onChange={(e) => setRestName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Contact Number</label>
                          <input type="text" value={restContact} onChange={(e) => setRestContact(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] text-sm" placeholder="1234567890" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">Address</label>
                          <input type="text" value={restAddress} onChange={(e) => setRestAddress(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] text-sm" placeholder="123 Main Street, City" />
                        </div>

                        {/* UPI Section */}
                        <div className="md:col-span-2 bg-[var(--sage-light)] rounded-2xl p-4 space-y-4">
                          <p className="text-xs font-bold text-[var(--sage)] uppercase tracking-wider">UPI Payment Settings</p>

                          <div className="bg-white rounded-xl p-4 space-y-2 border border-[var(--cream-border)]">
                            <label className="block text-xs font-semibold text-[var(--text-mid)]">Option 1 — Upload UPI QR Image <span className="text-[var(--sage)] font-bold">(Recommended)</span></label>
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-xl border border-[var(--cream-border)] bg-[var(--cream)] flex items-center justify-center overflow-hidden shrink-0">
                                {upiQrPreview ? <img src={upiQrPreview} alt="UPI QR" className="w-full h-full object-contain p-1" /> : <QrCode className="text-[var(--muted)]" size={28} />}
                              </div>
                              <div>
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-[var(--sage)] text-white rounded-xl text-xs font-bold hover:bg-[var(--sage-mid)] transition-all">
                                  Choose File <input type="file" accept="image/*" className="hidden" onChange={handleUpiQrChange} />
                                </label>
                                <p className="text-xs text-[var(--muted)] mt-1.5">Upload screenshot of your GPay/PhonePe QR code</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Option 2 — UPI ID</label>
                              <input type="text" value={restUpiId} onChange={(e) => setRestUpiId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[var(--cream-border)] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--sage)]" placeholder="cafename@okaxis" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">UPI Payee Name</label>
                              <input type="text" value={restUpiPayeeName} onChange={(e) => setRestUpiPayeeName(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[var(--cream-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sage)]" placeholder="Cafe Name" />
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Logo</label>
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl border border-[var(--cream-border)] bg-[var(--cream)] flex items-center justify-center overflow-hidden shrink-0">
                              {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Camera className="text-[var(--muted)]" size={22} />}
                            </div>
                            <label className="cursor-pointer px-4 py-2.5 border border-[var(--cream-border)] bg-white rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--cream)] transition-all">
                              Upload Logo <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={savingProfile}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                          {savingProfile ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          Save Changes
                        </button>
                        <button type="button" onClick={() => {
                          setEditingProfile(false);
                          setLogoPreview(restaurant.logoUrl ? (restaurant.logoUrl.startsWith('http') ? restaurant.logoUrl : `${API_BASE_URL}${restaurant.logoUrl}`) : null);
                          setUpiQrPreview(restaurant.upiQrImageUrl ? (restaurant.upiQrImageUrl.startsWith('http') ? restaurant.upiQrImageUrl : `${API_BASE_URL}${restaurant.upiQrImageUrl}`) : null);
                          setRestName(restaurant.name || '');
                          setRestAddress(restaurant.address || '');
                          setRestContact(restaurant.contactNumber || '');
                          setRestUpiId(restaurant.upiId || '');
                          setRestUpiPayeeName(restaurant.upiPayeeName || '');
                        }}
                          className="px-5 py-2.5 border border-[var(--cream-border)] text-[var(--muted)] rounded-xl text-sm font-semibold hover:bg-[var(--cream)] transition-all">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-[var(--cream)] border border-[var(--cream-border)] flex items-center justify-center overflow-hidden shrink-0">
                        {restaurant.logoUrl && !logoError
                          ? <img src={restaurant.logoUrl.startsWith('http') ? restaurant.logoUrl : `${API_BASE_URL}${restaurant.logoUrl}`} alt="Logo" onError={() => setLogoError(true)} className="w-full h-full object-cover" />
                          : <Store size={30} className="text-[var(--muted)]" />
                        }
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-2xl font-display font-medium text-[var(--text)]">{restaurant.name}</h3>
                        <p className="text-sm text-[var(--muted)]">{restaurant.address || 'No address set'}</p>
                        <p className="text-xs text-[var(--muted)]">📞 {restaurant.contactNumber || 'No contact'}</p>
                      </div>
                      <div className="bg-[var(--sage-light)] border border-[var(--sage)]/20 p-3.5 rounded-2xl min-w-[160px] text-xs space-y-1">
                        <p className="text-[10px] font-bold text-[var(--sage)] uppercase tracking-wider">UPI Status</p>
                        {restaurant.upiQrImageUrl ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold text-[10px]">✓ QR Uploaded</span>
                        ) : restaurant.upiId ? (
                          <>
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold text-[10px]">✓ UPI ID Active</span>
                            <p className="font-mono text-[var(--text)]">{restaurant.upiId}</p>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[var(--amber-light)] text-[var(--amber)] border border-[var(--amber)]/30 px-2 py-0.5 rounded-lg font-bold text-[10px]">Not Configured</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Section */}
              {restaurant.id && <QRSection restaurantId={restaurant.id} />}
            </div>

          {restaurant.id && (
            <>
              <div className={activeTab === 'menu' ? 'block' : 'hidden'}>
                <MenuBuilder restaurantId={restaurant.id} />
              </div>
              <div className={activeTab === 'orders' ? 'block' : 'hidden'}>
                <LiveOrders restaurantId={restaurant.id} audioArmed={audioArmed} isActive={activeTab === 'orders'} />
              </div>
              <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
                <AnalyticsView restaurantId={restaurant.id} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
