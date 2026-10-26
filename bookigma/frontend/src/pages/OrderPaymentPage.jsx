import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp, useToast } from '../hooks/useStore';
import useVisibleInterval from '../hooks/useVisibleInterval';
import { currency, dateTime, PAYMENT_LABEL } from '../lib/format';
import { isPrepaid } from '../lib/payment';
import PaymentQr, { PaymentBadge } from '../components/common/PaymentQr';

/** Bước thanh toán sau khi đặt hàng: chỉ rời trang khi mọi đơn đã được xác nhận nhận tiền. */
export default function OrderPaymentPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { orders, accountReady, refreshOrders } = useApp();
  const [checking, setChecking] = useState(false);

  const idsParam = searchParams.get('ids') || '';
  const ids = useMemo(() => {
    const raw = idsParam ? idsParam.split(',') : (location.state?.orderIds || [id]);
    return [...new Set(raw.map((value) => String(value).trim()).filter(Boolean))];
  }, [id, idsParam, location.state]);

  const placed = useMemo(
    () => ids
      .map((orderId) => orders.find((order) => String(order.id) === orderId))
      .filter(Boolean),
    [ids, orders]
  );

  const first = placed[0];
  const completeSet = placed.length === ids.length;
  // Đơn đã hủy không còn phải trả tiền nên không tính vào số tiền / số đơn chờ thanh toán.
  const payable = placed.filter((order) => order.status !== 'cancelled');
  const allPaid = completeSet && payable.length > 0 && payable.every((order) => Boolean(order.paidAt));
  const hasCancelled = payable.length < placed.length;
  const allCancelled = completeSet && payable.length === 0;
  const pendingPayments = payable.filter((order) => !order.paidAt);
  const anyPaid = payable.some((order) => Boolean(order.paidAt));
  // Chỉ chờ các đơn còn hiệu lực; hủy hết thì chuyển sang trang kết quả.
  const settled = completeSet && pendingPayments.length === 0;
  const paidCount = payable.filter((order) => order.paidAt).length;
  const total = payable.reduce((sum, order) => sum + order.total, 0);
  const successUrl = first ? `/order-success/${first.id}?ids=${ids.join(',')}` : '';

  useEffect(() => {
    if (!first || !completeSet) return undefined;
    // Đơn COD không có bước thanh toán riêng; đơn đã trả tiền thì vào thẳng trang xác nhận.
    if (!isPrepaid(first.payment)) {
      const timer = setTimeout(() => {
        navigate(successUrl, { replace: true, state: { orderIds: ids } });
      }, 0);
      return () => clearTimeout(timer);
    }
    // Còn đơn chờ trả tiền thì ở lại; tất cả đã trả hoặc đã hủy hết mới sang trang kết quả.
    if (settled && (anyPaid || allCancelled)) {
      const timer = setTimeout(() => {
        navigate(successUrl, { replace: true, state: { orderIds: ids } });
      }, allPaid ? 900 : 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [allCancelled, allPaid, anyPaid, completeSet, first, ids, navigate, settled, successUrl]);

  useVisibleInterval(() => {
    if (pendingPayments.length) refreshOrders();
  }, 5000);

  const checkNow = async () => {
    if (checking) return;
    setChecking(true);
    await refreshOrders();
    setChecking(false);
    toast('Đã kiểm tra lại. Trang sẽ tự chuyển khi shop xác nhận thanh toán.', 'info');
  };

  if (!placed.length) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>{accountReady ? 'Không tìm thấy đơn hàng' : 'Đang tải đơn hàng...'}</h3>
          {accountReady && <Link to="/orders" className="btn btn-primary btn-sm">Xem đơn hàng của tôi</Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')} style={{ marginBottom: 10 }}>
          <ChevronLeft size={15} /> Đơn hàng của tôi
        </button>
        <h1>Thanh toán đơn hàng</h1>
        <p>Quét mã QR bằng app ngân hàng hoặc MoMo để hoàn tất thanh toán. Đơn hàng chỉ được xác nhận sau khi shop nhận được tiền.</p>
      </div>

      <div className="card row" style={{ gap: 8, flexWrap: 'wrap', padding: '12px 16px', marginBottom: 18 }}>
        <span className="badge badge-green"><CheckCircle2 size={13} /> Đặt hàng</span>
        <span className="tiny muted">→</span>
        <span className={`badge ${hasCancelled ? 'badge-red' : 'badge-blue'}`}><QrCode size={13} /> Thanh toán</span>
        <span className="tiny muted">→</span>
        <span className="badge">Hoàn tất</span>
      </div>

      {allPaid && !hasCancelled && (
        <div className="card row" style={{ gap: 10, marginBottom: 18, borderColor: 'var(--accent-green)', background: 'var(--accent-soft)' }}>
          <CheckCircle2 size={22} color="var(--accent-green)" style={{ flexShrink: 0 }} />
          <div>
            <div className="strong">Thanh toán thành công!</div>
            <div className="tiny muted">Đang chuyển đến trang xác nhận đặt hàng...</div>
          </div>
        </div>
      )}

      {hasCancelled && (
        <div className="card row" style={{ gap: 10, marginBottom: 18, borderColor: 'var(--danger)', background: 'var(--danger-soft)' }}>
          <ShieldCheck size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div>
            <div className="strong">{allCancelled ? 'Đơn hàng đã được hủy' : 'Có đơn đã được hủy'}</div>
            <div className="tiny muted">
              {allCancelled
                ? 'Không cần thanh toán nữa. Bạn có thể kiểm tra lại trong danh sách đơn hàng.'
                : 'Đơn bị hủy không cần thanh toán; các đơn còn lại vẫn thanh toán bình thường.'}
            </div>
          </div>
        </div>
      )}

      <div className="split-layout" style={{ '--split-side': '310px' }}>
        <div className="stack">
          {placed.map((order) => (
            <div key={order.id} className="card stack" style={{ gap: 12 }}>
              <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div className="strong">Đơn {order.code}</div>
                  <div className="tiny muted">{order.shopName || 'Bookigma'} · {dateTime(order.createdAt)}</div>
                </div>
                <PaymentBadge order={order} />
              </div>

              <hr className="divider" style={{ margin: 0 }} />

              {order.paidAt ? (
                <div className="row" style={{ gap: 10 }}>
                  <CheckCircle2 size={30} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                  <div>
                    <div className="small strong">Đã thanh toán</div>
                    <div className="tiny muted">Shop xác nhận lúc {dateTime(order.paidAt)}</div>
                  </div>
                </div>
              ) : order.status === 'cancelled' ? (
                <div className="small muted">Đơn đã hủy, không cần thanh toán.</div>
              ) : (
                <>
                  <PaymentQr order={order} />
                  {order.paymentExpiresAt && (
                    <div className="tiny muted">
                      Đơn sẽ tự hủy nếu chưa thanh toán trước {dateTime(order.paymentExpiresAt)}.
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          <div className="card row" style={{ gap: 10, background: 'var(--bg-soft)' }}>
            <ShieldCheck size={18} color="var(--accent-green)" style={{ flexShrink: 0 }} />
            <p className="tiny muted" style={{ margin: 0, lineHeight: 1.6 }}>
              Chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản là mã đơn để shop đối chiếu.
              Nếu đã chuyển khoản, bạn chỉ cần chờ trong giây lát — trang sẽ tự cập nhật khi shop xác nhận.
            </p>
          </div>
        </div>

        <div className="card stack sticky-rail" style={{ gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Thông tin thanh toán</h3>

          <div className="row-between small">
            <span className="muted">Mã đơn</span>
            <span className="strong" style={{ textAlign: 'right' }}>{placed.map((order) => order.code).join(', ')}</span>
          </div>
          <div className="row-between small">
            <span className="muted">Số đơn cần thanh toán</span>
            <span>{payable.length}{hasCancelled ? ` / ${placed.length}` : ''}</span>
          </div>
          <div className="row-between small">
            <span className="muted">Phương thức</span>
            <span>{PAYMENT_LABEL[first.payment]}</span>
          </div>
          <div className="row-between small">
            <span className="muted">Trạng thái</span>
            {payable.length === 0 ? (
              <span className="badge badge-red">Đã hủy</span>
            ) : placed.length === 1 ? (
              <PaymentBadge order={first} />
            ) : (
              <span className={`badge ${allPaid ? 'badge-green' : 'badge-amber'}`}>
                {paidCount}/{payable.length} đơn đã thanh toán
              </span>
            )}
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          <div className="row-between">
            <span className="strong">Tổng thanh toán</span>
            <span className="price" style={{ fontSize: 22 }}>{currency(total)}</span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={checkNow}
            disabled={checking || settled}
          >
            <RefreshCw size={15} /> {checking ? 'Đang kiểm tra...' : 'Kiểm tra thanh toán'}
          </button>
          <p className="tiny muted" style={{ margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            Tự động kiểm tra mỗi 5 giây khi trang đang mở.
          </p>
          <Link to={`/orders/${first.id}`} className="btn btn-ghost btn-block">Xem chi tiết đơn hàng</Link>
        </div>
      </div>
    </div>
  );
}
