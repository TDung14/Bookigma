import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  BookOpen, CheckCircle2, DollarSign, Eye, EyeOff, Flag, Lock, Package,
  ShieldCheck, Trash2, Unlock, Users, XCircle,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../../hooks/useStore';
import {
  compactNumber, currency, dateTime, ORDER_STATUS, REPORT_STATUS, REPORT_TYPE, timeAgo,
} from '../../lib/format';
import { EmptyState, Field, StatCard } from '../../components/common/ui';
import Modal from '../../components/common/Modal';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'reports', label: 'Báo cáo vi phạm' },
  { id: 'users', label: 'Người dùng' },
  { id: 'books', label: 'Sản phẩm' },
  { id: 'posts', label: 'Bài đăng' },
  { id: 'orders', label: 'Đơn hàng' },
];

const CHART_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#db2777'];

/** Mức hoa hồng trên mỗi giao dịch sách cũ P2P (báo cáo dự án: 2-5%). */
const P2P_COMMISSION_RATE = 0.05;

/**
 * Mốc thời gian cố định cho các biểu đồ theo ngày.
 * Lấy một lần lúc nạp module, không gọi Date.now() trong lúc render để kết quả
 * không đổi giữa các lần render lại.
 */
const CHART_ANCHOR = Date.now();

/** Dựng 14 ô ngày liên tiếp, gán 0 cho ngày chưa có dữ liệu. */
function buildDailyBuckets() {
  const map = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(CHART_ANCHOR - i * 86400000);
    map[d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })] = 0;
  }
  return map;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const {
    users, books, posts, orders, reports, shops, userById, bookById,
    setUserStatus, setBookStatus, deleteBook, setPostHidden, deletePost,
    resolveReport, pushNotification,
  } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [handling, setHandling] = useState(null);
  const [handleNote, setHandleNote] = useState('');
  const [reportFilter, setReportFilter] = useState('pending');

  // ---------- Số liệu tổng quan ----------
  const paidOrders = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);
  const gmv = paidOrders.reduce((s, o) => s + o.total, 0);

  // Theo mô hình doanh thu trong báo cáo dự án, Bookigma chỉ thu hoa hồng trên
  // giao dịch sách cũ giữa người dùng với nhau (P2P), mức 2-5% — không thu trên
  // đơn sách mới của nhà xuất bản. Doanh thu từ nhà xuất bản đến từ quảng cáo.
  const p2pCommission = Math.round(
    paidOrders.reduce((sum, o) => sum + (o.p2p ? o.total * P2P_COMMISSION_RATE : 0), 0)
  );
  const blindBoxRevenue = paidOrders.reduce(
    (sum, o) => sum + o.items.filter((i) => i.blind).reduce((x, i) => x + i.price * i.qty, 0),
    0
  );
  const pendingReports = reports.filter((r) => r.status === 'pending');
  const pendingBooks = books.filter((b) => b.status === 'pending');

  const revenueByDay = useMemo(() => {
    const map = buildDailyBuckets();
    paidOrders.forEach((o) => {
      const key = new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (key in map) map[key] += o.total;
    });
    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [paidOrders]);

  const ordersByStatus = useMemo(() => {
    const map = {};
    orders.forEach((o) => { map[ORDER_STATUS[o.status].label] = (map[ORDER_STATUS[o.status].label] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const revenueByShop = useMemo(
    () =>
      shops.map((s) => ({
        name: s.name,
        value: paidOrders.reduce(
          (sum, o) => sum + o.items.filter((i) => i.shopId === s.id).reduce((x, i) => x + i.price * i.qty, 0),
          0
        ),
      })),
    [shops, paidOrders]
  );

  // ---------- Xử lý báo cáo ----------
  const filteredReports = reports.filter((r) => reportFilter === 'all' || r.status === reportFilter);

  const openHandler = (report) => { setHandling(report); setHandleNote(''); };

  const finishReport = (status) => {
    resolveReport(handling.id, status, user.id, handleNote.trim() || (status === 'resolved' ? 'Đã xử lý theo quy định cộng đồng' : 'Báo cáo không đủ căn cứ'));
    pushNotification(handling.reporterId, `Báo cáo của bạn về "${handling.targetLabel}" đã được ${status === 'resolved' ? 'xử lý' : 'xem xét và từ chối'}.`, '/');
    toast(status === 'resolved' ? 'Đã đánh dấu báo cáo là đã xử lý.' : 'Đã từ chối báo cáo.', status === 'resolved' ? 'success' : 'info');
    setHandling(null);
  };

  /** Áp dụng ngay hành động xử phạt tương ứng với loại nội dung bị báo cáo. */
  const applyAction = (report) => {
    if (report.type === 'post') {
      setPostHidden(report.targetId, true);
      toast('Đã ẩn bài đăng vi phạm khỏi bảng tin.');
    } else if (report.type === 'user') {
      setUserStatus(report.targetId, 'suspended');
      toast('Đã khóa tài khoản người dùng.');
    } else if (report.type === 'book') {
      setBookStatus(report.targetId, 'hidden');
      toast('Đã gỡ sản phẩm khỏi cửa hàng.');
    } else {
      toast('Đã ghi nhận, cần xử lý thủ công với loại nội dung này.', 'info');
    }
  };

  return (
    <div className="main-layout wide">
      <div className="page-head">
        <h1 className="row" style={{ gap: 9 }}><ShieldCheck size={24} color="var(--accent-green)" /> Bảng điều khiển quản trị</h1>
        <p>Toàn cảnh hoạt động của nền tảng Bookigma</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', marginBottom: 20 }}>
        <StatCard icon={DollarSign} label="Tổng GMV" value={currency(gmv)} sub={`Blind Book: ${currency(blindBoxRevenue)} · P2P 5%: ${currency(p2pCommission)}`} />
        <StatCard icon={Users} label="Người dùng" value={users.length} sub={`${users.filter((u) => u.status === 'suspended').length} tài khoản bị khóa`} color="var(--info)" bg="var(--info-soft)" />
        <StatCard icon={Package} label="Đơn hàng" value={orders.length} sub={`${orders.filter((o) => o.status === 'pending').length} đơn chờ xác nhận`} color="var(--purple)" bg="var(--purple-soft)" />
        <StatCard icon={Flag} label="Báo cáo chờ xử lý" value={pendingReports.length} sub={`Tổng ${reports.length} báo cáo`} color="var(--danger)" bg="var(--danger-soft)" />
        <StatCard icon={BookOpen} label="Sản phẩm" value={books.length} sub={`${pendingBooks.length} chờ duyệt`} color="var(--warning)" bg="var(--warning-soft)" />
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'reports' && pendingReports.length > 0 && (
              <span className="badge badge-red" style={{ marginLeft: 6 }}>{pendingReports.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ---------- Tổng quan ---------- */}
      {tab === 'overview' && (
        <div className="stack">
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Doanh thu toàn sàn 14 ngày gần nhất</h3>
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-sub)" fontSize={12} />
                <YAxis stroke="var(--text-sub)" fontSize={12} tickFormatter={(v) => compactNumber(v)} />
                <Tooltip
                  formatter={(v) => currency(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)' }}
                />
                <Area type="monotone" dataKey="value" name="GMV" stroke="#16a34a" strokeWidth={2.5} fill="url(#gmv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Đơn hàng theo trạng thái</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78}>
                    {ordersByStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Doanh thu theo đối tác</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueByShop}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-sub)" fontSize={12} />
                  <YAxis stroke="var(--text-sub)" fontSize={11} tickFormatter={(v) => compactNumber(v)} />
                  <Tooltip
                    formatter={(v) => currency(v)}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)' }}
                  />
                  <Bar dataKey="value" name="Doanh thu" fill="#2563eb" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {pendingReports.length > 0 && (
            <div className="card">
              <h3 className="row" style={{ margin: '0 0 12px', fontSize: 16, gap: 8 }}>
                <Flag size={18} color="var(--danger)" /> Báo cáo cần xử lý gấp
              </h3>
              {pendingReports.slice(0, 4).map((r) => (
                <div key={r.id} className="row-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="small strong truncate">{r.targetLabel}</div>
                    <div className="tiny muted">{r.reason} · {timeAgo(r.createdAt)}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setTab('reports'); openHandler(r); }}>Xử lý ngay</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Báo cáo vi phạm ---------- */}
      {tab === 'reports' && (
        <div className="stack">
          <div className="card row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {['pending', 'resolved', 'rejected', 'all'].map((f) => (
              <button key={f} className={`btn btn-sm ${reportFilter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setReportFilter(f)}>
                {f === 'all' ? 'Tất cả' : REPORT_STATUS[f].label} ({f === 'all' ? reports.length : reports.filter((r) => r.status === f).length})
              </button>
            ))}
          </div>

          {filteredReports.length === 0 ? (
            <div className="card"><EmptyState icon={CheckCircle2} title="Không có báo cáo nào ở mục này" hint="Hàng chờ đang sạch." /></div>
          ) : (
            filteredReports.map((r) => {
              const reporter = userById(r.reporterId);
              const st = REPORT_STATUS[r.status];
              return (
                <div key={r.id} className="card">
                  <div className="row-between" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-purple">{REPORT_TYPE[r.type]}</span>
                      <span className="strong small">{r.targetLabel}</span>
                    </div>
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                  </div>

                  <div className="small" style={{ background: 'var(--bg-soft)', padding: 12, borderRadius: 9, marginBottom: 12 }}>
                    <div className="strong" style={{ color: 'var(--danger)', marginBottom: 4 }}>Lý do: {r.reason}</div>
                    {r.detail && <div className="muted">{r.detail}</div>}
                  </div>

                  <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div className="row tiny muted" style={{ gap: 8 }}>
                      <img src={reporter?.avatar} alt="" className="avatar" style={{ width: 22, height: 22 }} />
                      Báo cáo bởi <b>{reporter?.name}</b> · {dateTime(r.createdAt)}
                    </div>

                    {r.status === 'pending' ? (
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => applyAction(r)}>
                          {r.type === 'post' ? 'Ẩn bài đăng' : r.type === 'user' ? 'Khóa tài khoản' : r.type === 'book' ? 'Gỡ sản phẩm' : 'Ghi nhận'}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => openHandler(r)}>Kết luận xử lý</button>
                      </div>
                    ) : (
                      <div className="tiny muted" style={{ textAlign: 'right', maxWidth: 380 }}>
                        Xử lý bởi <b>{userById(r.handledBy)?.name || 'Admin'}</b>: {r.handledNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ---------- Người dùng ---------- */}
      {tab === 'users' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Người dùng</th><th>Vai trò</th><th>Tham gia</th><th>Điểm</th><th>Đơn hàng</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userOrders = orders.filter((o) => o.userId === u.id);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <img src={u.avatar} alt="" className="avatar" style={{ width: 34, height: 34 }} />
                        <div style={{ minWidth: 0 }}>
                          <div className="small strong truncate">{u.name}</div>
                          <div className="tiny muted truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'shop' ? 'badge-blue' : ''}`}>
                        {u.role === 'admin' ? 'Quản trị' : u.role === 'shop' ? 'Chủ shop' : 'Độc giả'}
                      </span>
                    </td>
                    <td className="small muted">{u.joinedAt}</td>
                    <td className="small">{u.points.toLocaleString('vi-VN')}</td>
                    <td className="small">{userOrders.length}</td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                        {u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td>
                      {u.id !== user.id && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: u.status === 'active' ? 'var(--danger)' : 'var(--accent-green)' }}
                          onClick={() => {
                            const next = u.status === 'active' ? 'suspended' : 'active';
                            setUserStatus(u.id, next);
                            toast(next === 'suspended' ? `Đã khóa tài khoản ${u.name}.` : `Đã mở khóa ${u.name}.`);
                          }}
                        >
                          {u.status === 'active' ? <><Lock size={14} /> Khóa</> : <><Unlock size={14} /> Mở khóa</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Sản phẩm ---------- */}
      {tab === 'books' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Sản phẩm</th><th>Shop</th><th>Giá</th><th>Đã bán</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/book/${b.id}`} className="row">
                      <img src={b.cover} alt="" className="book-cover" style={{ width: 32, height: 44 }} />
                      <div style={{ minWidth: 0, maxWidth: 240 }}>
                        <div className="small strong truncate">{b.title}</div>
                        <div className="tiny muted truncate">{b.author} · {b.category}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="small">{shops.find((s) => s.id === b.shopId)?.name}</td>
                  <td className="small price">{currency(b.price)}</td>
                  <td className="small">{b.sold.toLocaleString('vi-VN')}</td>
                  <td>
                    <span className={`badge ${b.status === 'active' ? 'badge-green' : b.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>
                      {b.status === 'active' ? 'Đang bán' : b.status === 'pending' ? 'Chờ duyệt' : 'Đã gỡ'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {b.status === 'pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => { setBookStatus(b.id, 'active'); toast(`Đã duyệt "${b.title}".`); }}>
                          <CheckCircle2 size={14} /> Duyệt
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const next = b.status === 'hidden' ? 'active' : 'hidden';
                          setBookStatus(b.id, next);
                          toast(next === 'hidden' ? 'Đã gỡ sản phẩm.' : 'Đã hiển thị lại sản phẩm.');
                        }}
                      >
                        {b.status === 'hidden' ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => { if (window.confirm(`Xóa vĩnh viễn "${b.title}"?`)) { deleteBook(b.id); toast('Đã xóa sản phẩm.', 'info'); } }}
                        aria-label="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Bài đăng ---------- */}
      {tab === 'posts' && (
        <div className="stack">
          {posts.map((p) => {
            const author = userById(p.authorId);
            const reportCount = reports.filter((r) => r.type === 'post' && r.targetId === p.id).length;
            return (
              <div key={p.id} className="card">
                <div className="row-between" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div className="row">
                    <img src={author?.avatar} alt="" className="avatar" style={{ width: 34, height: 34 }} />
                    <div>
                      <div className="small strong">{author?.name}</div>
                      <div className="tiny muted">{timeAgo(p.time)}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {reportCount > 0 && <span className="badge badge-red">{reportCount} báo cáo</span>}
                    {p.hidden && <span className="badge badge-red">Đã ẩn</span>}
                  </div>
                </div>

                <p className="small clamp-3" style={{ margin: '0 0 12px' }}>{p.content}</p>

                <div className="row-between" style={{ paddingTop: 10, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8 }}>
                  <span className="tiny muted">{p.likedBy.length} thích · {p.comments.length} bình luận</span>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setPostHidden(p.id, !p.hidden); toast(p.hidden ? 'Đã hiện lại bài đăng.' : 'Đã ẩn bài đăng.'); }}
                    >
                      {p.hidden ? <><Eye size={14} /> Hiện lại</> : <><EyeOff size={14} /> Ẩn bài</>}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => { if (window.confirm('Xóa vĩnh viễn bài đăng này?')) { deletePost(p.id); toast('Đã xóa bài đăng.', 'info'); } }}
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Đơn hàng ---------- */}
      {tab === 'orders' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Doanh thu Bookigma</th><th>Thanh toán</th><th>Trạng thái</th><th>Thời gian</th></tr>
            </thead>
            <tbody>
              {[...orders].sort((a, b) => b.createdAt - a.createdAt).map((o) => (
                <tr key={o.id}>
                  <td className="small strong">{o.code}</td>
                  <td className="small">{userById(o.userId)?.name}</td>
                  <td className="small truncate" style={{ maxWidth: 220 }}>
                    {o.items.map((i) => `${bookById(i.bookId)?.title || i.title} ×${i.qty}`).join(', ')}
                  </td>
                  <td className="small price">{currency(o.total)}</td>
                  <td className="small">
                    {o.status === 'cancelled'
                      ? '—'
                      : currency(
                          o.items.filter((i) => i.blind).reduce((x, i) => x + i.price * i.qty, 0) +
                            (o.p2p ? o.total * P2P_COMMISSION_RATE : 0)
                        )}
                  </td>
                  <td className="small muted">{o.payment.toUpperCase()}</td>
                  <td><span className={`badge ${ORDER_STATUS[o.status].badge}`}>{ORDER_STATUS[o.status].label}</span></td>
                  <td className="tiny muted">{dateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Hộp thoại kết luận báo cáo */}
      <Modal
        open={!!handling}
        onClose={() => setHandling(null)}
        title="Kết luận xử lý báo cáo"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => finishReport('rejected')}>
              <XCircle size={16} /> Từ chối báo cáo
            </button>
            <button className="btn btn-primary" onClick={() => finishReport('resolved')}>
              <CheckCircle2 size={16} /> Xác nhận đã xử lý
            </button>
          </>
        }
      >
        <div className="small" style={{ background: 'var(--bg-soft)', padding: 12, borderRadius: 9, marginBottom: 14 }}>
          <div className="strong">{handling?.targetLabel}</div>
          <div className="muted" style={{ marginTop: 4 }}>Lý do: {handling?.reason}</div>
          {handling?.detail && <div className="muted tiny" style={{ marginTop: 4 }}>{handling.detail}</div>}
        </div>
        <Field label="Ghi chú xử lý (gửi tới người báo cáo)" style={{ marginBottom: 0 }}>
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              value={handleNote}
              onChange={(e) => setHandleNote(e.target.value)}
              placeholder="Ví dụ: Đã ẩn bài đăng và cảnh cáo tài khoản vi phạm lần 1."
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
