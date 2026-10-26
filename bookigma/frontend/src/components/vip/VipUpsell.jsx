import { Link } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useStore';
import { useVip } from '../../hooks/useVip';
import { currency, dateOnly } from '../../lib/format';
import { VIP_PLANS, getVipPlan } from '../../lib/vip';
import './vip-upsell.css';

export default function VipUpsell({ showPlans = false, compact = false, className = '' }) {
  const { user } = useAuth();
  const { isVip, record, daysLeft } = useVip(user?.id ?? null);
  const activePlan = isVip ? getVipPlan(record?.planId) : null;

  if (compact) {
    return (
      <section className={`vip-upsell vip-upsell-compact ${isVip ? 'is-active' : ''} ${className}`.trim()}>
        <div className="vip-upsell-compact-copy">
          <span className="vip-upsell-eyebrow"><Crown size={13} /> Bookigma VIP</span>
          <p className="vip-upsell-text">
            {isVip
              ? <>Còn <strong>{daysLeft} ngày</strong> · hết hạn {dateOnly(record.expiresAt)}</>
              : 'Mở khoá nhạc Góc đọc, ebook mỗi tuần và ưu đãi riêng.'}
          </p>
        </div>
        <Link to="/upgrade" className="btn btn-sm vip-upsell-cta vip-upsell-compact-cta">
          {isVip ? 'Quản lý' : 'Nâng cấp'}
        </Link>
      </section>
    );
  }

  return (
    <section className={`vip-upsell ${isVip ? 'is-active' : ''} ${className}`.trim()}>
      <span className="vip-upsell-eyebrow"><Crown size={14} /> Bookigma VIP</span>

      {isVip ? (
        <>
          <h4>{activePlan?.name || 'Thành viên VIP'}</h4>
          <p className="vip-upsell-text">
            Còn <strong>{daysLeft} ngày</strong> · hết hạn {dateOnly(record.expiresAt)}
          </p>
          <Link to="/upgrade" className="btn btn-sm btn-block vip-upsell-cta">
            Gia hạn hoặc đổi gói
          </Link>
        </>
      ) : (
        <>
          <h4>Mở khoá trọn bộ trải nghiệm đọc</h4>
          <ul className="vip-upsell-perks">
            <li><Check size={13} /> Mở khoá toàn bộ nhạc Góc đọc</li>
            <li><Check size={13} /> Thêm tủ sách và ebook mỗi tuần</li>
            <li><Check size={13} /> Nhận điểm và mã giảm giá</li>
          </ul>

          {showPlans ? (
            <div className="vip-upsell-plans">
              {VIP_PLANS.map((plan) => (
                <Link key={plan.id} to={`/upgrade?plan=${plan.id}`} className="vip-upsell-plan">
                  <span>
                    {plan.durationLabel}
                    {plan.popular && <em>Phổ biến</em>}
                  </span>
                  <strong>{currency(plan.price)}</strong>
                </Link>
              ))}
            </div>
          ) : (
            <Link to="/upgrade" className="btn btn-sm btn-block vip-upsell-cta">
              Xem 3 gói nâng cấp
            </Link>
          )}

          {showPlans && (
            <Link to="/upgrade" className="vip-upsell-more">So sánh đầy đủ quyền lợi →</Link>
          )}
        </>
      )}
    </section>
  );
}
