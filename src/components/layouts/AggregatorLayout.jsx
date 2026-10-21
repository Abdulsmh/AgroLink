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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AggregatorLayout = () => {
  const { logout, userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    closeSidebar();

    try {
      await logout();
    } catch (error) {
      console.error('Aggregator logout error:', error);
    }
  };

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const statusStyles = {
    approved: 'bg-emerald-400',
    rejected: 'bg-red-400',
    pending: 'bg-amber-400',
  };

  const formattedStatus = verificationStatus.replace(/_/g, ' ');

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
          bg-slate-950 text-white
          shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:static
          lg:z-auto
          lg:w-64
          lg:translate-x-0
          lg:shadow-none
          ${
            isSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Aggregator Account
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white">
              {userProfile?.full_name || 'Aggregator'}
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">
              {userProfile?.business_name ||
                userProfile?.business_address ||
                'AgroLink Field Partner'}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  statusStyles[verificationStatus] ||
                  statusStyles.pending
                }`}
              />

              <span className="text-[10px] font-semibold capitalize text-slate-400">
                Verification: {formattedStatus}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="aggregator-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
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
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />

            <span>Logout</span>
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