import { useEffect } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { StoreDirectoryPage } from './pages/StoreDirectoryPage';
import { StoreDetailPage } from './pages/StoreDetailPage';
import { ReviewsDashboardPage } from './pages/ReviewsDashboardPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage, ErrorPage } from './pages/NotFoundPage';

import { AccountPage } from './pages/customer/AccountPage';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { OwnerStoreCreatePage } from './pages/owner/OwnerStoreCreatePage';
import { OwnerStoreEditorPage } from './pages/owner/OwnerStoreEditorPage';

import { AdminShell } from './pages/admin/AdminShell';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStoresPage } from './pages/admin/AdminStoresPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';

/** Resets scroll position whenever the route changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<LayoutRoute />} errorElement={<ErrorPage />}>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/stores" element={<StoreDirectoryPage />} />
              <Route path="/stores/:slug" element={<StoreDetailPage />} />
              <Route path="/reviews" element={<ReviewsDashboardPage />} />
              <Route path="/reviews/:id" element={<ReviewDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Customer */}
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />

              {/* Store owner */}
              <Route
                path="/owner"
                element={
                  <ProtectedRoute roles={['STORE_OWNER']}>
                    <OwnerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/stores/new"
                element={
                  <ProtectedRoute roles={['STORE_OWNER']}>
                    <OwnerStoreCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/stores/:id"
                element={
                  <ProtectedRoute roles={['STORE_OWNER']}>
                    <OwnerStoreEditorPage />
                  </ProtectedRoute>
                }
              />

              {/* Super admin */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['SUPER_ADMIN']}>
                    <AdminShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="stores" element={<AdminStoresPage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
