import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, Check, CreditCard, MapPin, Tag, Truck, Wallet } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency } from '../lib/format';
import { Field } from '../components/common/ui';
import { POINT_RULES } from '../lib/gamification';
import { SHIPPING_FEE } from './CartPage';

const PAYMENTS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', hint: 'Trả tiền mặt cho shipper', icon: Banknote },
  { id: 'bank', label: 'Chuyển khoản ngân hàng', hint: 'Quét mã VietQR, xác nhận tự động', icon: CreditCard },
  { id: 'momo', label: 'Ví MoMo', hint: 'Thanh toán qua ứng dụng MoMo', icon: Wallet },
];

export default function CheckoutPage() {
  const { getCart, bookById, vouchers, placeOrder, clearCart, pushNotification, earnPoints } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const cart = getCart(user.id);
  const lines = useMemo(
    () => cart.map((c) => ({ ...c, book: bookById(c.bookId) })).filter((l) => l.book),
    [cart, bookById]
  );

  const [address, setAddress] = useState({
    name: user.name,
    phone: '0901234567',
    detail: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
  });
  const [payment, setPayment] = useState('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const linePrice = (l) => (l.blind ? l.blind.price : l.book.price);
  const subtotal = lines.reduce((s, l) => s + linePrice(l) * l.qty, 0);

  const { discount, shipping } = useMemo(() => {
    let d = 0;
    let ship = lines.length ? SHIPPING_FEE : 0;
    if (appliedVoucher) {
      if (appliedVoucher.type === 'percent') {
        d = Math.min(Math.round((subtotal * appliedVoucher.value) / 100), appliedVoucher.maxDiscount);
      } else if (appliedVoucher.type === 'amount') {
        d = appliedVoucher.value;
      } else if (appliedVoucher.type === 'shipping') {
        ship = 0;
      }
    }
    return { discount: d, shipping: ship };
  }, [appliedVoucher, subtotal, lines.length]);

  const total = Math.max(0, subtotal - discount) + shipping;

  const applyVoucher = (code) => {
    const v = vouchers.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!v) return toast('Mã giảm giá không tồn tại.', 'error');
    if (subtotal < v.minOrder) {
      return toast(`Đơn tối thiểu ${currency(v.minOrder)} mới dùng được mã này.`, 'error');
    }
    setAppliedVoucher(v);
    setVoucherCode(v.code);
    toast(`Đã áp dụng mã ${v.code}.`);
  };

  const submit = () => {
    if (!address.name.trim() || !address.phone.trim() || !address.detail.trim()) {
      return toast('Vui lòng điền đầy đủ thông tin nhận hàng.', 'error');
    }
    if (!/^0\d{9}$/.test(address.phone.trim())) {
      return toast('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.', 'error');
    }
    if (lines.length === 0) return toast('Giỏ hàng trống.', 'error');

    setPlacing(true);
    // Giả lập độ trễ của cổng thanh toán để luồng demo trông thật hơn.
    setTimeout(() => {
      const order = placeOrder({
        userId: user.id,
        items: lines.map((l) => ({
          bookId: l.book.id,
          title: l.blind ? `Hộp Blind Book — ${l.blind.moodLabel}` : l.book.title,
          cover: l.book.cover,
          price: linePrice(l), qty: l.qty, shopId: l.book.shopId,
          ...(l.blind ? { blind: l.blind, revealed: false } : {}),
        })),
        subtotal, shippingFee: shipping, discount, total,
        address: { ...address }, payment, note: note.trim(),
        voucher: appliedVoucher?.code || null,
      });
      clearCart(user.id);
      earnPoints(user.id, POINT_RULES.placeOrder);
      pushNotification(user.id, `Đơn hàng ${order.code} đã được tạo và đang chờ shop xác nhận.`, `/orders/${order.id}`);
      setPlacing(false);
      navigate(`/order-success/${order.id}`);
    }, 900);
  };

  if (lines.length === 0) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Không có sản phẩm nào để thanh toán</h3>
          <Link to="/shop" className="btn btn-primary btn-sm">Đi tới cửa hàng</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout">
      <div className="page-head">
        <h1>Thanh toán</h1>
        <p>Kiểm tra lại thông tin trước khi đặt hàng</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)', gap: 20, alignItems: 'start' }}>
        <div className="stack">
          {/* Địa chỉ */}
          <div className="card">
            <div className="row" style={{ marginBottom: 14 }}>
              <MapPin size={18} color="var(--accent-green)" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Thông tin nhận hàng</h3>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Họ và tên">
                {(id) => <input id={id} className="input" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />}
              </Field>
              <Field label="Số điện thoại">
                {(id) => <input id={id} className="input" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="09xxxxxxxx" />}
              </Field>
              <Field label="Địa chỉ chi tiết" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                {(id) => <input id={id} className="input" value={address.detail} onChange={(e) => setAddress({ ...address, detail: e.target.value })} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />}
              </Field>
            </div>
          </div>

          {/* Sản phẩm */}
          <div className="card">
            <div className="row" style={{ marginBottom: 14 }}>
              <Truck size={18} color="var(--accent-green)" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Sản phẩm ({lines.length})</h3>
            </div>
            {lines.map(({ book, qty, blind }) => (
              <div key={blind ? `blind-${book.id}` : book.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                {blind ? (
                  <div className="book-cover row" style={{ width: 46, height: 62, justifyContent: 'center', fontSize: 24, background: 'var(--accent-soft)' }}>🎁</div>
                ) : (
                  <img src={book.cover} alt="" className="book-cover" style={{ width: 46, height: 62 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small strong clamp-2">{blind ? `${blind.tierName} — ${blind.moodLabel}` : book.title}</div>
                  <div className="tiny muted">{currency(linePrice({ book, blind }))} × {qty}</div>
                </div>
                <div className="strong small">{currency(linePrice({ book, blind }) * qty)}</div>
              </div>
            ))}
            <Field label="Ghi chú cho shop (không bắt buộc)" style={{ marginTop: 14, marginBottom: 0 }}>
              {(id) => <input id={id} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: gói quà giúp mình nhé" />}
            </Field>
          </div>

          {/* Thanh toán */}
          <div className="card">
            <div className="row" style={{ marginBottom: 14 }}>
              <CreditCard size={18} color="var(--accent-green)" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Phương thức thanh toán</h3>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {PAYMENTS.map(({ id, label, hint, icon: Icon }) => (
                <button
                  key={id}
                  className="row"
                  onClick={() => setPayment(id)}
                  style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                    background: payment === id ? 'var(--accent-soft)' : 'var(--bg-soft)',
                    border: `1px solid ${payment === id ? 'var(--accent-green)' : 'var(--border-color)'}`,
                  }}
                >
                  <Icon size={19} color={payment === id ? 'var(--accent-green)' : 'var(--text-sub)'} />
                  <div style={{ flex: 1 }}>
                    <div className="small strong">{label}</div>
                    <div className="tiny muted">{hint}</div>
                  </div>
                  {payment === id && <Check size={18} color="var(--accent-green)" />}
                </button>
              ))}
            </div>

            {payment === 'bank' && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-soft)', borderRadius: 10 }} className="small">
                <div className="strong" style={{ marginBottom: 6 }}>Thông tin chuyển khoản</div>
                <div className="muted">Ngân hàng: Vietcombank — CN Hà Nội</div>
                <div className="muted">Số tài khoản: 0123 4567 8910</div>
                <div className="muted">Chủ tài khoản: CONG TY BOOKIGMA</div>
                <div className="muted">Nội dung: {user.name} thanh toan Bookigma</div>
              </div>
            )}
          </div>
        </div>

        {/* Tóm tắt */}
        <div className="card stack" style={{ position: 'sticky', top: 76 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Tóm tắt thanh toán</h3>

          <div>
            <label className="label"><Tag size={13} style={{ verticalAlign: -2 }} /> Mã giảm giá</label>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" placeholder="Nhập mã" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} />
              <button className="btn btn-soft btn-sm" onClick={() => applyVoucher(voucherCode)}>Áp dụng</button>
            </div>
            <div className="stack" style={{ gap: 6, marginTop: 10 }}>
              {vouchers.map((v) => (
                <button
                  key={v.code}
                  className="row"
                  onClick={() => applyVoucher(v.code)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
                    background: appliedVoucher?.code === v.code ? 'var(--accent-soft)' : 'var(--bg-soft)',
                    border: `1px dashed ${appliedVoucher?.code === v.code ? 'var(--accent-green)' : 'var(--border-color)'}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div className="tiny strong" style={{ color: 'var(--accent-green)' }}>{v.code}</div>
                    <div className="tiny muted">{v.label}</div>
                  </div>
                  {appliedVoucher?.code === v.code && <Check size={15} color="var(--accent-green)" />}
                </button>
              ))}
            </div>
          </div>

          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between small"><span className="muted">Tạm tính</span><span>{currency(subtotal)}</span></div>
          <div className="row-between small"><span className="muted">Phí vận chuyển</span><span>{shipping === 0 ? 'Miễn phí' : currency(shipping)}</span></div>
          {discount > 0 && (
            <div className="row-between small" style={{ color: 'var(--danger)' }}>
              <span>Giảm giá ({appliedVoucher.code})</span><span>-{currency(discount)}</span>
            </div>
          )}
          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between">
            <span className="strong">Cần thanh toán</span>
            <span className="price" style={{ fontSize: 23 }}>{currency(total)}</span>
          </div>

          <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={placing}>
            {placing ? 'Đang xử lý...' : 'Đặt hàng'}
          </button>
          <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
            Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng của Bookigma.
          </p>
        </div>
      </div>
    </div>
  );
}
