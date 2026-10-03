import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute: Enforces Authentication and Role-Based Access Control
 * Redirects unauthorized users to their designated role dashboard or login.
 */
export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-surface border border-app-border rounded-md px-5 py-3 shadow-none">
          <Loader2 className="w-5 h-5 text-teal-deep animate-spin" />
          <span className="text-sm font-medium text-navy-ink">Verifying credentials & clearance...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || !role) {
    let redirectPath = '/login';
    if (location.pathname.startsWith('/responder')) {
      redirectPath = '/responder/login';
    } else if (location.pathname.startsWith('/admin')) {
      redirectPath = '/admin/login';
    }
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Authenticated, but role is not allowed in this portal
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect user to their own home dashboard per Task 2 requirement
    const homeDashboards = {
      citizen: '/citizen/dashboard',
      responder: '/responder/dashboard',
      admin: '/admin/dashboard',
    };
    const destination = homeDashboards[role] || '/login';
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
