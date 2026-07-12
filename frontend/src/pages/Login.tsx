import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div>
          <h2 className="text-center text-4xl font-extrabold text-white tracking-tight">
            Menu<span className="text-indigo-400">QR</span>
          </h2>
          <p className="mt-3 text-center text-sm text-slate-400">
            Sign in to manage your multi-tenant digital menu
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-400">
            Want to register your cafe?{' '}
            <Link to="/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
