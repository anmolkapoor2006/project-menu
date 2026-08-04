import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import QRSection from '../components/QRSection';
import MenuBuilder from './MenuBuilder';
import LiveOrders from '../components/LiveOrders';
import AnalyticsView from '../components/AnalyticsView';
import { Store, UtensilsCrossed, ClipboardList, BarChart3, LogOut, Camera, Loader2, Save, Settings, Megaphone } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'orders' | 'analytics'>('overview');
  
  const [user, setUser] = useState<any>({});
  const [restaurant, setRestaurant] = useState<any>({});
  const [announcement, setAnnouncement] = useState<any>(null);

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restContact, setRestContact] = useState('');
  const [restLogo, setRestLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
          if (rest.logoUrl) {
            setLogoPreview(rest.logoUrl.startsWith('http') ? rest.logoUrl : `${API_BASE_URL}${rest.logoUrl}`);
          }
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
        }
      }
    };

    const fetchAnnouncement = async () => {
      try {
        const res = await api.get('/api/public/announcement');
        if (res.data.announcement) {
          setAnnouncement(res.data.announcement);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMe();
    fetchAnnouncement();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRestLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError('');

    const formData = new FormData();
    formData.append('name', restName);
    formData.append('address', restAddress);
    formData.append('contactNumber', restContact);
    if (restLogo) {
      formData.append('logo', restLogo);
    }

    try {
      const response = await api.put(`/api/restaurants/${restaurant.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] flex flex-col md:flex-row">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#EAE8E4] flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-normal text-[#1C1917] tracking-tight flex items-center gap-2 font-serif-display">
              Menu<span className="text-[#5E6F58] italic font-normal">QR</span>
            </h1>
            <p className="text-[10px] text-[#7A7571] mt-1 uppercase tracking-wider font-semibold">Cafe Admin Dashboard</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#5E6F58]/10 text-[#5E6F58] border border-[#5E6F58]/20'
                  : 'text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] border border-transparent'
              }`}
            >
              <Store size={16} />
              Overview & QR
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                activeTab === 'menu'
                  ? 'bg-[#5E6F58]/10 text-[#5E6F58] border border-[#5E6F58]/20'
                  : 'text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] border border-transparent'
              }`}
            >
              <UtensilsCrossed size={16} />
              Menu Builder
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                activeTab === 'orders'
                  ? 'bg-[#5E6F58]/10 text-[#5E6F58] border border-[#5E6F58]/20'
                  : 'text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] border border-transparent'
              }`}
            >
              <ClipboardList size={16} />
              Live Kitchen
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#5E6F58]/10 text-[#5E6F58] border border-[#5E6F58]/20'
                  : 'text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] border border-transparent'
              }`}
            >
              <BarChart3 size={16} />
              Analytics
            </button>
          </nav>

          {/* Kitchen Orders Toggle */}
          <div className="pt-4 border-t border-[#EAE8E4]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7A7571] mb-2">
              Kitchen Status
            </label>
            <button
              type="button"
              onClick={async () => {
                const previousState = restaurant.isAcceptingOrders ?? true;
                const nextState = !previousState;
                // Instant 0ms Optimistic UI update
                setRestaurant((prev: any) => ({ ...prev, isAcceptingOrders: nextState }));
                try {
                  const res = await api.put(`/api/restaurants/${restaurant.id}`, {
                    isAcceptingOrders: nextState,
                  });
                  const updatedRest = res.data.restaurant;
                  setRestaurant(updatedRest);
                  localStorage.setItem('restaurant', JSON.stringify(updatedRest));
                } catch (err) {
                  // Revert if API failed
                  setRestaurant((prev: any) => ({ ...prev, isAcceptingOrders: previousState }));
                  console.error(err);
                  alert('Could not toggle kitchen status.');
                }
              }}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 duration-100 flex items-center justify-between border cursor-pointer select-none ${
                (restaurant.isAcceptingOrders ?? true)
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20 text-red-700 hover:bg-red-500/20'
              }`}
            >
              <span className="flex items-center gap-1.5 font-bold">
                <span className={`w-2 h-2 rounded-full ${restaurant.isAcceptingOrders ?? true ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`}></span>
                {restaurant.isAcceptingOrders ?? true ? 'Orders OPEN' : 'Orders PAUSED'}
              </span>
              <span className="text-[10px] underline">Change</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-[#EAE8E4] mt-6 md:mt-0 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#5E6F58]/10 border border-[#5E6F58]/20 flex items-center justify-center text-[#5E6F58] font-bold uppercase">
              {user.name ? user.name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-[#1C1917] leading-tight">{user.name}</p>
              <p className="text-[10px] text-[#7A7571] truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 border border-[#EAE8E4] hover:bg-[#F6F4F0] text-[#7A7571] hover:text-red-600 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Space */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-5xl">
        {announcement && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs mb-6 shadow-sm">
            <Megaphone size={18} className="text-amber-700 shrink-0" />
            <div className="flex-1 font-medium">
              <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-800 mr-2">Platform Announcement</span>
              {announcement.message}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Cafe Details Card */}
            <div className="bg-white border border-[#EAE8E4] rounded-2xl p-8 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-6">
              <div className="flex justify-between items-start border-b border-[#EAE8E4] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1C1917]">Cafe Profile</h2>
                  <p className="text-xs text-[#7A7571] mt-0.5">Manage your public information and logo</p>
                </div>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#EAE8E4] hover:bg-[#F6F4F0] rounded-lg text-xs font-bold transition-all text-[#7A7571] hover:text-[#1C1917]"
                  >
                    <Settings size={14} />
                    Edit Details
                  </button>
                )}
              </div>

              {profileError && (
                <div className="bg-red-500/5 border border-red-500/20 text-red-700 text-xs p-4 rounded-xl">
                  {profileError}
                </div>
              )}

              {editingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Cafe Name</label>
                      <input
                        type="text"
                        required
                        value={restName}
                        onChange={(e) => setRestName(e.target.value)}
                        className="mt-2 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Contact Number</label>
                      <input
                        type="text"
                        value={restContact}
                        onChange={(e) => setRestContact(e.target.value)}
                        className="mt-2 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Address</label>
                      <input
                        type="text"
                        value={restAddress}
                        onChange={(e) => setRestAddress(e.target.value)}
                        className="mt-2 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                        placeholder="123 Main Street, City"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-xl border border-[#E5E2DC] bg-[#F6F4F0] flex items-center justify-center overflow-hidden">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="text-slate-400" size={24} />
                          )}
                        </div>
                        <label className="cursor-pointer flex items-center justify-center border border-[#E5E2DC] hover:border-[#5E6F58]/50 bg-[#F6F4F0] px-4 py-3 rounded-xl hover:bg-[#EAE8E4] transition-all text-xs font-bold text-[#7A7571] hover:text-[#1C1917]">
                          <span>Upload Logo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(false);
                        setLogoPreview(restaurant.logoUrl ? (restaurant.logoUrl.startsWith('http') ? restaurant.logoUrl : `${API_BASE_URL}${restaurant.logoUrl}`) : null);
                        setRestName(restaurant.name || '');
                        setRestAddress(restaurant.address || '');
                        setRestContact(restaurant.contactNumber || '');
                      }}
                      className="px-5 py-2.5 border border-[#EAE8E4] text-[#7A7571] rounded-xl text-xs font-bold hover:bg-[#F6F4F0]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-[#F6F4F0] border border-[#EAE8E4] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {restaurant.logoUrl && !logoError ? (
                      <img
                        src={
                          restaurant.logoUrl.startsWith('http') || restaurant.logoUrl.startsWith('data:')
                            ? restaurant.logoUrl
                            : `${API_BASE_URL}${restaurant.logoUrl}`
                        }
                        alt="Logo"
                        onError={() => setLogoError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store size={32} className="text-[#7A7571]" />
                    )}
                  </div>

                  <div className="text-center sm:text-left space-y-1">
                    <h3 className="text-2xl font-bold text-[#1C1917] tracking-tight">{restaurant.name}</h3>
                    <p className="text-sm text-[#7A7571]">{restaurant.address || 'No address registered'}</p>
                    <p className="text-xs text-[#7A7571] font-semibold">Contact: {restaurant.contactNumber || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* QR Card */}
            {restaurant.id && <QRSection restaurantId={restaurant.id} />}
          </div>
        )}

        {activeTab === 'menu' && restaurant.id && (
          <MenuBuilder restaurantId={restaurant.id} />
        )}

        {activeTab === 'orders' && restaurant.id && (
          <LiveOrders restaurantId={restaurant.id} />
        )}

        {activeTab === 'analytics' && restaurant.id && (
          <AnalyticsView restaurantId={restaurant.id} />
        )}
      </main>
    </div>
  );
}
