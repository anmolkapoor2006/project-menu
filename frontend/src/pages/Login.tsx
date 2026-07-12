import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-[#EAE8E4] p-10 rounded-2xl shadow-[0_8px_30px_rgb(28,25,23,0.03)]">
        <div>
          <h2 className="text-center text-4xl font-normal text-[#1C1917] tracking-tight font-serif-display">
            Menu<span className="text-[#5E6F58] font-normal italic">QR</span>
          </h2>
          <p className="mt-3 text-center text-xs text-[#7A7571] uppercase tracking-wider">
            Sign in to manage your digital menu
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-700 text-xs p-4 rounded-xl">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 block w-full px-4 py-3 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full px-4 py-3 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#5E6F58] hover:bg-[#4E5D49] focus:outline-none transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-[#7A7571]">
            Want to register your cafe?{' '}
            <Link to="/signup" className="font-semibold text-[#5E6F58] hover:text-[#4E5D49]">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
