import React, { useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Sprout,
  Package,
  ShoppingCart,
  ClipboardList,
  Menu,
  X,
  LogOut,
  RefreshCw,
  CalendarDays,
  Leaf,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigation = [
  {
    label: 'Dashboard',
    to: '/buyer/dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Marketplace',
    to: '/buyer/catalog',
    icon: ShoppingBag,
  },
  {
    label: 'Pre-Harvest',
    to: '/buyer/pre-harvest',
    icon: Sprout,
  },
  {
    label: 'My Pre-harvest Bookings',
    to: '/buyer/bookings',
    icon: CalendarDays,
  },
  {
    label: 'Post-Harvest',
    to: '/buyer/post-harvest',
    icon: Package,
  },
  {
    label: 'My Cart',
    to: '/buyer/cart',
    icon: ShoppingCart,
  },
  {
    label: 'My Orders',
    to: '/buyer/orders',
    icon: ClipboardList,
  },
  {
    label: 'New Bulk Request',
    to: '/buyer/bulk-request',
    icon: ShoppingBag,
  },
  {
    label: 'Bulk Request History',
    to: '/buyer/bulk-requests',
    icon: RefreshCw,
  },
];

export default function BuyerLayout() {
  const { user, userProfile, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const displayName =
    userProfile?.full_name ||
    userProfile?.business_name ||
    user?.email?.split('@')[0] ||
    'Buyer';

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const statusStyles = {
    approved: 'bg-emerald-400',
    rejected: 'bg-red-400',
    pending: 'bg-amber-400',
  };

  const pageTitle =
    navigation.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname === item.to ||
          location.pathname.startsWith(`${item.to}/`)
    )?.label || 'Buyer Workspace';

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    closeMobileMenu();

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Buyer logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const renderNavigation = (mobile = false) =>
    navigation.map((item) => {
      const Icon = item.icon;

      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={mobile ? closeMobileMenu : undefined}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />

          <span className="min-w-0 flex-1 truncate">
            {item.label}
          </span>
        </NavLink>
      );
    });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* BUYER SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen w-72 shrink-0 flex-col
          bg-slate-950 text-white
          shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* BRAND */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <NavLink
            to="/"
            onClick={closeMobileMenu}
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
                Buyer Portal
              </p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BUYER ACCOUNT */}
        <div className="shrink-0 border-b border-slate-800 p-4">
          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Buyer Account
            </p>

            <div className="mt-3 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/20">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {user?.email || 'Buyer account'}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  statusStyles[verificationStatus] ||
                  statusStyles.pending
                }`}
              />
              <span className="text-[10px] font-semibold capitalize text-slate-400">
                Account: {verificationStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="buyer-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Buyer Workspace
          </p>

          <div className="space-y-1">
            {renderNavigation()}
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>
              {loggingOut ? 'Signing out...' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN BUYER AREA */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* MOBILE TOP BAR: KEEP MENU ACCESSIBLE */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none text-slate-900">
                {pageTitle}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                AgroLink Buyer Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileMenuOpen}
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* CLEAN PAGE CONTENT: NO DESKTOP HEADER OR FOOTER */}
        <main className="buyer-main-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <Outlet />
          </div>
        </main>
      </div>

      {/* HIDDEN SCROLLBAR STYLES */}
      <style>
        {`
          .buyer-sidebar-scrollbar,
          .buyer-main-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .buyer-sidebar-scrollbar::-webkit-scrollbar,
          .buyer-main-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
}
