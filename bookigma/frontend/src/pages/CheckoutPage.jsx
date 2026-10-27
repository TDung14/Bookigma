import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, Check, ChevronRight, CreditCard, MapPin, QrCode, Ticket, Truck, Wallet, Zap } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { useVipPerks } from '../hooks/useVipPerks';
import { currency } from '../lib/format';
import { Field } from '../components/common/ui';
import VoucherPicker from '../components/vouchers/VoucherPicker';
import { SHIPPING_FEE, cartSubtotal, countParcels, linePrice } from '../lib/cart';
import { normalizeVoucher, pickBestVouchers, voucherBlocker, voucherDiscount } from '../lib/vouchers';
import { getPointsSummary } from '../services/pointsApi';
import { claimDailyVoucher } from '../services/perkApi';
import { isPrepaid } from '../lib/payment';

const PAYMENTS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', hint: 'Trả tiền mặt cho shipper', icon: Banknote },
  { id: 'bank', label: 'Chuyển khoản ngân hàng', hint: 'Quét mã VietQR bằng app ngân hàng bất kỳ', icon: QrCode },
  { id: 'momo', label: 'Ví MoMo', hint: 'Quét mã VietQR bằng app MoMo', icon: Wallet },
];

export default function CheckoutPage() {
  const { getCart, vouchers, placeOrder, refreshCart, refreshMyVouchers } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const lines = getCart(user.id);

  const [address, setAddress] = useState({
    name: user.name,
    phone: '',
    detail: '',
  });
  const [payment, setPayment] = useState('cod');
  // undefined = tự chọn voucher tốt nhất (như Shopee), null = bỏ chọn, chuỗi = mã người dùng chọn
  const [discountPick, setDiscountPick] = useState(undefined);
  const [shippingPick, setShippingPick] = useState(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const { perks, refresh: refreshPerks } = useVipPerks(user.id);
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
  const shippingTotal = parcels * SHIPPING_FEE;

  // Voucher toàn sàn + voucher trong ví; mã gia hạn VIP không dùng cho đơn sách
  const orderVouchers = useMemo(
    () => vouchers.map(normalizeVoucher).filter((v) => v.code && v.scope !== 'vip'),
    [vouchers]
  );
  const best = pickBestVouchers(orderVouchers, subtotal, shippingTotal);
  const resolvePick = (pick, fallback) => {
    if (pick === undefined) return fallback;
    const found = pick && orderVouchers.find((v) => v.code === pick);
    return found && !voucherBlocker(found, subtotal) ? found : null;
  };
  const discountVoucher = resolvePick(discountPick, best.discount);
  const shippingVoucher = resolvePick(shippingPick, best.shipping);
  const usableCount = orderVouchers.filter((v) => !voucherBlocker(v, subtotal)).length;

  const discount = voucherDiscount(discountVoucher, subtotal);
  const shipping = shippingVoucher ? 0 : shippingTotal;

  const rawTotal = Math.max(0, subtotal - discount) + shipping;
  // Giống backend: điểm chỉ trừ vào tiền hàng còn lại sau voucher, không trừ phí vận chuyển
  const maxPoints = Math.min(pointsBalance, Math.max(0, subtotal - discount));
  const pointsDiscount = usePoints ? Math.min(maxPoints, pointsToUse > 0 ? pointsToUse : maxPoints) : 0;
  const total = Math.max(0, rawTotal - pointsDiscount);

  const applyPicked = ({ discount: discountCode, shipping: shippingCode }) => {
    setDiscountPick(discountCode);
    setShippingPick(shippingCode);
    setPickerOpen(false);
  };

  const claimDaily = async () => {
    setClaimingDaily(true);
    try {
      const res = await claimDailyVoucher();
      await Promise.all([refreshMyVouchers(), refreshPerks()]);
      toast(`Bạn nhận được voucher giảm ${Number(res?.voucher?.value) || ''}% hôm nay 🎉`);
    } catch (error) {
      toast(error.message || 'Không nhận được voucher hôm nay.', 'error');
    } finally {
      setClaimingDaily(false);
    }
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
        voucherCode: discountVoucher?.code || null,
        shippingVoucherCode: shippingVoucher?.code || null,
        note: note.trim(),
        pointsToUse: usePoints ? pointsDiscount : null,
      });
      const orderIds = orders.map((o) => String(o.id));
      const idsQuery = `ids=${orderIds.join(',')}`;
      // Trả trước phải qua trang thanh toán trước; trang đặt hàng thành công chỉ mở sau khi shop nhận tiền.
      const nextPath = isPrepaid(orders[0].payment)
        ? `/order-payment/${orders[0].id}?${idsQuery}`
        : `/order-success/${orders[0].id}?${idsQuery}`;
      navigate(nextPath, { replace: true, state: { orderIds } });
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

      <div className="split-layout" style={{ '--split-side': '360px' }}>
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

            {isPrepaid(payment) && (
              <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-soft)', borderRadius: 10 }} className="small">
                <div className="strong" style={{ marginBottom: 6 }}>Thanh toán bằng mã QR</div>
                <div className="muted">
                  Sau khi bấm Đặt hàng, bạn sẽ được chuyển đến trang thanh toán kèm mã QR đúng số tiền và nội dung chuyển khoản là mã đơn.
                  {payment === 'momo' ? ' Mở app MoMo, chọn Quét mã để thanh toán.' : ' Quét bằng app ngân hàng bất kỳ.'}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>Đơn hàng được xác nhận thành công sau khi shop nhận được tiền.</div>
              </div>
            )}
          </div>
        </div>

        {/* Tóm tắt */}
        <div className="card stack sticky-rail">
          <h3 style={{ margin: 0, fontSize: 17 }}>Tóm tắt thanh toán</h3>

          {/* Bookigma Voucher (như Shopee): 1 mã giảm giá + 1 mã miễn phí vận chuyển */}
          <button type="button" className="checkout-voucher-row" onClick={() => setPickerOpen(true)}>
            <Ticket size={18} color="var(--accent-green)" />
            <span className="small strong">Bookigma Voucher</span>
            <span className="checkout-voucher-chips">
              {discountVoucher && <span className="checkout-voucher-chip">-{currency(discount)}</span>}
              {shippingVoucher && <span className="checkout-voucher-chip is-ship">Miễn phí ship</span>}
              {!discountVoucher && !shippingVoucher && (
                <span className="tiny muted">{usableCount > 0 ? `${usableCount} mã dùng được` : 'Chọn hoặc nhập mã'}</span>
              )}
            </span>
            <ChevronRight size={16} />
          </button>
          {pickerOpen && (
            <VoucherPicker
              vouchers={orderVouchers}
              subtotal={subtotal}
              shippingTotal={shippingTotal}
              initialDiscount={discountVoucher?.code}
              initialShipping={shippingVoucher?.code}
              onApply={applyPicked}
              onClose={() => setPickerOpen(false)}
              daily={perks ? {
                eligible: perks.vip,
                claimedToday: perks.dailyVoucher?.claimedToday,
                claiming: claimingDaily,
                onClaim: claimDaily,
              } : null}
            />
          )}

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
                  setPointsToUse(e.target.checked ? maxPoints : 0);
                }}
                disabled={maxPoints <= 0}
              />
              <span>Dùng {maxPoints.toLocaleString('vi-VN')} Điểm (Giảm {currency(maxPoints)})</span>
            </label>
          </div>

          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between small"><span className="muted">Tạm tính</span><span>{currency(subtotal)}</span></div>
          <div className="row-between small">
            <span className="muted">Phí vận chuyển ({parcels} đơn × {currency(SHIPPING_FEE)})</span>
            <span>{currency(shippingTotal)}</span>
          </div>
          {shippingVoucher && (
            <div className="row-between small" style={{ color: '#0d9488' }}>
              <span>Voucher vận chuyển ({shippingVoucher.code})</span><span>-{currency(shippingTotal)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="row-between small" style={{ color: 'var(--danger)' }}>
              <span>Voucher giảm giá ({discountVoucher.code})</span><span>-{currency(discount)}</span>
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
            {placing ? 'Đang xử lý...' : isPrepaid(payment) ? 'Đặt hàng & thanh toán' : 'Đặt hàng'}
          </button>
          <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
            Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng của Bookigma.
          </p>
        </div>
      </div>
    </div>
  );
}
