import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  producer: '/producer/dashboard',
  buyer: '/buyer/dashboard',
  aggregator: '/aggregator/dashboard',
};

const APPROVAL_REQUIRED_ROLES = ['producer', 'aggregator'];

export function ProtectedRoute({
  children,
  allowedRoles = [],
  requireApproved = false,
}) {
  const {
    user,
    userRole,
    userProfile,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const location = useLocation();

  // 1. Wait for authentication and profile restoration.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center text-center">
          <LoaderCircle
            size={38}
            className="animate-spin text-emerald-600"
            aria-hidden="true"
          />

          <p className="mt-4 font-semibold text-slate-800">
            Loading AgroLink session...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Please wait while we verify your access.
          </p>
        </div>
      </div>
    );
  }

  // 2. Authentication is required for protected routes.
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // 3. Stop if the authenticated account has no profile.
  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <AlertCircle
            size={38}
            className="text-amber-600"
            aria-hidden="true"
          />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Account profile unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            You are signed in, but AgroLink could not find your profile.
            Access to protected pages is paused until this is resolved.
            Please sign out and sign in again. If the problem continues,
            contact the AgroLink administrator.
          </p>

          <button
            type="button"
            onClick={() => window.location.assign('/login')}
            className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  const currentRole = userRole || userProfile.role;
  const roleHome = ROLE_HOME[currentRole] || '/';

  // 4. Verify that the user's role is allowed.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(currentRole)
  ) {
    return <Navigate to={roleHome} replace />;
  }

  // 5. Require approval only for explicitly gated operational routes.
  if (requireApproved) {
    // Only producers and aggregators use this approval gate.
    if (!APPROVAL_REQUIRED_ROLES.includes(currentRole)) {
      return <Navigate to={roleHome} replace />;
    }

    const verificationStatus =
      userProfile.verification_status || 'pending';

    if (verificationStatus !== 'approved') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
            <ShieldCheck
              size={40}
              className="text-amber-600"
              aria-hidden="true"
            />

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Approval required
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your account verification status is{' '}
              <strong className="capitalize">
                {verificationStatus}
              </strong>
              . This feature will be available after an administrator
              approves your account.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={roleHome}
                className="inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Go to dashboard
              </a>

              <a
                href="/"
                className="inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Return home
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  // 6. Support both nested layouts and routes with explicit children.
  return children ?? <Outlet />;
}

export default ProtectedRoute;
