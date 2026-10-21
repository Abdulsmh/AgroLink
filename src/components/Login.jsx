
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

// Reusable AgroLink SVG logo from AdminLayout.jsx.
const AgroLinkLogo = ({ className = 'h-11 w-11' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="130 85 250 250"
    className={className}
    fill="currentColor"
    role="img"
    aria-label="AgroLink logo"
  >
    <path d="M170 150C195 112 275 98 347 148C300 188 215 192 170 150Z" />

    <path d="M160 165C148 232 185 300 240 324C256 272 246 230 214 192C196 177 178 169 160 165Z" />

    <path d="M358 172C372 240 330 306 268 324C258 272 270 230 300 196C320 185 340 178 358 172Z" />
  </svg>
);

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    userProfile,
    userRole,
    login,
    isLoading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRole = userRole || userProfile?.role || null;

  useEffect(() => {
    if (authLoading || !user || !currentRole) return;

    const requestedPath = location.state?.from;

    if (requestedPath && requestedPath !== '/login') {
      navigate(requestedPath, { replace: true });
      return;
    }

    if (currentRole === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (currentRole === 'aggregator') {
      navigate('/aggregator/dashboard', { replace: true });
    } else if (currentRole === 'producer') {
      navigate('/producer/dashboard', { replace: true });
    } else if (currentRole === 'buyer') {
      navigate('/buyer/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [
    authLoading,
    user,
    currentRole,
    navigate,
    location.state,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);

      toast.success('Login successful.');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error?.message || 'Unable to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-2">

        {/* Brand panel */}
        <section className="hidden flex-col justify-between bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-950 p-10 text-white lg:flex">
          <div>
            <Link
              to="/"
              aria-label="AgroLink homepage"
              className="inline-flex items-center gap-3 rounded-xl outline-none transition hover:opacity-90 focus:ring-2 focus:ring-emerald-400"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-950/20">
                <AgroLinkLogo className="h-11 w-11 text-white" />
              </span>

              <span className="text-2xl font-black tracking-tight">
                AgroLink
              </span>
            </Link>

            <div className="mt-24">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                Welcome back
              </p>

              <h1 className="max-w-md text-5xl font-black leading-tight">
                Connecting agriculture to opportunity.
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-emerald-100">
                Access your AgroLink account to manage products, track orders,
                and connect with the agricultural marketplace.
              </p>
            </div>
          </div>

          <p className="text-sm text-emerald-200">
            Grow better. Trade smarter. Connect through AgroLink.
          </p>
        </section>

        {/* Login form */}
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">

            <div className="mb-8 text-center lg:text-left">

              {/* Mobile AgroLink logo */}
              <Link
                to="/"
                aria-label="AgroLink homepage"
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20 outline-none transition hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-100 lg:mx-0"
              >
                <AgroLinkLogo className="h-11 w-11 text-white" />
              </Link>

              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Sign in
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your details to continue to your AgroLink account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </div>
              </div>
              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in to AgroLink'
                )}
              </button>
            </form>

            {/* Registration link */}
            <p className="mt-8 text-center text-sm text-slate-600">
              Do not have an account?{' '}
              <Link
                to="/register"
                className="font-black text-emerald-700 transition hover:text-emerald-800"
              >
                Create an account
              </Link>
            </p>

            {/* Homepage link */}
            <Link
              to="/"
              className="mt-5 block text-center text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
            >
              Return to homepage
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
