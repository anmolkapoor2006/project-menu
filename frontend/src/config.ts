export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://backend-six-coral-42.vercel.app' : 'http://localhost:5000');
