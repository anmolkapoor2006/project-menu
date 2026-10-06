import React from 'react';
import { Navigate } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Guards the /admin/* routes using adminToken + adminUser keys in localStorage.
 * These are completely separate from the cafe-owner token/user keys,
 * so both sessions can coexist without collision.
 */
export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const token = localStorage.getItem('adminToken');
  const userJson = localStorage.getItem('adminUser');

  if (!token || !userJson) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role !== 'SUPER_ADMIN') {
      return <Navigate to="/admin/login" replace />;
    }
  } catch {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
