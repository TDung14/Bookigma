import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Minus, Plus, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency } from '../lib/format';
import { SHIPPING_FEE, cartSubtotal, countParcels, groupCartLines, linePrice } from '../lib/cart';
import { EmptyState } from '../components/common/ui';

export default function CartPage() {
  const { getCart, updateCartQty, removeCartItem, refreshCart, shopById, accountReady } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busyLine, setBusyLine] = useState(null);

  // Tồn kho có thể đã đổi từ lần mở trước, nên lấy lại giỏ mới nhất từ server.
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const lines = getCart(user.id);
  // Giỏ được tách thành đơn riêng cho từng shop, mỗi hộp Blind Book cũng là một đơn riêng.
  const groups = groupCartLines(lines);
  const parcels = countParcels(lines);
  const subtotal = cartSubtotal(lines);
  const shipping = parcels * SHIPPING_FEE;
  const hasUnavailable = lines.some((line) => !line.available);

  const run = async (lineId, action, successMessage) => {
    setBusyLine(lineId);
    try {
      await action();
      if (successMessage) toast(successMessage, 'info');
    } catch (error) {
      toast(error.message || 'Không thể cập nhật giỏ hàng.', 'error');
    } finally {
      setBusyLine(null);
    }
  };

  if (!accountReady) {
    return (
      <div className="main-layout">
        <div className="page-head"><h1>Giỏ hàng</h1></div>
        <div className="card"><EmptyState icon={ShoppingCart} title="Đang tải giỏ hàng..." /></div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="main-layout">
        <div className="page-head"><h1>Giỏ hàng</h1></div>
        <div className="card">
          <EmptyState
            icon={ShoppingCart}
            title="Giỏ hàng của bạn đang trống"
            hint="Khám phá hàng nghìn đầu sách chính hãng trên Bookigma Shop."
            action={<Link to="/shop" className="btn btn-primary">Bắt đầu mua sắm</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout">
      <div className="page-head">
        <h1>Giỏ hàng</h1>
        <p>{lines.length} sản phẩm · sẽ được tách thành {parcels} đơn hàng theo nhà bán</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,330px)', gap: 20, alignItems: 'start' }}>
        <div className="stack">
          {groups.map((group) => (
            <div key={group.key} className="card">
              <div className="row" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
                {group.blind ? <Gift size={17} color="var(--accent-green)" /> : <Store size={17} color="var(--accent-green)" />}
                <span className="strong small">
                  {group.blind ? 'Hộp Blind Book' : shopById(group.shopId)?.name || group.shopName || 'Bookigma'}
                </span>
                {group.blind && <span className="tiny muted">· mỗi hộp được đóng gói và giao thành một đơn riêng</span>}
              </div>

              {group.lines.map((line) => {
                const { book, qty, blind } = line;
                const busy = busyLine === line.id;
                return (
                  <div key={line.id} className="row" style={{ padding: '14px 0', borderBottom: '1px solid var(--border-color)', gap: 14, alignItems: 'flex-start', opacity: busy ? 0.6 : 1 }}>
                    {blind ? (
                      <div
                        className="book-cover row"
                        style={{ width: 66, height: 90, justifyContent: 'center', fontSize: 34, background: 'var(--accent-soft)' }}
                        aria-label="Hộp Blind Book"
                      >
                        🎁
                      </div>
                    ) : (
                      <Link to={`/book/${book.id}`}>
                        <img src={book.cover} alt="" className="book-cover" style={{ width: 66, height: 90 }} />
                      </Link>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {blind ? (
                        <>
                          <h4 className="clamp-2" style={{ margin: '0 0 4px', fontSize: 15 }}>{blind.tierName}</h4>
                          <p className="tiny muted" style={{ margin: '0 0 8px' }}>Tâm trạng: {blind.moodLabel} · Nội dung được giấu tới khi mở hộp</p>
                        </>
                      ) : (
                        <>
                          <Link to={`/book/${book.id}`}>
                            <h4 className="clamp-2" style={{ margin: '0 0 4px', fontSize: 15 }}>{book.title}</h4>
                          </Link>
                          <p className="tiny muted" style={{ margin: '0 0 8px' }}>{book.author}</p>
                        </>
                      )}
                      <div className="price">{currency(linePrice(line))}</div>
                      {!line.available && (
                        <div className="badge badge-red" style={{ marginTop: 6 }}>{line.unavailableReason}</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {!blind && (
                        <div className="row" style={{ gap: 0, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                          <button
                            className="btn-icon"
                            style={{ borderRadius: 0, padding: 5 }}
                            disabled={busy || qty <= 1}
                            onClick={() => run(line.id, () => updateCartQty(line.id, qty - 1))}
                            aria-label="Giảm số lượng"
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{qty}</span>
                          <button
                            className="btn-icon"
                            style={{ borderRadius: 0, padding: 5 }}
                            disabled={busy}
                            onClick={() => (qty < book.stock
                              ? run(line.id, () => updateCartQty(line.id, qty + 1))
                              : toast('Đã đạt số lượng tồn kho tối đa.', 'error'))}
                            aria-label="Tăng số lượng"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                      <div className="strong" style={{ marginBottom: 8 }}>{currency(linePrice(line) * qty)}</div>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--danger)' }}
                        disabled={busy}
                        onClick={() => run(line.id, () => removeCartItem(line.id), 'Đã xóa khỏi giỏ hàng.')}
                        aria-label="Xóa sản phẩm"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Tóm tắt */}
        <div className="card stack" style={{ position: 'sticky', top: 76 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Tóm tắt đơn hàng</h3>
          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between small"><span className="muted">Tạm tính</span><span className="strong">{currency(subtotal)}</span></div>
          <div className="row-between small">
            <span className="muted">Phí vận chuyển ({parcels} đơn × {currency(SHIPPING_FEE)})</span>
            <span className="strong">{currency(shipping)}</span>
          </div>
          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between">
            <span className="strong">Tổng cộng</span>
            <span className="price" style={{ fontSize: 22 }}>{currency(subtotal + shipping)}</span>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>Mã giảm giá sẽ được áp dụng ở bước thanh toán.</p>
          {hasUnavailable && (
            <div className="badge badge-red" style={{ padding: '8px 10px' }}>
              Có sản phẩm không còn đủ hàng — hãy xóa hoặc giảm số lượng trước khi thanh toán.
            </div>
          )}
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/payment')} disabled={hasUnavailable}>
            Tiến hành thanh toán
          </button>
          <Link to="/shop" className="btn btn-ghost btn-block">Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
