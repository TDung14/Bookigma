import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Gift } from 'lucide-react';
import Modal from '../common/Modal';
import VoucherTicket from './VoucherTicket';
import { currency } from '../../lib/format';
import { isShippingVoucher, voucherBlocker, voucherDiscount } from '../../lib/vouchers';
import './vouchers.css';

/**
 * Hộp "Chọn Bookigma Voucher" như Shopee: tối đa 1 mã miễn phí vận chuyển + 1 mã giảm giá,
 * mã chưa đủ điều kiện hiện mờ kèm lý do. Chỉ áp dụng khi bấm OK.
 * Chỉ mount khi mở để lựa chọn tạm khởi tạo lại từ lựa chọn hiện tại.
 */
export default function VoucherPicker({
  vouchers, subtotal, shippingTotal, initialDiscount, initialShipping, onApply, onClose, daily,
}) {
  const [discountCode, setDiscountCode] = useState(initialDiscount || null);
  const [shippingCode, setShippingCode] = useState(initialShipping || null);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');

  const rows = useMemo(() => vouchers.map((voucher) => ({
    voucher,
    blocker: voucherBlocker(voucher, subtotal),
    amount: voucherDiscount(voucher, subtotal),
  })), [vouchers, subtotal]);

  const byUsable = (a, b) => (a.blocker ? 1 : 0) - (b.blocker ? 1 : 0) || b.amount - a.amount;
  const shippingRows = rows.filter((row) => isShippingVoucher(row.voucher)).sort(byUsable);
  const discountRows = rows.filter((row) => !isShippingVoucher(row.voucher)).sort(byUsable);

  const chosenDiscount = rows.find((row) => row.voucher.code === discountCode && !row.blocker);
  const chosenShipping = rows.find((row) => row.voucher.code === shippingCode && !row.blocker);
  const saving = (chosenDiscount?.amount || 0) + (chosenShipping ? shippingTotal : 0);

  const applyInput = () => {
    const code = input.trim().toLowerCase();
    if (!code) return setInputError('Vui lòng nhập mã voucher.');
    const row = rows.find((item) => item.voucher.code.toLowerCase() === code);
    if (!row) return setInputError('Mã không tồn tại, đã được dùng hoặc không thuộc ví của bạn.');
    if (row.blocker) return setInputError(row.blocker);
    setInputError('');
    setInput('');
    if (isShippingVoucher(row.voucher)) setShippingCode(row.voucher.code);
    else setDiscountCode(row.voucher.code);
  };

  const toggle = (setter, current, code) => setter(current === code ? null : code);

  return (
    <Modal
      open
      width={560}
      title="Chọn Bookigma Voucher"
      onClose={onClose}
      footer={(
        <div className="voucher-picker-foot">
          <span className="small">
            {saving > 0 ? <>Tiết kiệm <b className="price">{currency(saving)}</b></> : 'Chưa chọn voucher'}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Trở lại</button>
            <button
              className="btn btn-primary"
              onClick={() => onApply({
                discount: chosenDiscount?.voucher.code || null,
                shipping: chosenShipping?.voucher.code || null,
              })}
            >
              OK
            </button>
          </div>
        </div>
      )}
    >
      <div className="voucher-picker">
        <div className="voucher-picker-input">
          <span className="small strong">Mã Voucher</span>
          <input
            className="input"
            placeholder="Nhập mã voucher"
            value={input}
            onChange={(e) => { setInput(e.target.value); setInputError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && applyInput()}
          />
          <button className="btn btn-soft" onClick={applyInput}>Áp dụng</button>
        </div>
        {inputError && <p className="voucher-picker-error">{inputError}</p>}

        {daily?.eligible && !daily.claimedToday && (
          <div className="voucher-daily-banner">
            <Gift size={18} />
            <div style={{ flex: 1 }}>
              <div className="small strong">Voucher VIP hôm nay</div>
              <div className="tiny muted">Nhận ngẫu nhiên mã giảm 10-30% cho đơn sách.</div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={daily.claiming} onClick={daily.onClaim}>
              {daily.claiming ? 'Đang mở...' : 'Nhận ngay'}
            </button>
          </div>
        )}
        {daily && !daily.eligible && (
          <Link className="voucher-daily-banner is-upsell" to="/upgrade" onClick={onClose}>
            <Crown size={18} />
            <span className="small">Thành viên VIP nhận voucher giảm 10-30% mỗi ngày</span>
          </Link>
        )}

        <section>
          <h4 className="voucher-picker-heading">Mã Miễn Phí Vận Chuyển <span className="tiny muted">· chọn 1</span></h4>
          {shippingRows.length === 0 && <p className="tiny muted">Chưa có mã miễn phí vận chuyển.</p>}
          <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label="Mã miễn phí vận chuyển">
            {shippingRows.map(({ voucher, blocker }) => (
              <VoucherTicket
                key={voucher.code}
                voucher={voucher}
                blocker={blocker}
                selected={shippingCode === voucher.code && !blocker}
                onSelect={() => toggle(setShippingCode, shippingCode, voucher.code)}
              />
            ))}
          </div>
        </section>

        <section>
          <h4 className="voucher-picker-heading">Mã Giảm Giá <span className="tiny muted">· chọn 1</span></h4>
          {discountRows.length === 0 && <p className="tiny muted">Ví của bạn chưa có mã giảm giá.</p>}
          <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label="Mã giảm giá">
            {discountRows.map(({ voucher, blocker, amount }) => (
              <VoucherTicket
                key={voucher.code}
                voucher={voucher}
                blocker={blocker}
                selected={discountCode === voucher.code && !blocker}
                onSelect={() => toggle(setDiscountCode, discountCode, voucher.code)}
                action={blocker ? undefined : (
                  <div className="stack" style={{ gap: 4, alignItems: 'center' }}>
                    <span className={`voucher-radio${discountCode === voucher.code ? ' is-on' : ''}`} aria-hidden="true" />
                    {amount > 0 && <span className="tiny strong" style={{ color: 'var(--danger)' }}>-{currency(amount)}</span>}
                  </div>
                )}
              />
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
