import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import QRSection from '../components/QRSection';
import MenuBuilder from './MenuBuilder';
import LiveOrders from '../components/LiveOrders';
import AnalyticsView from '../components/AnalyticsView';
import { Store, UtensilsCrossed, ClipboardList, BarChart3, LogOut, Camera, Loader2, Save, Settings } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'menu' | 'orders' | 'analytics'>('overview');
  
  const [user, setUser] = useState<any>({});
  const [restaurant, setRestaurant] = useState<any>({});

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restContact, setRestContact] = useState('');
  const [restLogo, setRestLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    const restJson = localStorage.getItem('restaurant');
    
    if (userJson) setUser(JSON.parse(userJson));
    if (restJson) {
      const rest = JSON.parse(restJson);
      setRestaurant(rest);
      setRestName(rest.name || '');
      setRestAddress(rest.address || '');
      setRestContact(rest.contactNumber || '');
      if (rest.logoUrl) {
        setLogoPreview(`${API_BASE_URL}${rest.logoUrl}`);
      }
    }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Menu<span className="text-indigo-400">QR</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Cafe Admin Control</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Store size={18} />
              Overview & QR
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'menu'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UtensilsCrossed size={18} />
              Menu Builder
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ClipboardList size={18} />
              Live Kitchen
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 size={18} />
              Analytics
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 mt-6 md:mt-0 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold uppercase">
              {user.name ? user.name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Space */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-5xl">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Cafe Details Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Cafe Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your public information and logo</p>
                </div>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all text-slate-300"
                  >
                    <Settings size={14} />
                    Edit Details
                  </button>
                )}
              </div>

              {profileError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl">
                  {profileError}
                </div>
              )}

              {editingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Cafe Name</label>
                      <input
                        type="text"
                        required
                        value={restName}
                        onChange={(e) => setRestName(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300">Contact Number</label>
                      <input
                        type="text"
                        value={restContact}
                        onChange={(e) => setRestContact(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                        placeholder="1234567890"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300">Address</label>
                      <input
                        type="text"
                        value={restAddress}
                        onChange={(e) => setRestAddress(e.target.value)}
                        className="mt-1 block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                        placeholder="123 Main Street, City"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="text-slate-600" size={24} />
                          )}
                        </div>
                        <label className="cursor-pointer flex items-center justify-center border border-slate-800 hover:border-indigo-500/50 bg-slate-950 px-4 py-3 rounded-xl hover:bg-slate-850 transition-all text-xs font-semibold text-slate-400 hover:text-white">
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(false);
                        setLogoPreview(restaurant.logoUrl ? `${API_BASE_URL}${restaurant.logoUrl}` : null);
                        setRestName(restaurant.name || '');
                        setRestAddress(restaurant.address || '');
                        setRestContact(restaurant.contactNumber || '');
                      }}
                      className="px-5 py-2.5 border border-slate-850 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-850"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {restaurant.logoUrl ? (
                      <img src={`${API_BASE_URL}${restaurant.logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={32} className="text-slate-700" />
                    )}
                  </div>

                  <div className="text-center sm:text-left space-y-1">
                    <h3 className="text-2xl font-bold text-white leading-tight">{restaurant.name}</h3>
                    <p className="text-sm text-slate-400">{restaurant.address || 'No address registered'}</p>
                    <p className="text-xs text-slate-500">Contact: {restaurant.contactNumber || 'N/A'}</p>
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
