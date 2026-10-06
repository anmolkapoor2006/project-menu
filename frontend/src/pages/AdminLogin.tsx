import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { usePageMetadata } from '../utils/usePageMetadata';

export default function AdminLogin() {
  usePageMetadata('MenuQR — Admin Sign In', 'default');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isCafeAttempt, setIsCafeAttempt] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      // Reject non-admin users
      if (user.role !== 'SUPER_ADMIN') {
        setIsCafeAttempt(true);
        setError('Access denied. This login page is reserved for Super Admins only.');
        setLoading(false);
        return;
      }

      // Store in isolated admin keys
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--cream)]">
      {/* Left Panel — Brand (Identical warm sage theme) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--sage)] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-4xl text-white font-medium italic">MenuQR</h1>
            <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <p className="text-[var(--sage-muted)] text-sm mt-1 tracking-wider uppercase">Super Admin Console</p>
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="text-white/90 font-display text-3xl font-light leading-snug italic">
            "Platform-wide visibility, multi-tenant café management, and telemetry."
          </blockquote>
        </div>

        <div className="relative z-10 flex gap-6 text-white/50 text-xs">
          <span>All Cafes</span>
          <span>·</span>
          <span>Platform Analytics</span>
          <span>·</span>
          <span>Announcements</span>
          <span>·</span>
          <span>Revenue</span>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile brand */}
          <div className="lg:hidden text-center">
            <h1 className="font-display text-3xl text-[var(--sage)] font-medium italic">MenuQR</h1>
            <p className="text-[var(--muted)] text-xs uppercase tracking-wider mt-1">Super Admin Portal</p>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--sage-light)] text-[var(--sage)] text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck size={14} />
              <span>Super Admin Portal</span>
            </div>
            <h2 className="font-display text-3xl text-[var(--text)] font-medium">Admin Sign In</h2>
            <p className="text-[var(--muted)] text-sm mt-1">Sign in with your administrator credentials</p>
          </div>

          {error && (
            <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
              {isCafeAttempt && (
                <div className="pt-2 border-t border-red-200/60 flex items-center justify-between">
                  <span className="text-xs text-red-700">Are you a café owner?</span>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--sage)] text-white text-xs font-semibold rounded-xl hover:bg-[var(--sage-mid)] transition-all shadow-sm"
                  >
                    <span>Café Login</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">
                Admin Email
              </label>
              <input
                id="admin-email-address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                placeholder="admin@menuqr.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--sage)]/20 active:scale-[0.98]"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Signing in…' : 'Access Admin Console'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--muted)]">
            Are you a café owner?{' '}
            <Link to="/login" className="font-semibold text-[var(--sage)] hover:underline">
              Go to Café Owner Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
