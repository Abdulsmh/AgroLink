import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Public pages
import { Home } from './pages/Home';
import { Login } from './components/Login';
import { Register } from './components/Register';
import  Catalog  from './pages/Catalog';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import PreHarvest from './pages/PreHarvest';
import PostHarvest from './pages/PostHarvest';
import ProductDetails from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import Checkout from './pages/Checkout';

// Buyer pages
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BuyerOrders from './pages/BuyerOrders';

// Public components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Producer layout
import { ProducerLayout } from './components/layouts/ProducerLayout';

// Producer pages
import { ProducerDashboard } from './pages/producer/ProducerDashboard';
import { ProducerListings } from './pages/producer/ProducerListings';
import { ProducerOrders } from './pages/producer/ProducerOrders';
import { ProducerLogistics } from './pages/producer/ProducerLogistics';
import { ProducerAnalytics } from './pages/producer/ProducerAnalytics';
import { ProducerEarnings } from './pages/producer/ProducerEarnings';
import { ProducerMessages } from './pages/producer/ProducerMessages';
import { ProducerCertificates } from './pages/producer/ProducerCertificates';
import { ProducerVerification } from './pages/producer/ProducerVerification';
import { ProducerProfile } from './pages/producer/ProducerProfile';

// Admin layout
import { AdminLayout } from './components/layouts/AdminLayout';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducerApprovals } from './pages/admin/AdminProducerApprovals';
import { AdminUserManagement } from './pages/admin/AdminUserManagement';
import { AdminAudits } from './pages/admin/AdminAudits';
import { AdminLogisticsHub } from './pages/admin/AdminLogisticsHub';
import { AdminMarketPricing } from './pages/admin/AdminMarketPricing';
import { AdminDisputes } from './pages/admin/AdminDisputes';
import { AdminSettings } from './pages/admin/AdminSettings';

const PublicLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 font-sans">
      <Navbar />

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
};

const PRODUCER_ROLES = ['producer', 'aggregator', 'agent'];

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '12px',
            },
          }}
        />

        {/* Automatically return every new page to the top */}
        <ScrollToTop />

        <Routes>
          {/* =========================
              PUBLIC ROUTES
          ========================== */}

          <Route
            path="/"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />

          <Route
            path="/catalog"
            element={
              <PublicLayout>
                <Catalog />
              </PublicLayout>
            }
          />

          <Route
            path="/about"
            element={
              <PublicLayout>
                <About />
              </PublicLayout>
            }
          />

          <Route
            path="/contact"
            element={
              <PublicLayout>
                <Contact />
              </PublicLayout>
            }
          />

          <Route
            path="/pre-harvest"
            element={
              <PublicLayout>
                <PreHarvest />
              </PublicLayout>
            }
          />

          <Route
            path="/post-harvest"
            element={
              <PublicLayout>
                <PostHarvest />
              </PublicLayout>
            }
          />

          {/* =========================
              PRODUCT / SHOPPING ROUTES
          ========================== */}

          <Route
            path="/product/:productId"
            element={
              <PublicLayout>
                <ProductDetails />
              </PublicLayout>
            }
          />

          <Route
            path="/cart"
            element={
              <PublicLayout>
                <Cart />
              </PublicLayout>
            }
          />

          {/* Checkout is restricted to authenticated buyers */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <PublicLayout>
                  <Checkout />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* =========================
              AUTH ROUTES
          ========================== */}

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />

          {/* =========================
              BUYER ROUTES
          ========================== */}

          <Route
            path="/buyer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <PublicLayout>
                  <BuyerDashboard />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/buyer/orders"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <PublicLayout>
                  <BuyerOrders />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/buyer"
            element={<Navigate to="/buyer/dashboard" replace />}
          />

          {/* =========================
              PRODUCER ROUTES
          ========================== */}

          <Route
            path="/producer"
            element={
              <ProtectedRoute allowedRoles={PRODUCER_ROLES}>
                <ProducerLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/producer/dashboard" replace />}
            />

            <Route
              path="dashboard"
              element={<ProducerDashboard />}
            />

            <Route
              path="listings"
              element={<ProducerListings />}
            />

            <Route
              path="orders"
              element={<ProducerOrders />}
            />

            <Route
              path="logistics"
              element={<ProducerLogistics />}
            />

            <Route
              path="analytics"
              element={<ProducerAnalytics />}
            />

            <Route
              path="earnings"
              element={<ProducerEarnings />}
            />

            <Route
              path="messages"
              element={<ProducerMessages />}
            />

            <Route
              path="certificates"
              element={<ProducerCertificates />}
            />

            <Route
              path="verification"
              element={<ProducerVerification />}
            />

            <Route
              path="profile"
              element={<ProducerProfile />}
            />
          </Route>

          {/* =========================
              ADMIN ROUTES
          ========================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/admin/dashboard" replace />}
            />

            <Route
              path="dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="approvals"
              element={<AdminProducerApprovals />}
            />

            <Route
              path="users"
              element={<AdminUserManagement />}
            />

            <Route
              path="audits"
              element={<AdminAudits />}
            />

            <Route
              path="logistics"
              element={<AdminLogisticsHub />}
            />

            <Route
              path="pricing"
              element={<AdminMarketPricing />}
            />

            <Route
              path="disputes"
              element={<AdminDisputes />}
            />

            <Route
              path="settings"
              element={<AdminSettings />}
            />
          </Route>

          {/* =========================
              FALLBACK ROUTE
          ========================== */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}