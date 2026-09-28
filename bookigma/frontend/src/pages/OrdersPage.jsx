import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency, dateTime, ORDER_STATUS } from '../lib/format';
import { EmptyState } from '../components/common/ui';

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'delivered', label: 'Đã giao' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

export default function OrdersPage() {
  const { orders, updateOrderStatus, pushNotification } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  const myOrders = useMemo(
    () => orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt),
    [orders, user.id]
  );

  const counts = useMemo(() => {
    const c = { all: myOrders.length };
    myOrders.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [myOrders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return myOrders
      .filter((o) => tab === 'all' || o.status === tab)
      .filter((o) => !q || o.code.toLowerCase().includes(q) || o.items.some((i) => i.title.toLowerCase().includes(q)));
  }, [myOrders, tab, query]);

  const cancelOrder = (order) => {
    if (!window.confirm(`Hủy đơn hàng ${order.code}?`)) return;
    updateOrderStatus(order.id, 'cancelled', 'Khách hàng hủy đơn');
    pushNotification(user.id, `Đơn hàng ${order.code} đã được hủy.`, `/orders/${order.id}`);
    toast('Đã hủy đơn hàng.', 'info');
  };

  const confirmReceived = (order) => {
    updateOrderStatus(order.id, 'completed', 'Khách xác nhận đã nhận hàng');
    toast('Cảm ơn bạn! Đơn hàng đã hoàn thành.');
  };

  return (
    <div className="main-layout">
      <div className="page-head">
        <h1>Đơn hàng của tôi</h1>
        <p>Theo dõi trạng thái và lịch sử mua sách của bạn</p>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 18 }}>
        <div className="tabs" style={{ padding: '0 8px' }}>
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}{counts[t.id] ? ` (${counts[t.id]})` : ''}
            </button>
          ))}
        </div>
        <div style={{ padding: 14, position: 'relative' }}>
          <Search size={17} style={{ position: 'absolute', left: 26, top: 25, color: 'var(--text-sub)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Tìm theo mã đơn hoặc tên sách..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Chưa có đơn hàng nào ở mục này"
            hint="Khi bạn đặt sách, đơn hàng sẽ hiện ở đây kèm trạng thái giao hàng."
            action={<Link to="/shop" className="btn btn-primary">Mua sách ngay</Link>}
          />
        </div>
      ) : (
        <div className="stack">
          {filtered.map((order) => {
            const st = ORDER_STATUS[order.status];
            return (
              <div key={order.id} className="card">
                <div className="row-between" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                  <div>
                    <Link to={`/orders/${order.id}`} className="strong">{order.code}</Link>
                    <span className="tiny muted" style={{ marginLeft: 10 }}>{dateTime(order.createdAt)}</span>
                  </div>
                  <span className={`badge ${st.badge}`}>{st.label}</span>
                </div>

                {order.items.map((it) => (
                  <Link key={it.bookId} to={`/book/${it.bookId}`} className="row" style={{ padding: '12px 0', gap: 12 }}>
                    <img src={it.cover} alt="" className="book-cover" style={{ width: 52, height: 70 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small strong clamp-2">{it.title}</div>
                      <div className="tiny muted">Số lượng: {it.qty}</div>
                    </div>
                    <div className="small strong">{currency(it.price * it.qty)}</div>
                  </Link>
                ))}

                <div className="row-between" style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
                  <span className="small">
                    Tổng tiền: <span className="price" style={{ fontSize: 17 }}>{currency(order.total)}</span>
                  </span>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/orders/${order.id}`)}>Xem chi tiết</button>
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => cancelOrder(order)}>Hủy đơn</button>
                    )}
                    {order.status === 'delivered' && (
                      <button className="btn btn-primary btn-sm" onClick={() => confirmReceived(order)}>Đã nhận được hàng</button>
                    )}
                    {order.status === 'completed' && (
                      <Link to={`/book/${order.items[0].bookId}`} className="btn btn-soft btn-sm">Mua lại</Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
