import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';

// Route-level code splitting
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PublicMenu = lazy(() => import('./pages/PublicMenu'));

function PageFallback() {
  return (
    <div className="min-h-screen bg-[var(--cream,#F5F0E8)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[var(--sage,#3D5A47)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-[var(--muted,#8A7968)] tracking-wide">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/menu/:slug" element={<PublicMenu />} />
          
          {/* Cafe owner dashboard — protected by regular token/user */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['RESTAURANT_ADMIN']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin dashboard — protected by adminToken/adminUser (separate session) */}
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            } 
          />
          
          {/* Redirect empty paths to cafe login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

