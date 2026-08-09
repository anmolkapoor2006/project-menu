import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
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
      const payload = {
        name,
        email,
        password,
        restaurantName,
        slug: slug.trim() === '' ? undefined : slug.trim().toLowerCase(),
      };
      const response = await api.post('/api/auth/register', payload);
      const { token, user, restaurant } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('restaurant', JSON.stringify(restaurant));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--cream)]">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--sage)] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />

        <div className="relative z-10">
          <h1 className="font-display text-4xl text-white font-medium italic">MenuQR</h1>
          <p className="text-[var(--sage-muted)] text-sm mt-1 tracking-wider uppercase">Digital Menu Platform</p>
        </div>

        <div className="relative z-10 space-y-6">
          <p className="font-display text-3xl text-white font-light italic leading-snug">
            "Your cafe's digital presence starts with a single QR scan."
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { emoji: '📱', label: 'Digital Menus' },
              { emoji: '⚡', label: 'Live Orders' },
              { emoji: '💸', label: 'UPI Payments' },
              { emoji: '📊', label: 'Analytics' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-white/80 text-sm">
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">Free to start. No credit card needed.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-7">
          <div className="lg:hidden text-center">
            <h1 className="font-display text-3xl text-[var(--sage)] font-medium italic">MenuQR</h1>
          </div>

          <div>
            <h2 className="font-display text-3xl text-[var(--text)] font-medium">Create account</h2>
            <p className="text-[var(--muted)] text-sm mt-1">Register your cafe and get started in minutes</p>
          </div>

          {error && (
            <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">Owner Name</label>
                <input
                  id="owner-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">Cafe Name</label>
                <input
                  id="restaurant-name"
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                  placeholder="Cafe Central"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wider">
                Custom URL Slug <span className="text-[var(--muted)] font-normal normal-case">(optional)</span>
              </label>
              <input
                id="restaurant-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[var(--cream-border)] rounded-2xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all"
                placeholder="cafe-central"
              />
              <p className="text-xs text-[var(--muted)]">Leave blank to auto-generate from your cafe name</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--sage)]/20 active:scale-[0.98] mt-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Creating Account…' : 'Create Account & Start Free'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--sage)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
