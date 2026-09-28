import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { useApp } from '../hooks/useStore';
import { currency, dateTime, PAYMENT_LABEL } from '../lib/format';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { orders } = useApp();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Không tìm thấy đơn hàng</h3>
          <Link to="/orders" className="btn btn-primary btn-sm">Xem đơn hàng của tôi</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout" style={{ maxWidth: 680 }}>
      <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
        <CheckCircle2 size={62} color="var(--accent-green)" style={{ marginBottom: 14 }} />
        <h1 style={{ margin: '0 0 8px', fontSize: 25 }}>Đặt hàng thành công!</h1>
        <p className="muted" style={{ margin: '0 0 6px' }}>
          Cảm ơn bạn đã mua sách tại Bookigma. Shop sẽ xác nhận đơn trong vòng 24 giờ.
        </p>
        <div className="badge badge-green" style={{ fontSize: 14, padding: '6px 14px', margin: '10px 0 24px' }}>
          Mã đơn hàng: {order.code}
        </div>

        <div style={{ textAlign: 'left', background: 'var(--bg-soft)', borderRadius: 10, padding: 16 }} className="stack">
          <div className="row-between small"><span className="muted">Thời gian đặt</span><span>{dateTime(order.createdAt)}</span></div>
          <div className="row-between small"><span className="muted">Người nhận</span><span>{order.address.name} · {order.address.phone}</span></div>
          <div className="row-between small" style={{ alignItems: 'flex-start' }}>
            <span className="muted" style={{ flexShrink: 0 }}>Giao tới</span>
            <span style={{ textAlign: 'right' }}>{order.address.detail}</span>
          </div>
          <div className="row-between small"><span className="muted">Thanh toán</span><span>{PAYMENT_LABEL[order.payment]}</span></div>
          <hr className="divider" style={{ margin: 0 }} />
          {order.items.map((it) => (
            <div key={it.bookId} className="row-between small">
              <span className="truncate">{it.title} × {it.qty}</span>
              <span className="strong" style={{ flexShrink: 0 }}>{currency(it.price * it.qty)}</span>
            </div>
          ))}
          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between">
            <span className="strong">Tổng thanh toán</span>
            <span className="price" style={{ fontSize: 20 }}>{currency(order.total)}</span>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <Link to={`/orders/${order.id}`} className="btn btn-primary"><Truck size={16} /> Theo dõi đơn hàng</Link>
          <Link to="/orders" className="btn btn-ghost"><Package size={16} /> Đơn hàng của tôi</Link>
          <Link to="/shop" className="btn btn-ghost">Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
