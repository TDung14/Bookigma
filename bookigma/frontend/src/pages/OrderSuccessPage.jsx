import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Package, Store, Truck } from 'lucide-react';
import { useApp } from '../hooks/useStore';
import { currency, dateTime, PAYMENT_LABEL } from '../lib/format';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const location = useLocation();
  const { orders, accountReady } = useApp();

  // Một lần thanh toán có thể tạo nhiều đơn (mỗi shop / mỗi hộp Blind Book một đơn).
  const ids = location.state?.orderIds || [id];
  const placed = ids
    .map((orderId) => orders.find((o) => String(o.id) === String(orderId)))
    .filter(Boolean);

  if (placed.length === 0) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>{accountReady ? 'Không tìm thấy đơn hàng' : 'Đang tải đơn hàng...'}</h3>
          {accountReady && <Link to="/orders" className="btn btn-primary btn-sm">Xem đơn hàng của tôi</Link>}
        </div>
      </div>
    );
  }

  const first = placed[0];
  const grandTotal = placed.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="main-layout" style={{ maxWidth: 680 }}>
      <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
        <CheckCircle2 size={62} color="var(--accent-green)" style={{ marginBottom: 14 }} />
        <h1 style={{ margin: '0 0 8px', fontSize: 25 }}>Đặt hàng thành công!</h1>
        <p className="muted" style={{ margin: '0 0 6px' }}>
          Cảm ơn bạn đã mua sách tại Bookigma. Shop sẽ xác nhận đơn trong vòng 24 giờ.
        </p>
        {placed.length > 1 && (
          <p className="small muted" style={{ margin: '0 0 6px' }}>
            Giỏ hàng được tách thành {placed.length} đơn để từng nhà bán tự xác nhận và giao hàng.
          </p>
        )}

        <div style={{ textAlign: 'left', background: 'var(--bg-soft)', borderRadius: 10, padding: 16, marginTop: 18 }} className="stack">
          <div className="row-between small"><span className="muted">Thời gian đặt</span><span>{dateTime(first.createdAt)}</span></div>
          <div className="row-between small"><span className="muted">Người nhận</span><span>{first.address.name} · {first.address.phone}</span></div>
          <div className="row-between small" style={{ alignItems: 'flex-start' }}>
            <span className="muted" style={{ flexShrink: 0 }}>Giao tới</span>
            <span style={{ textAlign: 'right' }}>{first.address.detail}</span>
          </div>
          <div className="row-between small"><span className="muted">Thanh toán</span><span>{PAYMENT_LABEL[first.payment]}</span></div>

          {placed.map((order) => (
            <div key={order.id} className="stack" style={{ gap: 6 }}>
              <hr className="divider" style={{ margin: 0 }} />
              <div className="row-between small">
                <Link to={`/orders/${order.id}`} className="strong">Đơn {order.code}</Link>
                <span className="row tiny muted" style={{ gap: 4 }}><Store size={13} /> {order.shopName || 'Bookigma'}</span>
              </div>
              {order.items.map((it) => (
                <div key={it.id} className="row-between small">
                  <span className="truncate">{it.blind ? `🎁 ${it.title}` : it.title} × {it.qty}</span>
                  <span className="strong" style={{ flexShrink: 0 }}>{currency(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="row-between tiny muted">
                <span>Phí ship {order.shippingFee === 0 ? 'miễn phí' : currency(order.shippingFee)}{order.discount > 0 ? ` · giảm ${currency(order.discount)}` : ''}</span>
                <span>{currency(order.total)}</span>
              </div>
            </div>
          ))}

          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between">
            <span className="strong">Tổng thanh toán</span>
            <span className="price" style={{ fontSize: 20 }}>{currency(grandTotal)}</span>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <Link to={`/orders/${first.id}`} className="btn btn-primary"><Truck size={16} /> Theo dõi đơn hàng</Link>
          <Link to="/orders" className="btn btn-ghost"><Package size={16} /> Đơn hàng của tôi</Link>
          <Link to="/shop" className="btn btn-ghost">Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
