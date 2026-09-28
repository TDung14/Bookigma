import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, ChevronDown, Home, LogOut, Moon, MessageSquare,
  Gift, Repeat, Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Store,
  Sun, Trophy, User, Package, Zap,
} from 'lucide-react';
import { useApp, useAuth, useTheme } from '../../hooks/useStore';
import { timeAgo } from '../../lib/format';
import { resetAll } from '../../lib/storage';

const NAV_ITEMS = [
  { to: '/', label: 'Bảng tin', icon: Home, end: true },
  { to: '/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/blind-book', label: 'Blind Book', icon: Gift },
  { to: '/exchange', label: 'Trao đổi', icon: Repeat },
  { to: '/library', label: 'Góc đọc', icon: BookOpen },
  { to: '/rewards', label: 'Nhiệm vụ', icon: Zap },
  { to: '/recommend', label: 'Gợi ý', icon: Sparkles },
  { to: '/leaderboard', label: 'BXH', icon: Trophy },
];

/** Thanh dưới trên điện thoại chỉ đủ chỗ cho 5 mục quan trọng nhất. */
const MOBILE_NAV_ITEMS = ['/', '/shop', '/rewards', '/library', '/recommend'];

function Dropdown({ button, children, width = 300, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen((v) => !v)}>{button}</div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="card"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', [align]: 0, width,
            boxShadow: 'var(--shadow-lg)', padding: 8, zIndex: 1200, maxHeight: 420, overflowY: 'auto',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, isAdmin, isShop } = useAuth();
  const { getCart, unreadCount, notifications, markNotificationsRead, books } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const cartCount = user ? getCart(user.id).reduce((s, c) => s + c.qty, 0) : 0;
  const chatUnread = user ? unreadCount(user.id) : 0;
  const myNotifs = useMemo(
    () => notifications.filter((n) => n.userId === user?.id).slice(0, 8),
    [notifications, user]
  );
  const notifUnread = myNotifs.filter((n) => !n.read).length;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return books
      .filter((b) => b.status === 'active' && (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)))
      .slice(0, 5);
  }, [query, books]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  const hardReset = () => {
    if (window.confirm('Xóa toàn bộ dữ liệu demo và quay lại trạng thái ban đầu?')) {
      resetAll();
      window.location.reload();
    }
  };

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--nav-h)',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', zIndex: 1100,
      }}
    >
      <Link to="/" className="row" style={{ gap: 8, fontWeight: 800, fontSize: 20, color: 'var(--accent-green)', flexShrink: 0 }}>
        <BookOpen size={26} />
        <span className="hide-sm">Bookigma</span>
      </Link>

      {/* Tìm kiếm */}
      <form onSubmit={submitSearch} style={{ position: 'relative', flex: '0 1 230px' }} className="hide-sm">
        <Search size={17} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-sub)' }} />
        <input
          className="input"
          style={{ paddingLeft: 36, borderRadius: 20, height: 38 }}
          placeholder="Tìm sách, tác giả..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="card" style={{ position: 'absolute', top: 44, left: 0, right: 0, padding: 6, boxShadow: 'var(--shadow-lg)', zIndex: 1200 }}>
            {suggestions.map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} className="list-item" onClick={() => setQuery('')}>
                <img src={b.cover} alt="" className="book-cover" style={{ width: 30, height: 40 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="small truncate strong">{b.title}</div>
                  <div className="tiny muted truncate">{b.author}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </form>

      {/* Điều hướng chính */}
      <div className="row hide-lg" style={{ gap: 2, flex: 1, justifyContent: 'center' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 5, padding: '8px 9px', borderRadius: 8,
              fontSize: 13.5, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
              color: isActive ? 'var(--accent-green)' : 'var(--text-sub)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
            })}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="row" style={{ gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
        {user && user.role === 'user' && (
          <Link
            to="/rewards"
            className="badge badge-green hide-sm"
            style={{ gap: 5, padding: '5px 10px' }}
            title="Điểm Gigma của bạn"
          >
            <Zap size={13} /> {(user.points || 0).toLocaleString('vi-VN')}
          </Link>
        )}
        <IconWithBadge to="/chat" icon={MessageSquare} count={chatUnread} label="Tin nhắn" />
        <IconWithBadge to="/cart" icon={ShoppingCart} count={cartCount} label="Giỏ hàng" />

        <Dropdown
          width={320}
          button={
            <button className="btn-icon" style={{ position: 'relative' }} onClick={() => markNotificationsRead(user?.id)} aria-label="Thông báo">
              <Bell size={20} />
              {notifUnread > 0 && <Badge count={notifUnread} />}
            </button>
          }
        >
          <div className="strong small" style={{ padding: '6px 10px' }}>Thông báo</div>
          {myNotifs.length === 0 && <div className="small muted" style={{ padding: 12 }}>Chưa có thông báo nào.</div>}
          {myNotifs.map((n) => (
            <Link key={n.id} to={n.link} className="list-item" style={{ alignItems: 'flex-start' }}>
              <span className="dot" style={{ background: n.read ? 'transparent' : 'var(--accent-green)', marginTop: 6 }} />
              <div>
                <div className="small">{n.text}</div>
                <div className="tiny muted">{timeAgo(n.at)}</div>
              </div>
            </Link>
          ))}
        </Dropdown>

        <button className="btn-icon" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối">
          {isDark ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} />}
        </button>

        {user ? (
          <Dropdown
            width={250}
            button={
              <button className="btn-icon row" style={{ gap: 6, padding: 4 }}>
                <img src={user.avatar} alt="" className="avatar" style={{ width: 32, height: 32 }} />
                <ChevronDown size={15} />
              </button>
            }
          >
            <div style={{ padding: '8px 10px' }}>
              <div className="strong small">{user.name}</div>
              <div className="tiny muted">{user.email}</div>
              <div className="badge badge-green" style={{ marginTop: 6 }}>{user.badge}</div>
            </div>
            <hr className="divider" style={{ margin: '6px 0' }} />
            <MenuLink to="/profile" icon={User}>Trang cá nhân</MenuLink>
            <MenuLink to="/orders" icon={Package}>Đơn hàng của tôi</MenuLink>
            <MenuLink to="/library" icon={BookOpen}>Tủ sách & tiến trình đọc</MenuLink>
            <MenuLink to="/rewards" icon={Zap}>Nhiệm vụ & phần thưởng</MenuLink>
            {isShop && <MenuLink to="/shop-admin" icon={Store}>Kênh người bán</MenuLink>}
            {isAdmin && <MenuLink to="/admin" icon={ShieldCheck}>Quản trị hệ thống</MenuLink>}
            <hr className="divider" style={{ margin: '6px 0' }} />
            <button className="list-item small" onClick={hardReset}>
              <Settings size={16} /> Đặt lại dữ liệu demo
            </button>
            <button className="list-item small" style={{ color: 'var(--danger)' }} onClick={() => { logout(); navigate('/login'); }}>
              <LogOut size={16} /> Đăng xuất
            </button>
          </Dropdown>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">Đăng nhập</Link>
        )}
      </div>
    </nav>
  );
}

/** Thanh điều hướng dưới đáy, chỉ hiện trên màn hình hẹp (xem App.css). */
export function MobileNav() {
  return (
    <div className="mobile-nav">
      {NAV_ITEMS.filter((i) => MOBILE_NAV_ITEMS.includes(i.to)).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={19} />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  );
}

function MenuLink({ to, icon: Icon, children }) {
  return (
    <Link to={to} className="list-item small">
      <Icon size={16} /> {children}
    </Link>
  );
}

function Badge({ count }) {
  return (
    <span
      style={{
        position: 'absolute', top: 1, right: 1, minWidth: 17, height: 17, padding: '0 4px',
        borderRadius: 9, background: 'var(--danger)', color: '#fff', fontSize: 10,
        fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function IconWithBadge({ to, icon: Icon, count, label }) {
  return (
    <Link to={to} className="btn-icon" style={{ position: 'relative' }} aria-label={label}>
      <Icon size={20} />
      {count > 0 && <Badge count={count} />}
    </Link>
  );
}

