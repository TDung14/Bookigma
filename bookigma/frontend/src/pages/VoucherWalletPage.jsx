import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Gift, Info, Ticket } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { useVipPerks } from '../hooks/useVipPerks';
import VoucherTicket from '../components/vouchers/VoucherTicket';
import { currency } from '../lib/format';
import { isShippingVoucher, normalizeVoucher } from '../lib/vouchers';
import { claimDailyVoucher } from '../services/perkApi';
import '../components/vouchers/vouchers.css';

const TABS = [
  { id: 'all', label: 'Tất cả', match: () => true },
  { id: 'discount', label: 'Giảm giá', match: (v) => v.scope !== 'vip' && !isShippingVoucher(v) },
  { id: 'shipping', label: 'Vận chuyển', match: (v) => isShippingVoucher(v) },
  { id: 'vip', label: 'Gia hạn VIP', match: (v) => v.scope === 'vip' },
];

const timeOfDay = (epochMs) => new Date(epochMs).toLocaleString('vi-VN', {
  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
});

/** Kho voucher như Shopee: voucher toàn sàn, voucher đổi điểm, voucher VIP và mã gia hạn VIP. */
export default function VoucherWalletPage() {
  const { vouchers, refreshMyVouchers, getCart } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const { perks, refresh: refreshPerks } = useVipPerks(user.id);
  const [tab, setTab] = useState('all');
  const [claiming, setClaiming] = useState(false);

  // Ví có thể vừa thay đổi ở nơi khác (kích hoạt VIP, hủy đơn...) nên tải lại khi mở trang
  useEffect(() => {
    refreshMyVouchers().catch(() => {});
  }, [refreshMyVouchers]);

  const list = useMemo(() => vouchers.map(normalizeVoucher).filter((v) => v.code), [vouchers]);
  const shown = list.filter(TABS.find((t) => t.id === tab).match);
  const hasCart = getCart(user.id).length > 0;

  const claimDaily = async () => {
    setClaiming(true);
    try {
      const res = await claimDailyVoucher();
      await Promise.all([refreshMyVouchers(), refreshPerks()]);
      toast(`Bạn nhận được voucher giảm ${Number(res?.voucher?.value) || ''}% hôm nay 🎉`);
    } catch (error) {
      toast(error.message || 'Không nhận được voucher hôm nay.', 'error');
    } finally {
      setClaiming(false);
    }
  };

  const daily = perks?.dailyVoucher;
  const dailyVoucher = daily?.voucher ? normalizeVoucher(daily.voucher) : null;
  const rules = perks?.rules;

  const voucherAction = (voucher) => (voucher.scope === 'vip' ? (
    <Link className="btn btn-soft btn-sm" to={`/upgrade?coupon=${encodeURIComponent(voucher.code)}`}>Dùng</Link>
  ) : (
    <Link className="btn btn-soft btn-sm" to={hasCart ? '/cart' : '/shop'}>Dùng ngay</Link>
  ));

  return (
    <div className="main-layout" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <h1>Kho voucher</h1>
        <p>Voucher toàn sàn, voucher đổi điểm và quyền lợi VIP của bạn</p>
      </div>

      {perks?.vip ? (
        <div className="card voucher-daily-card">
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="voucher-daily-icon"><Gift size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong">Voucher VIP mỗi ngày</div>
              <div className="small muted">
                Mỗi ngày nhận ngẫu nhiên 1 mã giảm {rules ? `${Math.min(...rules.dailyVoucherPercents)}-${Math.max(...rules.dailyVoucherPercents)}` : '10-30'}%
                {rules ? `, tối đa ${currency(Number(rules.dailyVoucherMaxDiscount))}, hạn ${rules.dailyVoucherValidDays} ngày` : ''}.
              </div>
              {daily?.claimedToday && (
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  Đã nhận hôm nay · Lượt tiếp theo lúc {timeOfDay(daily.nextClaimAtEpochMs)}
                </div>
              )}
            </div>
            {!daily?.claimedToday && (
              <button className="btn btn-primary" disabled={claiming} onClick={claimDaily}>
                {claiming ? 'Đang mở...' : 'Nhận ngay'}
              </button>
            )}
          </div>
          {dailyVoucher && (
            <div style={{ marginTop: 12 }}>
              <VoucherTicket voucher={dailyVoucher} action={voucherAction(dailyVoucher)} />
            </div>
          )}
        </div>
      ) : perks && (
        <Link to="/upgrade" className="card voucher-daily-card is-upsell">
          <div className="row" style={{ gap: 12 }}>
            <div className="voucher-daily-icon"><Crown size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="strong">Thành viên VIP nhận voucher mỗi ngày</div>
              <div className="small muted">
                Voucher giảm 10-30% mỗi ngày, mã giảm giá mua sách, đổi sách miễn phí và ebook premium mỗi tuần.
              </div>
            </div>
            <span className="btn btn-primary btn-sm">Nâng cấp</span>
          </div>
        </Link>
      )}

      <div className="tabs" style={{ margin: '18px 0 14px' }}>
        {TABS.map((t) => {
          const count = list.filter(t.match).length;
          return (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}{count > 0 ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card empty">
          <Ticket size={28} />
          <h3>Chưa có voucher</h3>
          <p className="small muted">Đổi voucher bằng điểm ở trang Nhiệm vụ hoặc nâng cấp VIP để nhận thêm voucher.</p>
          <Link to="/rewards" className="btn btn-soft btn-sm">Đổi điểm lấy voucher</Link>
        </div>
      ) : (
        <div className="voucher-wallet-grid">
          {shown.map((voucher) => (
            <VoucherTicket key={voucher.code} voucher={voucher} action={voucherAction(voucher)} />
          ))}
        </div>
      )}

      <p className="tiny muted row" style={{ gap: 6, marginTop: 16 }}>
        <Info size={13} /> Mỗi đơn dùng tối đa 1 mã giảm giá và 1 mã miễn phí vận chuyển. Mã gia hạn VIP chỉ dùng khi mua gói VIP.
      </p>
    </div>
  );
}
