import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('SUPER_ADMIN' | 'RESTAURANT_ADMIN')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (!token || !userJson) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userJson);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'SUPER_ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
