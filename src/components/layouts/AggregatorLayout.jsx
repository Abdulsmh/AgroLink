import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ClipboardList,
  CalendarDays,
  ClipboardCheck,
  Sprout,
  UserRound,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  approved: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    label: 'Approved',
  },
  rejected: {
    dot: 'bg-red-400',
    text: 'text-red-300',
    label: 'Rejected',
  },
  pending: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    label: 'Pending',
  },
};

const getDisplayName = (profile) => {
  const name = profile?.full_name?.trim();
  return name || 'Aggregator';
};

const getBusinessLabel = (profile) => {
  return (
    profile?.business_name?.trim() ||
    profile?.business_address?.trim() ||
    'AgroLink Field Partner'
  );
};

export const AggregatorLayout = () => {
  const { logout, userProfile, isLoading } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigation = [
    {
      name: 'Aggregator Dashboard',
      path: '/aggregator/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'My Farmers',
      path: '/aggregator/farmers',
      icon: Users,
    },
    {
      name: 'Managed Listings',
      path: '/aggregator/listings',
      icon: Package,
    },
    {
      name: 'Orders',
      path: '/aggregator/orders',
      icon: ShoppingCart,
    },
    {
      name: 'Bulk Requests',
      path: '/aggregator/bulk-requests',
      icon: ClipboardCheck,
    },
    {
      name: 'Pre-harvest Bookings',
      path: '/aggregator/bookings',
      icon: CalendarDays,
    },
    {
      name: 'Farmer Records',
      path: '/aggregator/farmer-records',
      icon: ClipboardList,
    },
    {
      name: 'Verification & Profile',
      path: '/aggregator/profile',
      icon: ShieldCheck,
    },
  ];

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    closeSidebar();
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error('Aggregator logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const verificationStatus = String(
    userProfile?.verification_status || 'pending'
  )
    .toLowerCase()
    .replace(/\s+/g, '_');

  const status =
    STATUS_STYLES[verificationStatus] || STATUS_STYLES.pending;

  const displayName = getDisplayName(userProfile);
  const businessLabel = getBusinessLabel(userProfile);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans">
      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* AGGREGATOR SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen w-72 shrink-0 flex-col
          bg-slate-950 text-white shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* BRAND */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <NavLink
            to="/"
            onClick={closeSidebar}
            aria-label="Go to AgroLink homepage"
            className="group flex items-center gap-3 rounded-xl outline-none transition hover:opacity-90 focus:ring-2 focus:ring-emerald-400"
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20 transition duration-300 group-hover:rotate-6 group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="130 85 250 250"
                className="h-9 w-9 text-white"
                fill="currentColor"
                role="img"
                aria-label="AgroLink logo"
              >
                <path d="M170 150C195 112 275 98 347 148C300 188 215 192 170 150Z" />
                <path d="M160 165C148 232 185 300 240 324C256 272 246 230 214 192C196 177 178 169 160 165Z" />
                <path d="M358 172C372 240 330 306 268 324C258 272 270 230 300 196C320 185 340 178 358 172Z" />
              </svg>
            </div>

            <div>
              <h1 className="text-base font-bold text-white">
                AgroLink
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Aggregator Portal
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AGGREGATOR PROFILE */}
        <div className="shrink-0 border-b border-slate-800 p-4">
          <div className="rounded-xl bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
                <UserRound
                  className="h-5 w-5 text-emerald-400"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {isLoading && !userProfile
                    ? 'Loading profile...'
                    : displayName}
                </p>

                <p className="mt-1 truncate text-xs text-slate-400">
                  {businessLabel}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`}
                aria-hidden="true"
              />

              <span className={`text-[10px] font-semibold ${status.text}`}>
                Verification: {status.label}
              </span>
            </div>

            <NavLink
              to="/aggregator/profile"
              onClick={closeSidebar}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              View profile
            </NavLink>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav
          aria-label="Aggregator navigation"
          className="aggregator-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
        >
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Aggregator Workspace
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN AGGREGATOR AREA */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* MOBILE TOP BAR */}
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
          <NavLink
            to="/"
            onClick={closeSidebar}
            aria-label="Go to AgroLink homepage"
            className="flex items-center gap-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Sprout className="h-4 w-4 text-white" />
            </div>

            <div>
              <p className="text-sm font-bold leading-none text-slate-900">
                AgroLink
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                Aggregator Portal
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isSidebarOpen}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="aggregator-main-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* HIDDEN SCROLLBAR STYLES */}
      <style>
        {`
          .aggregator-sidebar-scrollbar,
          .aggregator-main-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .aggregator-sidebar-scrollbar::-webkit-scrollbar,
          .aggregator-main-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
};

export default AggregatorLayout;
