import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency } from '../lib/format';
import { EmptyState } from '../components/common/ui';

export const SHIPPING_FEE = 25000;

export default function CartPage() {
  const { getCart, setCartQty, removeFromCart, bookById, shopById } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const cart = getCart(user.id);

  const lines = useMemo(
    () => cart.map((c) => ({ ...c, book: bookById(c.bookId) })).filter((l) => l.book),
    [cart, bookById]
  );

  // Nhóm theo shop để người mua thấy rõ đơn sẽ được tách theo từng nhà bán.
  const groups = useMemo(() => {
    const map = {};
    lines.forEach((l) => {
      (map[l.book.shopId] ||= []).push(l);
    });
    return Object.entries(map);
  }, [lines]);

  // Hộp Blind Book tính theo giá hộp, không theo giá cuốn sách được giấu bên trong.
  const linePrice = (l) => (l.blind ? l.blind.price : l.book.price);
  const subtotal = lines.reduce((s, l) => s + linePrice(l) * l.qty, 0);
  const shipping = lines.length ? SHIPPING_FEE : 0;

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
        <p>{lines.length} sản phẩm từ {groups.length} nhà bán</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,330px)', gap: 20, alignItems: 'start' }}>
        <div className="stack">
          {groups.map(([shopId, items]) => (
            <div key={shopId} className="card">
              <div className="row" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
                <Store size={17} color="var(--accent-green)" />
                <span className="strong small">{shopById(shopId)?.name}</span>
              </div>

              {items.map(({ book, qty, blind }) => (
                <div key={blind ? `blind-${book.id}` : book.id} className="row" style={{ padding: '14px 0', borderBottom: '1px solid var(--border-color)', gap: 14, alignItems: 'flex-start' }}>
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
                    <div className="price">{currency(blind ? blind.price : book.price)}</div>
                    {!blind && qty > book.stock && (
                      <div className="badge badge-red" style={{ marginTop: 6 }}>Chỉ còn {book.stock} cuốn trong kho</div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="row" style={{ gap: 0, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', marginBottom: 10, display: blind ? 'none' : 'flex' }}>
                      <button className="btn-icon" style={{ borderRadius: 0, padding: 5 }} onClick={() => setCartQty(user.id, book.id, qty - 1)} aria-label="Giảm số lượng">
                        <Minus size={14} />
                      </button>
                      <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{qty}</span>
                      <button
                        className="btn-icon"
                        style={{ borderRadius: 0, padding: 5 }}
                        onClick={() => (qty < book.stock ? setCartQty(user.id, book.id, qty + 1) : toast('Đã đạt số lượng tồn kho tối đa.', 'error'))}
                        aria-label="Tăng số lượng"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="strong" style={{ marginBottom: 8 }}>{currency((blind ? blind.price : book.price) * qty)}</div>
                    <button
                      className="btn-icon"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => { removeFromCart(user.id, book.id); toast('Đã xóa khỏi giỏ hàng.', 'info'); }}
                      aria-label="Xóa sản phẩm"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Tóm tắt */}
        <div className="card stack" style={{ position: 'sticky', top: 76 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Tóm tắt đơn hàng</h3>
          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between small"><span className="muted">Tạm tính</span><span className="strong">{currency(subtotal)}</span></div>
          <div className="row-between small"><span className="muted">Phí vận chuyển</span><span className="strong">{currency(shipping)}</span></div>
          <hr className="divider" style={{ margin: 0 }} />
          <div className="row-between">
            <span className="strong">Tổng cộng</span>
            <span className="price" style={{ fontSize: 22 }}>{currency(subtotal + shipping)}</span>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>Mã giảm giá sẽ được áp dụng ở bước thanh toán.</p>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/checkout')}>
            Tiến hành thanh toán
          </button>
          <Link to="/shop" className="btn btn-ghost btn-block">Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
