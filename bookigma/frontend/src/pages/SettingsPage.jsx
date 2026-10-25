import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Bell, BookOpen, Crown, LogOut, Minus, Moon, Palette, Plus,
  RotateCcw, Sparkles, Sun, Type, UserRound,
} from 'lucide-react';
import { avatarSrc } from '../lib/avatar';
import { dateOnly } from '../lib/format';
import { load, resetAll, save } from '../lib/storage';
import { useVip } from '../hooks/useVip';
import { useAuth, useTheme } from '../hooks/useStore';
import './settings.css';

const FONT_MIN = 14;
const FONT_MAX = 26;
const FONT_STEP = 2;

const READER_THEMES = [
  { id: 'bookshelf', label: 'Tủ sách gỗ', hint: 'Ấm áp, cổ điển', emoji: '🪵' },
  { id: 'sepia', label: 'Giấy ngả vàng', hint: 'Dịu mắt, thư giãn', emoji: '📜' },
  { id: 'midnight', label: 'Thư viện đêm', hint: 'Tối, tập trung', emoji: '🌙' },
  { id: 'clean', label: 'Hiện đại sáng', hint: 'Tối giản, rõ ràng', emoji: '⚪' },
];

const NOTIFICATION_ITEMS = [
  { id: 'readingReminder', label: 'Nhắc nhở đọc sách', hint: 'Nhắc bạn quay lại Góc đọc mỗi ngày.' },
  { id: 'orderUpdates', label: 'Cập nhật đơn hàng', hint: 'Thông báo khi đơn hàng đổi trạng thái.' },
  { id: 'promotions', label: 'Ưu đãi & khuyến mãi', hint: 'Nhận tin về gói VIP và ưu đãi mới.' },
];

