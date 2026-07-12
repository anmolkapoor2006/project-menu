import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-[#EAE8E4] p-10 rounded-2xl shadow-[0_8px_30px_rgb(28,25,23,0.03)]">
        <div>
          <h2 className="text-center text-4xl font-normal text-[#1C1917] tracking-tight font-serif-display">
            Register Cafe
          </h2>
          <p className="mt-3 text-center text-xs text-[#7A7571] uppercase tracking-wider">
            Create owner profile & register your local business
          </p>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-700 text-xs p-4 rounded-xl">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="owner-name" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Owner Full Name
              </label>
              <input
                id="owner-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label htmlFor="restaurant-name" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Cafe / Restaurant Name
              </label>
              <input
                id="restaurant-name"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="mt-1.5 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="Cafe Central"
              />
            </div>
            <div>
              <label htmlFor="restaurant-slug" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Custom URL Slug <span className="text-[10px] text-slate-500 lowercase">(Optional)</span>
              </label>
              <input
                id="restaurant-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1.5 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="cafe-central"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Defaults to slugified cafe name (e.g. cafe-central)
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#5E6F58] hover:bg-[#4E5D49] focus:outline-none transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-[#7A7571]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#5E6F58] hover:text-[#4E5D49]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
