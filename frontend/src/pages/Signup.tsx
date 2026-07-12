import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div>
          <h2 className="text-center text-4xl font-extrabold text-white tracking-tight">
            Register Cafe
          </h2>
          <p className="mt-3 text-center text-sm text-slate-400">
            Create your owner profile and register your cafe
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="owner-name" className="block text-sm font-medium text-slate-300">
                Owner Full Name
              </label>
              <input
                id="owner-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label htmlFor="restaurant-name" className="block text-sm font-medium text-slate-300">
                Cafe / Restaurant Name
              </label>
              <input
                id="restaurant-name"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="Cafe Central"
              />
            </div>
            <div>
              <label htmlFor="restaurant-slug" className="block text-sm font-medium text-slate-300">
                Custom URL Slug <span className="text-xs text-slate-500">(Optional)</span>
              </label>
              <input
                id="restaurant-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 block w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="cafe-central"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Defaults to slugified cafe name (e.g. cafe-central)
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
