import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, ShieldCheck, Store, User as UserIcon } from 'lucide-react';
import { useApp, useAuth, useToast } from '../../hooks/useStore';

/** Tài khoản bấm-một-phát để demo nhanh từng vai trò trước hội đồng. */
const QUICK = [
  { id: 'u1', label: 'Độc giả', name: 'Trần Đức Anh', icon: UserIcon, desc: 'Mua sách, đọc, trao đổi, chat' },
  { id: 's1', label: 'Chủ shop', name: 'Fahasa Official', icon: Store, desc: 'Quản lý sản phẩm & đơn hàng' },
  { id: 'a1', label: 'Quản trị viên', name: 'Admin Bookigma', icon: ShieldCheck, desc: 'Dashboard, người dùng, báo cáo' },
];

export default function LoginPage() {
  const { login, loginAs } = useAuth();
  const { users } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [email, setEmail] = useState('user@bookigma.vn');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = login(email, password);
    if (!res.ok) return setError(res.error);
    setError('');
    toast(`Xin chào ${res.user.name}!`);
    navigate(res.user.role === 'admin' ? '/admin' : res.user.role === 'shop' ? '/shop-admin' : from);
  };

  const quickLogin = (id) => {
    const u = users.find((x) => x.id === id);
    loginAs(id);
    toast(`Đang dùng thử với vai trò: ${u.name}`);
    navigate(u.role === 'admin' ? '/admin' : u.role === 'shop' ? '/shop-admin' : '/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {/* Cột giới thiệu */}
      <div
        className="hide-lg"
        style={{
          background: 'linear-gradient(140deg, #16a34a 0%, #15803d 55%, #064e3b 100%)',
          color: '#fff', padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}
      >
        <div className="row" style={{ gap: 12, fontSize: 30, fontWeight: 800, marginBottom: 20 }}>
          <BookOpen size={38} /> Bookigma
        </div>
        <h2 style={{ color: '#fff', fontSize: 30, lineHeight: 1.25, margin: '0 0 14px', maxWidth: 460 }}>
          Nơi người yêu sách mua, đọc, trao đổi và kết nối với nhau
        </h2>
        <p style={{ opacity: 0.9, maxWidth: 460, lineHeight: 1.65, margin: '0 0 28px' }}>
          Một nền tảng duy nhất gộp mạng xã hội đọc sách, sàn thương mại sách chính hãng,
          sàn trao đổi sách cũ và trình đọc có trợ lý AI.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, maxWidth: 460 }}>
          {[
            'Mua sách từ NXB và nhà sách uy tín, theo dõi đơn hàng theo thời gian thực',
            'Trao đổi sách cũ miễn phí với độc giả cùng gu đọc',
            'Trình đọc lưu vị trí và phần trăm hoàn thành trên mọi thiết bị',
            'Trợ lý AI gợi ý sách dựa trên chính thói quen đọc của bạn',
          ].map((t) => (
            <li key={t} className="row" style={{ gap: 10, fontSize: 14.5, alignItems: 'flex-start' }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: '#bbf7d0', marginTop: 7, flexShrink: 0 }} />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Cột đăng nhập */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-primary)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 26 }}>Đăng nhập</h1>
          <p className="muted small" style={{ margin: '0 0 24px' }}>
            Đăng nhập để mua sách, lưu tiến trình đọc và trò chuyện với cộng đồng.
          </p>

          <form onSubmit={submit} className="card" style={{ padding: 20 }}>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="pw">Mật khẩu</label>
              <input id="pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="badge badge-red" style={{ display: 'flex', marginBottom: 12, padding: '8px 10px' }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              <LogIn size={17} /> Đăng nhập
            </button>

            <p className="tiny muted" style={{ textAlign: 'center', margin: '12px 0 0' }}>
              Tài khoản mẫu: <code>user@bookigma.vn</code> / <code>123456</code>
            </p>
          </form>

          <div className="row" style={{ margin: '22px 0 12px' }}>
            <hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--border-color)' }} />
            <span className="tiny muted">hoặc dùng thử nhanh theo vai trò</span>
            <hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--border-color)' }} />
          </div>

          <div className="stack" style={{ gap: 10 }}>
            {QUICK.map(({ id, label, name, icon: Icon, desc }) => (
              <button key={id} className="card card-hover row" style={{ padding: 12, cursor: 'pointer', textAlign: 'left', border: '1px solid var(--border-color)' }} onClick={() => quickLogin(id)}>
                <div className="stat-icon" style={{ background: 'var(--accent-soft)' }}>
                  <Icon size={18} color="var(--accent-green)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="strong small">{label} — {name}</div>
                  <div className="tiny muted">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
