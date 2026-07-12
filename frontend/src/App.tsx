import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import PublicMenu from './pages/PublicMenu';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/menu/:slug" element={<PublicMenu />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['RESTAURANT_ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirect empty paths to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