const clampFont = (value) =>
  Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(Number(value) || 18)));

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { record, isVip, plan, daysLeft } = useVip(user.id);

  const [fontSize, setFontSize] = useState(() => clampFont(load('readerFontSize', 18)));
  const [readerTheme, setReaderTheme] = useState(() => load('readerTheme', 'bookshelf'));
  const [prefs, setPrefs] = useState(() => ({
    readingReminder: true,
    orderUpdates: true,
    promotions: false,
    ...load('preferences', {}),
  }));

  const changeFontSize = (delta) => {
    const next = clampFont(fontSize + delta);
    if (next === fontSize) return;
    setFontSize(next);
    save('readerFontSize', next);
  };

  const chooseReaderTheme = (themeId) => {
    setReaderTheme(themeId);
    save('readerTheme', themeId);
  };

  const togglePref = (id) => {
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    save('preferences', next);
  };

  const handleReset = () => {
    const ok = window.confirm(
      'Xoá toàn bộ dữ liệu demo trên trình duyệt này và quay lại trạng thái ban đầu? Bạn sẽ được đưa về trang đăng nhập.'
    );
    if (!ok) return;
    resetAll();
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const joinedAt = user.joinedAt ? dateOnly(new Date(user.joinedAt).getTime()) : '—';

  return (
    <div className="main-layout settings-page">
      <div className="page-head">
        <h1>Cài đặt</h1>
        <p>Quản lý tài khoản, không gian đọc và tư cách thành viên Bookigma của bạn.</p>
      </div>

      <div className="settings-layout">
        <div className="settings-main">
          <section className="card settings-card">
            <div className="settings-card-head">
              <span className="settings-icon"><Palette size={18} /></span>
              <div>
                <h2>Giao diện & trải nghiệm đọc</h2>
                <p>Điều chỉnh cách Bookigma hiển thị và mở trang sách.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="settings-row">
                <div className="settings-row-text">
                  <strong>Chế độ hiển thị</strong>
                  <p>Chuyển nhanh giữa nền sáng và nền tối cho toàn bộ trang web.</p>
                </div>
                <div className="settings-segment" role="group" aria-label="Chế độ hiển thị">
                  <button
                    type="button"
                    className={!isDark ? 'is-active' : ''}
                    onClick={() => isDark && toggleTheme()}
                  >
                    <Sun size={15} /> Sáng
                  </button>
                  <button
                    type="button"
                    className={isDark ? 'is-active' : ''}
                    onClick={() => !isDark && toggleTheme()}
                  >
                    <Moon size={15} /> Tối
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-text">
                  <strong>Cỡ chữ mặc định</strong>
                  <p>Áp dụng khi mở sách trong Góc đọc. Bạn vẫn chỉnh được ngay trong lúc đọc.</p>
                </div>
                <div className="settings-font-control">
                  <button
                    type="button"
                    aria-label="Giảm cỡ chữ"
                    onClick={() => changeFontSize(-FONT_STEP)}
                    disabled={fontSize <= FONT_MIN}
                  >
                    <Minus size={14} />
                  </button>
                  <span><Type size={14} /> {fontSize}px</span>
                  <button
                    type="button"
                    aria-label="Tăng cỡ chữ"
                    onClick={() => changeFontSize(FONT_STEP)}
                    disabled={fontSize >= FONT_MAX}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="settings-font-preview" style={{ fontSize }} aria-live="polite">
                Mỗi cuốn sách là một chuyến đi — hãy chọn cỡ chữ khiến bạn thấy dễ chịu nhất.
              </div>

              <div className="settings-row is-stacked">
                <div className="settings-row-text">
                  <strong>Phong cách trang đọc</strong>
                  <p>Màu nền và chất liệu mặc định của cuốn sách khi mở trong Góc đọc.</p>
                </div>
                <div className="settings-reader-themes">
                  {READER_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`settings-theme-card ${readerTheme === theme.id ? 'is-active' : ''}`}
                      onClick={() => chooseReaderTheme(theme.id)}
                      aria-pressed={readerTheme === theme.id}
                    >
                      <span aria-hidden="true">{theme.emoji}</span>
                      <strong>{theme.label}</strong>
                      <small>{theme.hint}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="card settings-card">
            <div className="settings-card-head">
              <span className="settings-icon"><UserRound size={18} /></span>
              <div>
                <h2>Tài khoản</h2>
                <p>Thông tin hiển thị và lối tắt đến hồ sơ cá nhân.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="settings-account">
                <img src={avatarSrc(user.avatar)} alt="" className="avatar settings-avatar" />
                <div className="settings-account-info">
                  <strong>{user.name}</strong>
                  <span>{[user.username ? `@${user.username}` : null, user.email].filter(Boolean).join(' · ')}</span>
                  <span className="badge badge-green">{user.badge}</span>
                </div>
                <Link to="/profile" className="btn btn-soft btn-sm">Chỉnh sửa hồ sơ</Link>
              </div>

              <div className="settings-meta-grid">
                <div>
                  <span>Ngày tham gia</span>
                  <strong>{joinedAt}</strong>
                </div>
                <div>
                  <span>Điểm Bookigma</span>
                  <strong>{(Number(user.points) || 0).toLocaleString('vi-VN')}</strong>
                </div>
                <div>
                  <span>Tư cách thành viên</span>
                  <strong className={isVip ? 'settings-meta-vip' : ''}>{isVip ? 'VIP' : 'Thành viên'}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="card settings-card">
            <div className="settings-card-head">
              <span className="settings-icon"><Bell size={18} /></span>
              <div>
                <h2>Thông báo</h2>
                <p>Chọn những loại thông báo bạn muốn nhận từ Bookigma.</p>
              </div>
            </div>

            <div className="settings-card-body">
              {NOTIFICATION_ITEMS.map((item) => (
                <div className="settings-row" key={item.id}>
                  <div className="settings-row-text">
                    <strong>{item.label}</strong>
                    <p>{item.hint}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(prefs[item.id])}
                    aria-label={item.label}
                    className={`settings-switch ${prefs[item.id] ? 'is-on' : ''}`}
                    onClick={() => togglePref(item.id)}
                  >
                    <span />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card settings-card settings-danger-card">
            <div className="settings-card-head">
              <span className="settings-icon settings-icon-danger"><RotateCcw size={18} /></span>
              <div>
                <h2>Dữ liệu & phiên đăng nhập</h2>
                <p>Thao tác trên dữ liệu lưu tại trình duyệt của bạn.</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="settings-row">
                <div className="settings-row-text">
                  <strong>Đặt lại dữ liệu demo</strong>
                  <p>Xoá giỏ hàng, tủ sách, tiến trình đọc, VIP và các tuỳ chọn trên thiết bị này.</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleReset}>
                  <RotateCcw size={15} /> Đặt lại
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text">
                  <strong>Đăng xuất</strong>
                  <p>Kết thúc phiên đăng nhập trên trình duyệt hiện tại.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={handleLogout}
                >
                  <LogOut size={15} /> Đăng xuất
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="settings-aside">
          <section className={`vip-mini ${isVip ? 'is-active' : 'is-inactive'}`}>
            <span className="vip-mini-eyebrow"><Crown size={14} /> Bookigma VIP</span>

            {isVip ? (
              <>
                <h2>{plan?.name || 'Thành viên VIP'}</h2>
                <p className="vip-mini-expiry">
                  Còn <strong>{daysLeft} ngày</strong> · hết hạn {dateOnly(record.expiresAt)}
                </p>

                <div className="vip-mini-chips">
                  <span><Sparkles size={12} /> +{record.extraShelves} tủ sách</span>
                  <span>Mở khoá toàn bộ nhạc</span>
                  {record.pointBonusPercent > 0 && <span>+{record.pointBonusPercent}% điểm</span>}
                  <span>1 ebook mỗi tuần</span>
                </div>

                <div className="vip-mini-counts">
                  <div>
                    <strong>{record.privileges?.bookDiscounts || 0}</strong>
                    <span>mã mua sách</span>
                  </div>
                  <div>
                    <strong>{record.privileges?.freeSwaps || 0}</strong>
                    <span>lượt trao đổi</span>
                  </div>
                  <div>
                    <strong>{record.privileges?.renewalCodes || 0}</strong>
                    <span>mã giảm 10%</span>
                  </div>
                </div>

                <Link to="/upgrade" className="btn btn-sm btn-block vip-mini-cta">
                  Gia hạn hoặc đổi gói <ArrowUpRight size={15} />
                </Link>
              </>
            ) : (
              <>
                <h2>Đọc nhiều hơn,<br />ưu đãi nhiều hơn</h2>
                <p className="vip-mini-lead">
                  {record
                    ? `Gói ${record.planName} của bạn đã hết hạn ngày ${dateOnly(record.expiresAt)}.`
                    : 'Nâng cấp VIP để mở khoá toàn bộ không gian đọc và các ưu đãi dành riêng cho bạn.'}
                </p>
                <ul className="vip-mini-perks">
                  <li>Mở khoá toàn bộ nhạc trong Góc đọc</li>
                  <li>Thêm tủ sách và 1 ebook mỗi tuần</li>
                  <li>Nhận điểm thưởng cùng mã giảm giá</li>
                </ul>
                <Link to="/upgrade" className="btn btn-primary btn-sm btn-block">
                  <Crown size={15} /> Xem 3 gói nâng cấp
                </Link>
              </>
            )}
          </section>

          <section className="card settings-tip">
            <span className="settings-icon"><BookOpen size={17} /></span>
            <h3>Mẹo nhỏ cho Góc đọc</h3>
            <p>Chuột phải vào một cuốn sách trên kệ để đọc ngay; giữ chuột phải để kéo sách sang chỗ khác.</p>
            <Link to="/library" className="link small">Mở tủ sách của bạn →</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
