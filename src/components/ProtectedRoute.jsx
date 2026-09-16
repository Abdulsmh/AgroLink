
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const {
    user,
    userRole,
    userProfile,
    isLoading,
  } = useAuth();

  // --------------------------------
  // Loading authentication state
  // --------------------------------
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

          <p className="text-sm font-semibold text-slate-600">
            Loading AgroLink Session...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------
  // User is not authenticated
  // --------------------------------
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // --------------------------------
  // Resolve current user role
  // --------------------------------
  const currentRole = userRole || userProfile?.role || null;

  // --------------------------------
  // Profile is missing
  // --------------------------------
  // Do not continue role checking when
  // the authenticated user has no profile.
  if (!userProfile || !currentRole) {
    return <Navigate to="/login" replace />;
  }

  // --------------------------------
  // Check allowed roles
  // --------------------------------
  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    // Admin
    if (currentRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    // Producer / Aggregator / Agent
    if (
      currentRole === 'producer' ||
      currentRole === 'aggregator' ||
      currentRole === 'agent'
    ) {
      return <Navigate to="/producer/dashboard" replace />;
    }

    // Buyer and other users
    return <Navigate to="/" replace />;
  }

  // --------------------------------
  // Render layout passed as children
  // --------------------------------
  if (children) {
    return children;
  }

  // --------------------------------
  // Support nested React Router routes
  // --------------------------------
  return <Outlet />;
};