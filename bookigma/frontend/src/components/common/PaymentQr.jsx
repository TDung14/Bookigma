import { BadgeCheck, Clock } from 'lucide-react';
import { currency, dateTime } from '../../lib/format';
import { PAYEE, isPrepaid, vietQrUrl } from '../../lib/payment';

/** Mã VietQR của một đơn: đúng số tiền, nội dung chuyển khoản là mã đơn. */
export default function PaymentQr({ order }) {
  const momo = order.payment === 'momo';
  return (
    <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <img
        src={vietQrUrl(order.total, order.code)}
        alt={`Mã QR thanh toán đơn ${order.code}`}
        width={180}
        height={213}
        style={{ borderRadius: 10, background: '#fff', flexShrink: 0 }}
      />
      <div className="small stack" style={{ gap: 4, flex: '1 1 180px', minWidth: 0 }}>
        <div className="strong">{momo ? 'Mở app MoMo → Quét mã QR' : 'Mở app ngân hàng → Quét mã QR'}</div>
        <div className="muted">Số tiền: <span className="strong" style={{ color: 'var(--text-main)' }}>{currency(order.total)}</span></div>
        <div className="muted">Nội dung: <span className="strong" style={{ color: 'var(--text-main)' }}>{order.code}</span></div>
        <div className="muted">{PAYEE.bankName} · {PAYEE.accountNo}</div>
        <div className="muted">Chủ tài khoản: {PAYEE.accountName}</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          Giữ nguyên nội dung chuyển khoản để shop đối chiếu. Shop giao hàng sau khi nhận được tiền.
        </div>
      </div>
    </div>
  );
}

/** Nhãn trạng thái thanh toán cho đơn trả trước (chuyển khoản / MoMo); đơn COD không hiện gì. */
export function PaymentBadge({ order }) {
  if (!isPrepaid(order.payment)) return null;
  if (order.paidAt) {
    return (
      <span className="badge badge-green" title={`Đã nhận tiền lúc ${dateTime(order.paidAt)}`}>
        <BadgeCheck size={13} /> Đã thanh toán
      </span>
    );
  }
  if (order.status === 'cancelled') return null;
  return (
    <span className="badge badge-amber">
      <Clock size={13} /> Chờ thanh toán
    </span>
  );
}
