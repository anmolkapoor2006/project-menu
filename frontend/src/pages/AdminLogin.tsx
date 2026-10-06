import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { Loader2, Eye, EyeOff, ShieldCheck, Lock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { usePageMetadata } from '../utils/usePageMetadata';

export default function AdminLogin() {
  usePageMetadata('MenuQR — Super Admin Sign In', 'admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isCafeAttempt, setIsCafeAttempt] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If admin is already logged in with valid admin keys, redirect straight to admin dashboard
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userJson = localStorage.getItem('adminUser');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user.role === 'SUPER_ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        }
      } catch {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCafeAttempt(false);
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;

      // STRICT ROLE GATE: Reject Cafe Owners
      if (user.role !== 'SUPER_ADMIN') {
        setIsCafeAttempt(true);
        setError('Access Denied: Cafe Owner account detected. This portal is strictly restricted to Super Administrators.');
        setLoading(false);
        return;
      }

      // Store in ISOLATED admin keys
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your admin access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Left Panel — Enterprise Tech Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0E1322] flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800/80">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-12 w-64 h-64 rounded-full bg-purple-600/5 blur-2xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/5">
            <ShieldCheck size={22} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl text-white font-bold tracking-tight">MenuQR</h1>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-500/30 uppercase tracking-wider">
                Console
              </span>
            </div>
            <p className="text-slate-400 text-xs tracking-wider uppercase font-mono">Platform Admin Gateway</p>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-700/40 text-indigo-300 text-xs font-semibold">
              <Lock size={12} />
              <span>Isolated Super Admin Environment</span>
            </div>
            <h2 className="text-white font-display text-3xl font-normal leading-snug">
              Platform-wide orchestration, analytics, and café oversight.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Securely manage multi-tenant cafes, global announcements, platform revenue telemetry, and live status without interfering with individual café sessions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { label: 'Multi-Tenant Management', desc: 'All onboarded cafes' },
              { label: 'Platform Revenue Telemetry', desc: 'Realtime gross analytics' },
              { label: 'Global Announcements', desc: 'Broadcast to all cafes' },
              { label: 'Zero-Collision Auth', desc: 'Independent session keys' },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                  <CheckCircle2 size={13} />
                  <span>{label}</span>
                </div>
                <p className="text-[11px] text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-slate-500 text-xs font-mono">
          <span>Security Protocol v2.4</span>
          <span>End-to-End Isolated Session</span>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 relative">
        <div className="w-full max-w-md space-y-7 relative z-10">
          
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck size={14} />
              <span>Super Admin Portal</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Admin Sign In</h2>
            <p className="text-slate-400 text-sm mt-1">
              Enter your root administrator credentials to access the platform console.
            </p>
          </div>

          {/* Error Message with Smart Redirect */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-200 text-sm p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed font-medium">{error}</span>
              </div>
              {isCafeAttempt && (
                <div className="pt-2 border-t border-red-800/40 flex items-center justify-between">
                  <span className="text-xs text-red-300">Are you a café owner?</span>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#3D5A47] hover:bg-[#4E7060] text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                  >
                    <span>Café Login</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all shadow-inner"
                placeholder="admin@menuqr.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 bg-slate-900/90 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all shadow-inner"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Authenticating Admin...</span>
                </>
              ) : (
                <>
                  <span>Enter Super Admin Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Session Separation Assurance Callout */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Lock size={14} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Independent Admin Session</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Super Admin tokens are stored independently from café owner tokens. You can stay signed into both without session collision or unexpected logouts.
              </p>
            </div>
          </div>

          {/* Switch to Cafe Login */}
          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Looking for the Café Owner Login?</span>
              <span className="text-[#8FA898] font-semibold hover:underline">Click here →</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
