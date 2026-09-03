import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { usePageMetadata } from '../utils/usePageMetadata';

export default function Login() {
  usePageMetadata('Sign In | QR Digital Menu', 'default');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      const user = JSON.parse(userJson);
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user, restaurant } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (restaurant) {
        localStorage.setItem('restaurant', JSON.stringify(restaurant));
      } else {
        localStorage.removeItem('restaurant');
      }
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--cream)]">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--sage)] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          <h1 className="font-display text-4xl text-white font-medium italic">MenuQR</h1>
          <p className="text-[var(--sage-muted)] text-sm mt-1 tracking-wider uppercase">Digital Menu Platform</p>
        </div>

        <div className="relative z-10 space-y-8">
          <blockquote className="text-white/90 font-display text-3xl font-light leading-snug italic">
            "The simplest way to bring your cafe menu into the digital age."
          </blockquote>
        </div>

        <div className="relative z-10 flex gap-6 text-white/50 text-xs">
          <span>QR Menus</span>
          <span>·</span>
          <span>Live Orders</span>
          <span>·</span>
          <span>UPI Payments</span>
          <span>·</span>
          <span>Analytics</span>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile brand */}
          <div className="lg:hidden text-center">
            <h1 className="font-display text-3xl text-[var(--sage)] font-medium italic">MenuQR</h1>
          </div>

          <div>
            <h2 className="font-display text-3xl text-[var(--text)] font-medium">Welcome back</h2>
            <p className="text-[var(--muted)] text-sm mt-1">Sign in to manage your cafe</p>
          </div>

          {error && (
            <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">
                Email
              </label>
              <input
                id="email-address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--muted)]">
            New to MenuQR?{' '}
            <Link to="/signup" className="font-semibold text-[var(--sage)] hover:underline">
              Register your cafe
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
