import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, DollarSign, Edit3, Package, Plus, ShoppingBag, Store, Trash2, TrendingUp,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../../hooks/useStore';
import { compactNumber, currency, dateTime, ORDER_STATUS } from '../../lib/format';
import { EmptyState, Field, StatCard } from '../../components/common/ui';
import Modal from '../../components/common/Modal';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'products', label: 'Sản phẩm' },
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'revenue', label: 'Doanh thu' },
];

const CHART_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#db2777'];

/** Mốc thời gian cố định cho biểu đồ, lấy một lần lúc nạp module (xem AdminDashboard). */
const CHART_ANCHOR = Date.now();

function buildDailyBuckets() {
  const map = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(CHART_ANCHOR - i * 86400000);
    map[d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })] = 0;
  }
  return map;
}

const EMPTY_FORM = {
  title: '', author: '', price: '', originalPrice: '', stock: '', category: 'Truyền cảm hứng',
  cover: '', description: '', pages: '', tags: '',
};

export default function ShopDashboard() {
  const { user } = useAuth();
  const {
    books, orders, shops, categories, upsertBook, deleteBook, updateOrderStatus, pushNotification,
  } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const shop = shops.find((s) => s.id === user.shopId);
  const myBooks = useMemo(() => books.filter((b) => b.shopId === user.shopId), [books, user.shopId]);

  // Đơn hàng chỉ giữ lại phần sản phẩm thuộc shop này.
  const myOrders = useMemo(
    () =>
      orders
        .map((o) => ({ ...o, items: o.items.filter((i) => i.shopId === user.shopId) }))
        .filter((o) => o.items.length > 0)
        .sort((a, b) => b.createdAt - a.createdAt),
    [orders, user.shopId]
  );

  const paidOrders = useMemo(() => myOrders.filter((o) => o.status !== 'cancelled'), [myOrders]);
  const revenue = paidOrders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.price * i.qty, 0), 0);
  const unitsSold = paidOrders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.qty, 0), 0);
  const pendingCount = myOrders.filter((o) => o.status === 'pending').length;
  const lowStock = myBooks.filter((b) => b.stock > 0 && b.stock < 60);

  const revenueByDay = useMemo(() => {
    const map = buildDailyBuckets();
    paidOrders.forEach((o) => {
      const key = new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (key in map) map[key] += o.items.reduce((x, i) => x + i.price * i.qty, 0);
    });
    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [paidOrders]);

  const topProducts = useMemo(
    () => [...myBooks].sort((a, b) => b.sold * b.price - a.sold * a.price).slice(0, 6)
      .map((b) => ({ name: b.title.length > 18 ? b.title.slice(0, 18) + '…' : b.title, value: b.sold * b.price })),
    [myBooks]
  );

  const byCategory = useMemo(() => {
    const map = {};
    myBooks.forEach((b) => { map[b.category] = (map[b.category] || 0) + b.sold; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [myBooks]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditing('new'); };

  const openEdit = (book) => {
    setForm({
      title: book.title, author: book.author, price: String(book.price),
      originalPrice: String(book.originalPrice || book.price), stock: String(book.stock),
      category: book.category, cover: book.cover, description: book.description,
      pages: String(book.pages || ''), tags: (book.tags || []).join(', '),
    });
    setEditing(book.id);
  };

  const saveProduct = () => {
    if (!form.title.trim() || !form.author.trim()) return toast('Hãy nhập tên sách và tác giả.', 'error');
    const price = Number(form.price);
    if (!price || price <= 0) return toast('Giá bán phải là số lớn hơn 0.', 'error');

    upsertBook({
      id: editing === 'new' ? undefined : editing,
      title: form.title.trim(),
      author: form.author.trim(),
      price,
      originalPrice: Number(form.originalPrice) || price,
      stock: Number(form.stock) || 0,
      category: form.category,
      cover: form.cover.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
      description: form.description.trim(),
      pages: Number(form.pages) || 200,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      shopId: user.shopId,
      status: editing === 'new' ? 'pending' : undefined,
    });
    toast(editing === 'new' ? 'Đã tạo sản phẩm, đang chờ quản trị viên duyệt.' : 'Đã cập nhật sản phẩm.');
    setEditing(null);
  };

  const advanceOrder = (order, next, note) => {
    updateOrderStatus(order.id, next, note);
    pushNotification(order.userId, `Đơn hàng ${order.code}: ${ORDER_STATUS[next].label.toLowerCase()}.`, `/orders/${order.id}`);
    toast(`Đơn ${order.code} → ${ORDER_STATUS[next].label}`);
  };

  return (
    <div className="main-layout wide">
      <div className="page-head row-between" style={{ flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 14 }}>
          <img src={shop?.avatar} alt="" className="avatar" style={{ width: 52, height: 52 }} />
          <div>
            <h1 className="row" style={{ gap: 8 }}><Store size={22} color="var(--accent-green)" /> Kênh người bán</h1>
            <p>{shop?.name} · {(shop?.followers || 0).toLocaleString('vi-VN')} người theo dõi · {shop?.rating}★</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={17} /> Thêm sản phẩm</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', marginBottom: 20 }}>
        <StatCard icon={DollarSign} label="Doanh thu" value={currency(revenue)} sub={`${paidOrders.length} đơn hợp lệ`} />
        <StatCard icon={ShoppingBag} label="Sản phẩm đã bán" value={compactNumber(unitsSold)} sub="Trong các đơn hiện có" color="var(--info)" bg="var(--info-soft)" />
        <StatCard icon={Package} label="Đơn chờ xác nhận" value={pendingCount} sub="Cần xử lý sớm" color="var(--warning)" bg="var(--warning-soft)" />
        <StatCard icon={AlertTriangle} label="Sắp hết hàng" value={lowStock.length} sub="Dưới 60 cuốn tồn kho" color="var(--danger)" bg="var(--danger-soft)" />
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ---------- Tổng quan ---------- */}
      {tab === 'overview' && (
        <div className="stack">
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Doanh thu 14 ngày gần nhất</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-sub)" fontSize={12} />
                <YAxis stroke="var(--text-sub)" fontSize={12} tickFormatter={(v) => compactNumber(v)} />
                <Tooltip
                  formatter={(v) => currency(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)' }}
                />
                <Line type="monotone" dataKey="value" name="Doanh thu" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Doanh thu theo sản phẩm</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-sub)" fontSize={11} tickFormatter={(v) => compactNumber(v)} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-sub)" fontSize={11} width={110} />
                  <Tooltip
                    formatter={(v) => currency(v)}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)' }}
                  />
                  <Bar dataKey="value" name="Doanh thu" fill="#16a34a" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Lượt bán theo thể loại</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} label={false}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {lowStock.length > 0 && (
            <div className="card">
              <h3 className="row" style={{ margin: '0 0 12px', fontSize: 16, gap: 8 }}>
                <AlertTriangle size={18} color="var(--warning)" /> Sản phẩm cần nhập thêm hàng
              </h3>
              {lowStock.map((b) => (
                <div key={b.id} className="row-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="row">
                    <img src={b.cover} alt="" className="book-cover" style={{ width: 32, height: 44 }} />
                    <span className="small truncate">{b.title}</span>
                  </div>
                  <span className="badge badge-amber">Còn {b.stock} cuốn</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Sản phẩm ---------- */}
      {tab === 'products' && (
        <div className="card table-wrap">
          {myBooks.length === 0 ? (
            <EmptyState icon={Package} title="Shop chưa có sản phẩm nào" action={<button className="btn btn-primary" onClick={openCreate}>Thêm sản phẩm đầu tiên</button>} />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm</th><th>Thể loại</th><th>Giá</th><th>Tồn kho</th>
                  <th>Đã bán</th><th>Đánh giá</th><th>Trạng thái</th><th></th>
                </tr>
              </thead>
              <tbody>
                {myBooks.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/book/${b.id}`} className="row" style={{ gap: 10 }}>
                        <img src={b.cover} alt="" className="book-cover" style={{ width: 34, height: 46 }} />
                        <div style={{ minWidth: 0, maxWidth: 220 }}>
                          <div className="small strong truncate">{b.title}</div>
                          <div className="tiny muted truncate">{b.author}</div>
                        </div>
                      </Link>
                    </td>
                    <td><span className="badge">{b.category}</span></td>
                    <td className="price small">{currency(b.price)}</td>
                    <td>
                      <span className={`badge ${b.stock === 0 ? 'badge-red' : b.stock < 60 ? 'badge-amber' : 'badge-green'}`}>{b.stock}</span>
                    </td>
                    <td className="small">{b.sold.toLocaleString('vi-VN')}</td>
                    <td className="small">{b.rating}★</td>
                    <td>
                      <span className={`badge ${b.status === 'active' ? 'badge-green' : b.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>
                        {b.status === 'active' ? 'Đang bán' : b.status === 'pending' ? 'Chờ duyệt' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 2 }}>
                        <button className="btn-icon" onClick={() => openEdit(b)} aria-label="Sửa"><Edit3 size={16} /></button>
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => { if (window.confirm(`Xóa sản phẩm "${b.title}"?`)) { deleteBook(b.id); toast('Đã xóa sản phẩm.', 'info'); } }}
                          aria-label="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---------- Đơn hàng ---------- */}
      {tab === 'orders' && (
        <div className="stack">
          {myOrders.length === 0 && <div className="card"><EmptyState icon={Package} title="Chưa có đơn hàng nào" /></div>}
          {myOrders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
            return (
              <div key={o.id} className="card">
                <div className="row-between" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span className="strong">{o.code}</span>
                    <span className="tiny muted" style={{ marginLeft: 10 }}>{dateTime(o.createdAt)}</span>
                  </div>
                  <span className={`badge ${st.badge}`}>{st.label}</span>
                </div>

                <div className="row" style={{ padding: '12px 0', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    {o.items.map((i) => (
                      <div key={i.bookId} className="row" style={{ marginBottom: 8 }}>
                        <img src={i.cover} alt="" className="book-cover" style={{ width: 38, height: 52 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="small truncate">{i.title}</div>
                          <div className="tiny muted">{currency(i.price)} × {i.qty}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="small" style={{ flex: '1 1 220px' }}>
                    <div className="strong">{o.address.name} · {o.address.phone}</div>
                    <div className="muted">{o.address.detail}</div>
                    {o.note && <div className="tiny muted" style={{ marginTop: 4 }}>Ghi chú: {o.note}</div>}
                  </div>
                </div>

                <div className="row-between" style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
                  <span className="small">Giá trị đơn: <span className="price">{currency(total)}</span></span>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {o.status === 'pending' && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => advanceOrder(o, 'confirmed', 'Shop xác nhận đơn hàng')}>Xác nhận đơn</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => advanceOrder(o, 'cancelled', 'Shop từ chối: hết hàng')}>Từ chối</button>
                      </>
                    )}
                    {o.status === 'confirmed' && (
                      <button className="btn btn-primary btn-sm" onClick={() => advanceOrder(o, 'shipping', 'Shop đã bàn giao cho đơn vị vận chuyển')}>Bàn giao vận chuyển</button>
                    )}
                    {o.status === 'shipping' && (
                      <button className="btn btn-primary btn-sm" onClick={() => advanceOrder(o, 'delivered', 'Đơn vị vận chuyển báo giao thành công')}>Đánh dấu đã giao</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Doanh thu ---------- */}
      {tab === 'revenue' && (
        <div className="stack">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <StatCard icon={TrendingUp} label="Giá trị đơn trung bình" value={currency(paidOrders.length ? revenue / paidOrders.length : 0)} />
            <StatCard icon={Package} label="Tổng số đơn" value={myOrders.length} sub={`${myOrders.filter((o) => o.status === 'cancelled').length} đơn bị hủy`} color="var(--info)" bg="var(--info-soft)" />
            <StatCard icon={ShoppingBag} label="Số đầu sách" value={myBooks.length} sub={`${myBooks.filter((b) => b.status === 'active').length} đang bán`} color="var(--purple)" bg="var(--purple-soft)" />
          </div>

          <div className="card table-wrap">
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Chi tiết doanh thu theo sản phẩm</h3>
            <table className="table">
              <thead>
                <tr><th>Sản phẩm</th><th>Giá bán</th><th>Đã bán</th><th>Doanh thu ước tính</th><th>Tồn kho</th></tr>
              </thead>
              <tbody>
                {[...myBooks].sort((a, b) => b.sold * b.price - a.sold * a.price).map((b) => (
                  <tr key={b.id}>
                    <td className="small truncate" style={{ maxWidth: 260 }}>{b.title}</td>
                    <td className="small">{currency(b.price)}</td>
                    <td className="small">{b.sold.toLocaleString('vi-VN')}</td>
                    <td className="small price">{currency(b.sold * b.price)}</td>
                    <td className="small">{b.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form sản phẩm */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        width={560}
        title={editing === 'new' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Hủy</button>
            <button className="btn btn-primary" onClick={saveProduct}>Lưu sản phẩm</button>
          </>
        }
      >
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <Field label="Tên sách *" style={{ gridColumn: '1 / -1' }}>
            {(id) => <input id={id} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
          </Field>
          <Field label="Tác giả *">
            {(id) => <input id={id} className="input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />}
          </Field>
          <Field label="Thể loại">
            {(id) => (
              <select id={id} className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <Field label="Giá bán (đ) *">
            {(id) => <input id={id} className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />}
          </Field>
          <Field label="Giá gốc (đ)">
            {(id) => <input id={id} className="input" type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />}
          </Field>
          <Field label="Tồn kho">
            {(id) => <input id={id} className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />}
          </Field>
          <Field label="Số trang">
            {(id) => <input id={id} className="input" type="number" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} />}
          </Field>
          <Field label="Link ảnh bìa" style={{ gridColumn: '1 / -1' }}>
            {(id) => <input id={id} className="input" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} placeholder="https://..." />}
          </Field>
          <Field label="Từ khóa chủ đề (cách nhau bởi dấu phẩy)" style={{ gridColumn: '1 / -1' }} hint="Dùng cho bộ máy gợi ý — càng chính xác, sách càng dễ được đề xuất đúng người.">
            {(id) => <input id={id} className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="kỹ năng, thói quen, năng suất" />}
          </Field>
          <Field label="Mô tả" style={{ gridColumn: '1 / -1' }}>
            {(id) => <textarea id={id} className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
