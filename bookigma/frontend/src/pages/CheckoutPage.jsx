import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, Check, CreditCard, MapPin, Tag, Truck, Wallet, Zap } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency } from '../lib/format';
import { Field } from '../components/common/ui';
import { POINT_RULES } from '../lib/gamification';
import { SHIPPING_FEE, applyVoucher, cartSubtotal, countParcels, linePrice } from '../lib/cart';
import { getPointsSummary } from '../services/pointsApi';

const PAYMENTS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', hint: 'Trả tiền mặt cho shipper', icon: Banknote },
  { id: 'bank', label: 'Chuyển khoản ngân hàng', hint: 'Quét mã VietQR, xác nhận tự động', icon: CreditCard },
  { id: 'momo', label: 'Ví MoMo', hint: 'Thanh toán qua ứng dụng MoMo', icon: Wallet },
];

export default function CheckoutPage() {
  const { getCart, vouchers, placeOrder, refreshCart, earnPoints } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const lines = getCart(user.id);

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
  
  const [pointsBalance, setPointsBalance] = useState(user.points || 0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  useEffect(() => {
    getPointsSummary(user.id)
      .then((res) => {
        if (res && res.balance !== undefined) {
          setPointsBalance(res.balance);
        }
      })
      .catch(() => {});
  }, [user.id]);

  const subtotal = cartSubtotal(lines);
  const parcels = countParcels(lines);

  const { discount, shipping } = applyVoucher(appliedVoucher, subtotal, parcels);

  const rawTotal = Math.max(0, subtotal - discount) + shipping;
  const pointsDiscount = usePoints ? Math.min(pointsBalance, pointsToUse > 0 ? pointsToUse : pointsBalance) : 0;
  const total = Math.max(0, rawTotal - pointsDiscount);

  const applyVoucherCode = (code) => {
    const v = vouchers.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!v) return toast('Mã giảm giá không tồn tại.', 'error');
    if (subtotal < v.minOrder) {
      return toast(`Đơn tối thiểu ${currency(v.minOrder)} mới dùng được mã này.`, 'error');
    }
    setAppliedVoucher(v);
    setVoucherCode(v.code);
    toast(`Đã áp dụng mã ${v.code}.`);
  };

  const submit = async () => {
    if (!address.name.trim() || !address.phone.trim() || !address.detail.trim()) {
      return toast('Vui lòng điền đầy đủ thông tin nhận hàng.', 'error');
    }
    if (!/^0\d{9}$/.test(address.phone.trim())) {
      return toast('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.', 'error');
    }
    if (lines.length === 0) return toast('Giỏ hàng trống.', 'error');
    if (lines.some((line) => !line.available)) {
      return toast('Giỏ hàng có sản phẩm không còn đủ hàng, hãy quay lại giỏ để cập nhật.', 'error');
    }

    setPlacing(true);
    try {
      const orders = await placeOrder({
        recipientName: address.name.trim(),
        recipientPhone: address.phone.trim(),
        shippingAddress: address.detail.trim(),
        paymentMethod: payment,
        voucherCode: appliedVoucher?.code || null,
        note: note.trim(),
        pointsToUse: usePoints ? pointsDiscount : null,
      });
      earnPoints(user.id, POINT_RULES.placeOrder);
      navigate(`/order-success/${orders[0].id}`, { state: { orderIds: orders.map((o) => o.id) } });
    } catch (error) {
      toast(error.message || 'Không thể đặt hàng, vui lòng thử lại.', 'error');
      refreshCart();
      setPlacing(false);
    }
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
            {lines.map((line) => {
              const { book, qty, blind } = line;
              return (
                <div key={line.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  {blind ? (
                    <div className="book-cover row" style={{ width: 46, height: 62, justifyContent: 'center', fontSize: 24, background: 'var(--accent-soft)' }}>🎁</div>
                  ) : (
                    <img src={book.cover} alt="" className="book-cover" style={{ width: 46, height: 62 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small strong clamp-2">{blind ? `${blind.tierName} — ${blind.moodLabel}` : book.title}</div>
                    <div className="tiny muted">{currency(linePrice(line))} × {qty}</div>
                  </div>
                  <div className="strong small">{currency(linePrice(line) * qty)}</div>
                </div>
              );
            })}
            {parcels > 1 && (
              <p className="tiny muted" style={{ margin: '10px 0 0' }}>
                Giỏ hàng sẽ được tách thành {parcels} đơn (mỗi shop một đơn, mỗi hộp Blind Book một đơn) để từng nhà bán tự xác nhận và giao hàng.
              </p>
            )}
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
              <button className="btn btn-soft btn-sm" onClick={() => applyVoucherCode(voucherCode)}>Áp dụng</button>
            </div>
            <div className="stack" style={{ gap: 6, marginTop: 10 }}>
              {vouchers.map((v) => (
                <button
                  key={v.code}
                  className="row"
                  onClick={() => applyVoucherCode(v.code)}
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

          {/* Dùng Điểm Bookigma */}
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--border-color)' }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="small strong row" style={{ gap: 6 }}>
                <Zap size={16} color="#eab308" fill="#eab308" /> Dùng Điểm Bookigma
              </span>
              <span className="tiny muted">Ví có: <strong>{(pointsBalance || 0).toLocaleString('vi-VN')} Điểm</strong></span>
            </div>
            <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => {
                  setUsePoints(e.target.checked);
                  setPointsToUse(e.target.checked ? Math.min(pointsBalance, rawTotal) : 0);
                }}
                disabled={pointsBalance <= 0}
              />
              <span>Dùng {pointsBalance > 0 ? Math.min(pointsBalance, rawTotal).toLocaleString('vi-VN') : 0} Điểm (Giảm {currency(Math.min(pointsBalance, rawTotal))})</span>
            </label>
          </div>

          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between small"><span className="muted">Tạm tính</span><span>{currency(subtotal)}</span></div>
          <div className="row-between small">
            <span className="muted">Phí vận chuyển ({parcels} đơn × {currency(SHIPPING_FEE)})</span>
            <span>{shipping === 0 ? 'Miễn phí' : currency(shipping)}</span>
          </div>
          {discount > 0 && (
            <div className="row-between small" style={{ color: 'var(--danger)' }}>
              <span>Giảm giá ({appliedVoucher.code})</span><span>-{currency(discount)}</span>
            </div>
          )}
          {usePoints && pointsDiscount > 0 && (
            <div className="row-between small" style={{ color: '#eab308' }}>
              <span className="row" style={{ gap: 4 }}><Zap size={13} fill="#eab308" /> Trừ Điểm Bookigma</span>
              <span>-{currency(pointsDiscount)}</span>
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
