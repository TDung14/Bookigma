import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck, Check, CheckCircle2, ChevronRight, CreditCard, Crown, Info,
  QrCode, RefreshCw, ShieldCheck, Sparkles, Ticket, Wallet, Zap,
} from 'lucide-react';
import Modal from '../components/common/Modal';
import { currency, dateOnly, dateTime } from '../lib/format';
import { PAYEE, vietQrUrl } from '../lib/payment';
import { VIP_PLANS, planPerkLabels, syncVipFromServer } from '../lib/vip';
import { useVip } from '../hooks/useVip';
import { useAuth, useToast } from '../hooks/useStore';
import { getPointsSummary } from '../services/pointsApi';
import { createVipPurchase, getVipMe, getVipPurchase } from '../services/vipApi';
import './upgrade.css';

export default function UpgradePage() {
  const { user, updateUserFields } = useAuth();
  const { record, isVip, plan: activePlan, daysLeft } = useVip(user.id);
  const toast = useToast();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [method, setMethod] = useState('bank');
  const [coupon, setCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponTone, setCouponTone] = useState('info');
  const [lastPurchase, setLastPurchase] = useState(null);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const paidNotified = useRef(false);
  const preselectedPlan = useRef(false);
  const [searchParams] = useSearchParams();
  const requestedPlanId = searchParams.get('plan');

  useEffect(() => {
    let cancelled = false;
    getVipMe(user.id)
      .then((vip) => {
        if (!cancelled) syncVipFromServer(user.id, vip);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.id]);

  const markPaid = useCallback((fresh) => {
    if (paidNotified.current) return;
    paidNotified.current = true;
    syncVipFromServer(user.id, fresh.vip);
    setPurchase(fresh);
    setLastPurchase({
      name: fresh.planName,
      points: Number(fresh.points || 0),
      extraShelves: Number(fresh.extraShelves || 0),
    });
    setSelectedPlan(null);
    toast(`Ngân hàng đã xác nhận thanh toán. ${fresh.planName} đã được kích hoạt.`);
    getPointsSummary(user.id)
      .then((summary) => updateUserFields({ points: summary.balance }))
      .catch(() => {});
  }, [toast, updateUserFields, user.id]);

  const openCheckout = (plan) => {
    paidNotified.current = false;
    setSelectedPlan(plan);
    setPurchase(null);
    setMethod('bank');
    setCoupon('');
    setCouponMessage('');
    setCouponTone('info');
    setChecking(false);
  };

  const closeCheckout = () => {
    if (creating) return;
    setSelectedPlan(null);
    setPurchase(null);
  };

  const applyCoupon = () => {
    const code = coupon.trim();
    if (!code) {
      setCouponTone('error');
      setCouponMessage('Vui lòng nhập mã giảm giá.');
      return;
    }
    setCouponTone('info');
    setCouponMessage(
      `Mã "${code}" chưa được mở trong phiên bản này. Số tiền chuyển khoản do hệ thống tạo và không thay đổi.`
    );
  };

  const startPayment = async () => {
    if (!selectedPlan || creating) return;
    setCreating(true);
    try {
      const created = await createVipPurchase(user.id, selectedPlan.id);
      setPurchase(created);
      if (created.vip) syncVipFromServer(user.id, created.vip);
      if (created.status === 'PAID') markPaid(created);
    } catch (error) {
      toast(error.message || 'Không tạo được đơn thanh toán VIP.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const refreshStatus = async (notify = false) => {
    if (!purchase?.id || checking) return;
    setChecking(true);
    try {
      const fresh = await getVipPurchase(user.id, purchase.id);
      setPurchase(fresh);
      if (fresh.status === 'PAID') {
        markPaid(fresh);
      } else if (notify) {
        toast('Chưa nhận được xác nhận từ ngân hàng. Vui lòng chờ thêm ít phút.', 'info');
      }
    } catch (error) {
      if (notify) toast(error.message || 'Không kiểm tra được trạng thái thanh toán.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const purchaseId = purchase?.id;
  const purchaseStatus = purchase?.status;

  useEffect(() => {
    if (!selectedPlan || !purchaseId || purchaseStatus !== 'PENDING') return undefined;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const fresh = await getVipPurchase(user.id, purchaseId);
        if (stopped) return;
        setPurchase(fresh);
        if (fresh.status === 'PAID') markPaid(fresh);
      } catch {
        // Lỗi mạng tạm thời: giữ trạng thái chờ và thử lại ở nhịp sau.
      }
    }, 4000);
    return () => { stopped = true; clearInterval(timer); };
  }, [selectedPlan, purchaseId, purchaseStatus, user.id, markPaid]);

  useEffect(() => {
    if (preselectedPlan.current || !requestedPlanId) return;
    preselectedPlan.current = true;
    const plan = VIP_PLANS.find((item) => item.id === requestedPlanId);
    if (plan) openCheckout(plan);
  }, [requestedPlanId, openCheckout]);

  const transferCode = purchase?.transferCode || purchase?.qrContent || '';
  const checkoutAmount = purchase?.amount ?? selectedPlan?.price ?? 0;
  const renewing = Boolean(isVip && record?.planId === selectedPlan?.id);

  return (
    <div className="main-layout vip-page">
      <section className="vip-hero">
        <div className="vip-hero-copy">
          <span className="vip-hero-eyebrow"><Crown size={14} /> Bookigma VIP</span>
          <h1>Nâng cấp trải nghiệm đọc</h1>
          <p>
            Thêm tủ sách, mở khoá âm thanh thư giãn, nhận ebook mỗi tuần và tích điểm nhanh hơn
            với ba gói thành viên của Bookigma.
          </p>
          <div className="vip-hero-meta">
            <span><ShieldCheck size={14} /> Kích hoạt sau khi ngân hàng xác nhận</span>
            <span><Sparkles size={14} /> Gia hạn cộng dồn thời gian</span>
          </div>
        </div>
        <span className="vip-hero-art" aria-hidden="true">
          <Crown size={176} strokeWidth={1.05} />
        </span>
      </section>

      {isVip && (
        <div className="vip-active-strip">
          <div className="vip-active-main">
            <span className="vip-active-icon"><Crown size={18} /></span>
            <div>
              <strong>Bạn đang là thành viên VIP</strong>
              <span>
                {activePlan?.name} · còn {daysLeft} ngày · hết hạn {dateOnly(record.expiresAt)}
              </span>
            </div>
          </div>
          <div className="vip-active-side">
            <span>+{record.extraShelves} tủ sách</span>
            {record.pointBonusPercent > 0 && <span>+{record.pointBonusPercent}% điểm</span>}
            <span>Nhạc đã mở khoá</span>
          </div>
        </div>
      )}

      {lastPurchase && (
        <div className="vip-success">
          <CheckCircle2 size={21} />
          <div>
            <strong>Đã xác nhận thanh toán {lastPurchase.name}!</strong>
            <p>
              Ngân hàng báo tiền về, hệ thống đã cộng {lastPurchase.points.toLocaleString('vi-VN')} điểm,
              thêm {lastPurchase.extraShelves} tủ sách và mở khoá toàn bộ nhạc trong Góc đọc.
            </p>
          </div>
          <Link to="/settings" className="btn btn-soft btn-sm">Xem quyền lợi</Link>
        </div>
      )}

      <div className="vip-section-head">
        <div>
          <h2>Chọn gói phù hợp với bạn</h2>
          <p>Thanh toán một lần, dùng ngay toàn bộ quyền lợi trong suốt thời gian của gói.</p>
        </div>
        <span className="badge badge-green"><ShieldCheck size={13} /> Không tự động trừ tiền</span>
      </div>

      <div className="vip-plan-grid">
        {VIP_PLANS.map((plan) => {
          const isCurrent = Boolean(isVip && record?.planId === plan.id);
          return (
            <article
              key={plan.id}
              className={`vip-plan ${plan.popular ? 'is-popular' : ''} ${isCurrent ? 'is-current' : ''}`}
            >
              {plan.popular && <span className="vip-plan-ribbon">Được chọn nhiều nhất</span>}

              <header className="vip-plan-head">
                <div className="vip-plan-name-row">
                  <span className="vip-plan-name">{plan.name}</span>
                  {isCurrent && (
                    <span className="vip-current-tag"><BadgeCheck size={12} /> Hiện tại</span>
                  )}
                </div>
                <div className="vip-plan-price">
                  <strong>{currency(plan.price)}</strong>
                  <span>/ {plan.durationLabel}</span>
                </div>
                <p>{plan.tagline}</p>
              </header>

              <ul className="vip-plan-perks">
                {planPerkLabels(plan).map((label) => (
                  <li key={label}><Check size={14} /> {label}</li>
                ))}
              </ul>

              <button
                type="button"
                className={`btn btn-block vip-plan-cta ${plan.popular ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => openCheckout(plan)}
              >
                {isCurrent ? 'Gia hạn gói này' : isVip ? 'Chuyển sang gói này' : 'Chọn gói này'}
                <ChevronRight size={15} />
              </button>
            </article>
          );
        })}
      </div>

      <div className="vip-assurance">
        <div>
          <span className="vip-assurance-icon"><QrCode size={18} /></span>
          <strong>Thanh toán bằng VietQR</strong>
          <p>Quét mã bằng app ngân hàng hoặc MoMo, số tiền và nội dung do Bookigma cấp riêng.</p>
        </div>
        <div>
          <span className="vip-assurance-icon"><Zap size={18} /></span>
          <strong>Tự động xác nhận</strong>
          <p>Khi ngân hàng báo tiền về, đơn VIP được kích hoạt mà bạn không cần bấm xác nhận.</p>
        </div>
        <div>
          <span className="vip-assurance-icon"><ShieldCheck size={18} /></span>
          <strong>Gia hạn linh hoạt</strong>
          <p>Mua thêm gói khi đang VIP sẽ cộng dồn thời gian và quyền lợi, không mất ngày còn lại.</p>
        </div>
      </div>

      <Modal
        open={Boolean(selectedPlan)}
        title="Thanh toán gói VIP"
        width={660}
        onClose={closeCheckout}
        footer={
          selectedPlan && (
            <>
              <button type="button" className="btn btn-soft" onClick={closeCheckout} disabled={creating}>
                Đóng
              </button>
              {purchase?.status === 'PENDING' ? (
                <button type="button" className="btn btn-primary" onClick={() => refreshStatus(true)} disabled={checking}>
                  <RefreshCw size={16} /> {checking ? 'Đang kiểm tra...' : 'Kiểm tra thanh toán'}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={startPayment} disabled={creating}>
                  <QrCode size={16} />
                  {creating
                    ? 'Đang tạo mã...'
                    : purchase
                      ? 'Tạo mã thanh toán mới'
                      : 'Tạo mã thanh toán'}
                </button>
              )}
            </>
          )
        }
      >
        {selectedPlan && (
          <div className="vip-checkout">
            <div className="vip-checkout-plan">
              <div>
                <span>Gói đã chọn</span>
                <strong>{selectedPlan.name}</strong>
                <small>
                  {selectedPlan.days} ngày · {planPerkLabels(selectedPlan).length} quyền lợi VIP
                  {renewing ? ' · gia hạn cộng dồn' : ''}
                </small>
              </div>
              <b>{currency(checkoutAmount)}</b>
            </div>

            <div className="vip-coupon">
              <label className="label" htmlFor="vip-coupon-input">Mã giảm giá</label>
              <div className="vip-coupon-row">
                <div className="vip-coupon-input">
                  <Ticket size={15} />
                  <input
                    id="vip-coupon-input"
                    value={coupon}
                    onChange={(event) => setCoupon(event.target.value)}
                    placeholder="Nhập mã giảm giá (nếu có)"
                    autoComplete="off"
                  />
                </div>
                <button type="button" className="btn btn-soft" onClick={applyCoupon}>
                  Áp dụng
                </button>
              </div>
              {couponMessage && (
                <p className={`vip-coupon-msg ${couponTone === 'error' ? 'is-error' : ''}`}>
                  {couponMessage}
                </p>
              )}
              <p className="vip-coupon-hint">
                Khu vực mã giảm giá đã sẵn sàng. Hiện chưa có mã khả dụng trong bản này.
              </p>
            </div>

            <div className="vip-pay-methods" role="group" aria-label="Phương thức thanh toán">
              <button
                type="button"
                className={method === 'bank' ? 'is-active' : ''}
                onClick={() => setMethod('bank')}
              >
                <Wallet size={16} /> Chuyển khoản ngân hàng
              </button>
              <button
                type="button"
                className={method === 'momo' ? 'is-active' : ''}
                onClick={() => setMethod('momo')}
              >
                <CreditCard size={16} /> Ví MoMo
              </button>
            </div>

            {purchase ? (
              <>
                <div className="vip-qr-panel">
                  <img
                    src={vietQrUrl(checkoutAmount, transferCode)}
                    alt={`Mã QR thanh toán gói ${selectedPlan.name}`}
                    width={156}
                    height={185}
                  />
                  <div className="vip-bank-info">
                    <strong>
                      {method === 'momo'
                        ? 'Mở app MoMo → Quét mã QR'
                        : 'Mở app ngân hàng → Quét mã QR'}
                    </strong>
                    <div><span>Số tiền</span><b>{currency(checkoutAmount)}</b></div>
                    <div><span>Nội dung</span><b>{transferCode}</b></div>
                    <div><span>Ngân hàng</span><b>{PAYEE.bankName} · {PAYEE.accountNo}</b></div>
                    <div><span>Chủ tài khoản</span><b>{PAYEE.accountName}</b></div>
                    <p>Giữ nguyên số tiền và nội dung chuyển khoản để hệ thống đối chiếu đúng đơn VIP.</p>
                  </div>
                </div>

                {purchase.status === 'PENDING' && (
                  <p className="vip-payment-note">
                    <Info size={15} />
                    Đang chờ ngân hàng xác nhận. Đơn có hiệu lực đến {dateTime(purchase.expiresAt)};
                    trang tự cập nhật khi tiền về, bạn không cần bấm xác nhận.
                  </p>
                )}
                {purchase.status === 'EXPIRED' && (
                  <p className="vip-payment-note is-warning">
                    <Info size={15} />
                    Mã chuyển khoản đã hết hạn. Hãy tạo mã thanh toán mới trước khi chuyển khoản.
                  </p>
                )}
                {purchase.status === 'CANCELLED' && (
                  <p className="vip-payment-note is-warning">
                    <Info size={15} />
                    Đơn này đã bị từ chối. Nếu bạn đã chuyển tiền, vui lòng liên hệ quản trị viên kèm mã giao dịch.
                  </p>
                )}
              </>
            ) : (
              <div className="vip-qr-placeholder">
                <span><QrCode size={28} /></span>
                <strong>Mã QR được cấp riêng cho đơn hàng</strong>
                <p>
                  Bấm "Tạo mã thanh toán" để hệ thống ghi nhận đơn và cấp nội dung chuyển khoản duy nhất.
                  VIP chỉ được kích hoạt sau khi ngân hàng xác nhận tiền về.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
