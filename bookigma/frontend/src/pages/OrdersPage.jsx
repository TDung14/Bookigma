import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Search, Store } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import useVisibleInterval from '../hooks/useVisibleInterval';
import { currency, dateTime, ORDER_STATUS } from '../lib/format';
import { EmptyState } from '../components/common/ui';
import { PaymentBadge } from '../components/common/PaymentQr';
import { isPrepaid } from '../lib/payment';

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
  const { orders, cancelOrder, completeOrder, refreshOrders, accountReady } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Shop có thể vừa xác nhận / giao đơn: lấy trạng thái mới nhất mỗi lần mở trang.
  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Cập nhật định kỳ để trạng thái đơn theo kịp thao tác của shop.
  useVisibleInterval(refreshOrders, 10000);

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

  const run = async (order, action, message, type) => {
    setBusyId(order.id);
    try {
      await action();
      toast(message, type);
    } catch (error) {
      toast(error.message || 'Không thể cập nhật đơn hàng.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (order) => {
    const question = order.paidAt
      ? `Đơn ${order.code} đã thanh toán. Hủy đơn thì shop sẽ hoàn tiền cho bạn. Tiếp tục hủy?`
      : `Hủy đơn hàng ${order.code}?`;
    if (!window.confirm(question)) return;
    run(order, () => cancelOrder(order.id), 'Đã hủy đơn hàng.', 'info');
  };

  const confirmReceived = (order) => run(order, () => completeOrder(order.id), 'Cảm ơn bạn! Đơn hàng đã hoàn thành.');

  /** Sản phẩm để "Mua lại": cuốn sách thường đầu tiên, còn đơn chỉ có hộp Blind Book thì về trang Blind Book. */
  const rebuyLink = (order) => {
    const item = order.items.find((i) => !i.blind && i.bookId);
    return item ? `/book/${item.bookId}` : '/blind-book';
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
            title={accountReady ? 'Chưa có đơn hàng nào ở mục này' : 'Đang tải đơn hàng...'}
            hint={accountReady ? 'Khi bạn đặt sách, đơn hàng sẽ hiện ở đây kèm trạng thái giao hàng.' : undefined}
            action={accountReady ? <Link to="/shop" className="btn btn-primary">Mua sách ngay</Link> : null}
          />
        </div>
      ) : (
        <div className="stack">
          {filtered.map((order) => {
            const st = ORDER_STATUS[order.status];
            const busy = busyId === order.id;
            return (
              <div key={order.id} className="card">
                <div className="row-between" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                  <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <Link to={`/orders/${order.id}`} className="strong">{order.code}</Link>
                    {order.shopName && <span className="row tiny muted" style={{ gap: 4 }}><Store size={13} /> {order.shopName}</span>}
                    <span className="tiny muted">{dateTime(order.createdAt)}</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <PaymentBadge order={order} />
                    {order.status === 'cancelled' && order.paidAt && (
                      <span className={`badge ${order.refundedAt ? 'badge-green' : 'badge-amber'}`}>
                        {order.refundedAt ? 'Đã hoàn tiền' : 'Chờ hoàn tiền'}
                      </span>
                    )}
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                  </div>
                </div>

                {order.items.map((it) => {
                  const hidden = it.blind && !it.revealed;
                  return (
                    <Link
                      key={it.id}
                      to={hidden || !it.bookId ? `/orders/${order.id}` : `/book/${it.bookId}`}
                      className="row"
                      style={{ padding: '12px 0', gap: 12 }}
                    >
                      {hidden ? (
                        <div className="book-cover row" style={{ width: 52, height: 70, justifyContent: 'center', fontSize: 26, background: 'var(--accent-soft)' }}>🎁</div>
                      ) : (
                        <img src={it.cover} alt="" className="book-cover" style={{ width: 52, height: 70 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="small strong clamp-2">{it.title}</div>
                        <div className="tiny muted">
                          {it.blind ? `${it.blind.tierName} · ` : ''}Số lượng: {it.qty}
                        </div>
                      </div>
                      <div className="small strong">{currency(it.price * it.qty)}</div>
                    </Link>
                  );
                })}

                <div className="row-between" style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 10 }}>
                  <span className="small">
                    Tổng tiền: <span className="price" style={{ fontSize: 17 }}>{currency(order.total)}</span>
                  </span>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/orders/${order.id}`)}>Xem chi tiết</button>
                    {isPrepaid(order.payment) && !order.paidAt && order.status !== 'cancelled' && (
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/order-payment/${order.id}?ids=${order.id}`)}>
                        Thanh toán
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} disabled={busy} onClick={() => cancel(order)}>Hủy đơn</button>
                    )}
                    {order.status === 'delivered' && (
                      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => confirmReceived(order)}>Đã nhận được hàng</button>
                    )}
                    {order.status === 'completed' && (
                      <Link to={rebuyLink(order)} className="btn btn-soft btn-sm">Mua lại</Link>
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
