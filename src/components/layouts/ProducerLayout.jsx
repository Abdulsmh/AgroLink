import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  DollarSign,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  User,
  LogOut,
  Warehouse,
  FileCheck,
  Menu,
  X,
  Sprout,
  Users,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';

export const ProducerLayout = () => {
  const { logout, user, userProfile } = useAuth();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingAggregatorRequests, setPendingAggregatorRequests] =
    useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const isApprovedProducer =
    userProfile?.role === 'producer' &&
    userProfile?.verification_status === 'approved';

  const loadPendingAggregatorRequests = useCallback(async () => {
    if (!user?.id || !isApprovedProducer) {
      setPendingAggregatorRequests(0);
      return;
    }

    setLoadingRequests(true);

    try {
      const { data, error } = await supabase.rpc(
        'list_farmer_aggregator_relationships'
      );

      if (error) throw error;

      const pendingCount = (
        Array.isArray(data) ? data : []
      ).filter(
        (relationship) => relationship.status === 'pending'
      ).length;

      setPendingAggregatorRequests(pendingCount);
    } catch (error) {
      console.error(
        'Unable to load pending aggregator request count:',
        error
      );
    } finally {
      setLoadingRequests(false);
    }
  }, [user?.id, isApprovedProducer]);

  useEffect(() => {
    loadPendingAggregatorRequests();
  }, [loadPendingAggregatorRequests, location.pathname]);

  const navigation = [
    {
      name: 'Dashboard',
      path: '/producer/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Inventory & Listings',
      path: '/producer/listings',
      icon: Package,
    },
    {
      name: 'Orders & Fulfillment',
      path: '/producer/orders',
      icon: Truck,
    },
    {
      name: 'Pre-harvest Bookings',
      path: '/producer/bookings',
      icon: CalendarDays,
      description: 'Review and respond to pre-harvest booking requests',
    },
    {
      name: 'Aggregator Requests',
      path: '/producer/aggregator-requests',
      icon: Users,
      badge: pendingAggregatorRequests,
      description: 'Manage aggregator connections',
    },
    {
      name: 'Logistics & Haulage',
      path: '/producer/logistics',
      icon: Warehouse,
    },
    {
      name: 'Analytics & Yield',
      path: '/producer/analytics',
      icon: BarChart3,
    },
    {
      name: 'Earnings & Payouts',
      path: '/producer/earnings',
      icon: DollarSign,
    },
    {
      name: 'Messages & Inquiries',
      path: '/producer/messages',
      icon: MessageSquare,
    },
    {
      name: 'Certificates & Vault',
      path: '/producer/certificates',
      icon: FileCheck,
    },
    {
      name: 'Verification Status',
      path: '/producer/verification',
      icon: ShieldCheck,
    },
    {
      name: 'Profile Settings',
      path: '/producer/profile',
      icon: User,
    },
  ];

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Producer logout error:', error);
    }
  };

  const renderNavigation = () => (
    <nav
      className="producer-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
      aria-label="Producer navigation"
    >
      <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
        Producer Workspace
      </p>

      <div className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              title={item.description || item.name}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-emerald-100 hover:bg-emerald-900/80 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />

              <span className="min-w-0 flex-1 truncate">
                {item.name}
              </span>

              {item.path === '/producer/aggregator-requests' &&
                loadingRequests && (
                  <RefreshCw
                    className="h-3.5 w-3.5 shrink-0 animate-spin opacity-70"
                    aria-label="Refreshing requests"
                  />
                )}

              {item.badge > 0 && (
                <span
                  className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-emerald-950"
                  aria-label={`${item.badge} pending aggregator requests`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col bg-emerald-950 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-72 lg:translate-x-0 lg:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-emerald-900 px-5">
          <NavLink
            to="/"
            onClick={closeSidebar}
            aria-label="Go to AgroLink homepage"
            className="flex items-center gap-3 rounded-xl outline-none transition hover:opacity-90 focus:ring-2 focus:ring-emerald-400"
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
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
                Producer Portal
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-300 transition hover:bg-emerald-900 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Producer information */}
        <div className="shrink-0 border-b border-emerald-900 p-4">
          <div className="rounded-xl bg-emerald-900/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Producer Account
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white">
              {userProfile?.full_name || 'Producer'}
            </p>

            <p className="mt-1 truncate text-xs text-emerald-200">
              {userProfile?.farm_name ||
                userProfile?.business_name ||
                'AgroLink Producer'}
            </p>

            {userProfile?.verification_status && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    userProfile.verification_status === 'approved'
                      ? 'bg-emerald-400'
                      : userProfile.verification_status === 'rejected'
                        ? 'bg-red-400'
                        : 'bg-amber-400'
                  }`}
                />

                <span className="text-[10px] font-semibold capitalize text-emerald-200">
                  {userProfile.verification_status.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {renderNavigation()}

        {/* Logout */}
        <div className="shrink-0 border-t border-emerald-900 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main application area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
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
                Producer Portal
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

        {/* Page content */}
        <main className="producer-main-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Hide scrollbars without disabling scrolling */}
      <style>
        {`
          .producer-sidebar-scrollbar,
          .producer-main-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .producer-sidebar-scrollbar::-webkit-scrollbar,
          .producer-main-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
};

export default ProducerLayout;