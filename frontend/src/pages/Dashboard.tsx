import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import QRSection from '../components/QRSection';
import MenuBuilder from './MenuBuilder';
import LiveOrders from '../components/LiveOrders';
import AnalyticsView from '../components/AnalyticsView';
import {
  Store, UtensilsCrossed, ClipboardList, BarChart3, LogOut,
  Camera, Loader2, Save, Settings, Megaphone, QrCode, Menu, X,
  CheckCircle2, PauseCircle
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'orders' | 'analytics'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<any>({});
  const [restaurant, setRestaurant] = useState<any>({});
  const [announcement, setAnnouncement] = useState<any>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restContact, setRestContact] = useState('');
  const [restUpiId, setRestUpiId] = useState('');
  const [restUpiPayeeName, setRestUpiPayeeName] = useState('');
  const [restLogo, setRestLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [restUpiQrImage, setRestUpiQrImage] = useState<File | null>(null);
  const [upiQrPreview, setUpiQrPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      } catch (err) {
        console.error('Failed to fetch profile', err);
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
            {label}
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
    <div className="min-h-screen bg-[var(--cream)] flex">
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

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 fade-in">
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
          )}

          {activeTab === 'menu' && restaurant.id && <div className="fade-in"><MenuBuilder restaurantId={restaurant.id} /></div>}
          {activeTab === 'orders' && restaurant.id && <div className="fade-in"><LiveOrders restaurantId={restaurant.id} /></div>}
          {activeTab === 'analytics' && restaurant.id && <div className="fade-in"><AnalyticsView restaurantId={restaurant.id} /></div>}
        </div>
      </main>
    </div>
  );
}
