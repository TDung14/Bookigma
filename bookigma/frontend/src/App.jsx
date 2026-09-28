import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';

import { ThemeProvider } from './context/ThemeProvider';
import { AppProvider } from './context/AppProvider';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';
import { useAuth } from './hooks/useStore';

import Navbar, { MobileNav } from './components/layout/Navbar';

import FeedPage from './pages/FeedPage';
import ShopPage from './pages/ShopPage';
import BookDetailPage from './pages/BookDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ExchangePage from './pages/ExchangePage';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';
import RecommendationPage from './pages/RecommendationPage';
import RewardsPage from './pages/RewardsPage';
import BlindBookPage from './pages/BlindBookPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ShopDashboard from './pages/shop/ShopDashboard';

/** Cuộn lên đầu trang mỗi khi đổi route — trừ trang chat vốn có vùng cuộn riêng. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.startsWith('/chat')) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Bạn không có quyền truy cập khu vực này</h3>
          <p className="small">
            Trang này chỉ dành cho tài khoản {role === 'admin' ? 'quản trị viên' : 'chủ shop'}.
            Hãy đăng nhập bằng tài khoản phù hợp ở trang đăng nhập.
          </p>
        </div>
      </div>
    );
  }
  return children;
}

function Shell() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) return <LoginPage />;

  return (
    <div className="app-container">
      <Navbar />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/exchange" element={<ExchangePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/recommend" element={<RecommendationPage />} />
        <Route path="/blind-book" element={<BlindBookPage />} />

        <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="/order-success/:id" element={<RequireAuth><OrderSuccessPage /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
        <Route path="/library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="/rewards" element={<RequireAuth><RewardsPage /></RequireAuth>} />
        <Route path="/read/:bookId" element={<RequireAuth><ReaderPage /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
        <Route path="/chat/:convId" element={<RequireAuth><ChatPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        <Route path="/shop-admin/*" element={<RequireAuth role="shop"><ShopDashboard /></RequireAuth>} />
        <Route path="/admin/*" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <AuthProvider>
            <ToastProvider>
              <ScrollToTop />
              <Shell />
            </ToastProvider>
          </AuthProvider>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
