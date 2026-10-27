import { Crown, Gift, Ticket, Truck } from 'lucide-react';
import {
  VOUCHER_SOURCE_LABEL, isShippingVoucher, voucherConditions, voucherExpiryText, voucherTitle,
} from '../../lib/vouchers';
import './vouchers.css';

function ticketKind(voucher) {
  if (isShippingVoucher(voucher)) return { kind: 'ship', Icon: Truck, stub: 'FREESHIP' };
  if (voucher.source.startsWith('vip')) return { kind: 'vip', Icon: Crown, stub: 'VIP' };
  if (voucher.source === 'reward') return { kind: 'reward', Icon: Gift, stub: 'ĐỔI ĐIỂM' };
  return { kind: 'shop', Icon: Ticket, stub: 'BOOKIGMA' };
}

/** Vé voucher kiểu Shopee: cuống màu bên trái, điều kiện và hạn dùng bên phải. */
export default function VoucherTicket({ voucher, blocker = null, selected = false, onSelect, action }) {
  const { kind, Icon, stub } = ticketKind(voucher);
  const clickable = Boolean(onSelect) && !blocker;
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <div
      className={`voucher-ticket is-${kind}${selected ? ' is-selected' : ''}${blocker ? ' is-disabled' : ''}`}
      onClick={clickable ? onSelect : undefined}
      role={onSelect ? 'radio' : undefined}
      aria-checked={onSelect ? selected : undefined}
      aria-disabled={onSelect ? Boolean(blocker) : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? handleKey : undefined}
    >
      <div className="voucher-ticket-stub">
        <Icon size={22} />
        <span>{stub}</span>
      </div>
      <div className="voucher-ticket-body">
        <div className="voucher-ticket-title">{voucherTitle(voucher)}</div>
        <div className="voucher-ticket-sub">{voucherConditions(voucher)}</div>
        <div className="voucher-ticket-meta">
          <span className="voucher-ticket-tag">{VOUCHER_SOURCE_LABEL[voucher.source] || 'Voucher'}</span>
          <span>{voucherExpiryText(voucher)}</span>
        </div>
        <div className="voucher-ticket-code">Mã: {voucher.code}</div>
        {blocker && <div className="voucher-ticket-warn">{blocker}</div>}
      </div>
      {(action || onSelect) && (
        <div className="voucher-ticket-action">
          {action ?? <span className={`voucher-radio${selected ? ' is-on' : ''}`} aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}
