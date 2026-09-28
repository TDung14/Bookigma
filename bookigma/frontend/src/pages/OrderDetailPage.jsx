import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Circle, Gift, MapPin, MessageSquare, Receipt, Sparkles } from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { currency, dateTime, ORDER_FLOW, ORDER_STATUS, PAYMENT_LABEL } from '../lib/format';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { orders, updateOrderStatus, shopById, findOrCreateConversation, revealBlindBox, bookById } = useApp();

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Không tìm thấy đơn hàng</h3>
          <Link to="/orders" className="btn btn-primary btn-sm">Về danh sách đơn</Link>
        </div>
      </div>
    );
  }

  const st = ORDER_STATUS[order.status];
  const cancelled = order.status === 'cancelled';
  const currentStep = ORDER_FLOW.indexOf(order.status);
  const shop = shopById(order.items[0]?.shopId);

  const chatShop = () => {
    if (!shop?.ownerId || shop.ownerId === user.id) return;
    navigate(`/chat/${findOrCreateConversation(user.id, shop.ownerId)}`);
  };

  return (
    <div className="main-layout" style={{ maxWidth: 940 }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/orders')}>
        <ChevronLeft size={16} /> Đơn hàng của tôi
      </button>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row-between" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>Đơn hàng {order.code}</h1>
            <p className="small muted" style={{ margin: 0 }}>Đặt lúc {dateTime(order.createdAt)}</p>
          </div>
          <span className={`badge ${st.badge}`} style={{ fontSize: 13, padding: '5px 12px' }}>{st.label}</span>
        </div>

        {/* Tiến trình giao hàng */}
        {cancelled ? (
          <div className="badge badge-red" style={{ display: 'flex', padding: '10px 14px' }}>
            Đơn hàng đã bị hủy — {order.timeline[order.timeline.length - 1]?.note}
          </div>
        ) : (
          <div className="row" style={{ gap: 0, alignItems: 'flex-start' }}>
            {ORDER_FLOW.map((step, i) => {
              const done = i <= currentStep;
              const entry = order.timeline.find((t) => t.status === step);
              return (
                <div key={step} style={{ flex: 1, textAlign: 'center', position: 'relative', minWidth: 0 }}>
                  {i > 0 && (
                    <div
                      style={{
                        position: 'absolute', top: 11, right: '50%', width: '100%', height: 2,
                        background: i <= currentStep ? 'var(--accent-green)' : 'var(--border-color)',
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', display: 'inline-block', background: 'var(--bg-card)', padding: '0 4px' }}>
                    {done
                      ? <CheckCircle2 size={24} color="var(--accent-green)" />
                      : <Circle size={24} color="var(--border-color)" />}
                  </div>
                  <div className="tiny" style={{ marginTop: 6, color: done ? 'var(--text-main)' : 'var(--text-sub)', fontWeight: done ? 700 : 400 }}>
                    {ORDER_STATUS[step].label}
                  </div>
                  {entry && <div className="tiny muted" style={{ marginTop: 2 }}>{dateTime(entry.at).split(' ')[1]}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,330px)', gap: 18, alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Sản phẩm</h3>
            {order.items.map((it, idx) => {
              // Hộp Blind Book giữ bí mật cho tới khi giao xong và khách bấm mở hộp.
              if (it.blind && !it.revealed) {
                const openable = ['delivered', 'completed'].includes(order.status);
                return (
                  <div key={idx} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12, alignItems: 'flex-start' }}>
                    <div className="book-cover row" style={{ width: 52, height: 70, justifyContent: 'center', fontSize: 28, background: 'var(--accent-soft)' }}>🎁</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small strong">{it.blind.tierName}</div>
                      <div className="tiny muted" style={{ marginBottom: 8 }}>Tâm trạng: {it.blind.moodLabel} · {currency(it.price)} × {it.qty}</div>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!openable}
                        onClick={() => {
                          revealBlindBox(order.id, idx);
                          toast('Mở hộp thành công! Cùng xem bạn nhận được cuốn gì nhé 🎉');
                        }}
                      >
                        <Gift size={15} /> {openable ? 'Mở hộp ngay' : 'Mở được khi hàng đã giao'}
                      </button>
                    </div>
                    <div className="small strong">{currency(it.price * it.qty)}</div>
                  </div>
                );
              }

              const revealedBook = it.blind ? bookById(it.bookId) : null;
              return (
                <Link key={idx} to={`/book/${it.bookId}`} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', gap: 12 }}>
                  <img src={it.cover} alt="" className="book-cover" style={{ width: 52, height: 70 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {it.blind ? (
                      <>
                        <div className="row" style={{ gap: 6, marginBottom: 2 }}>
                          <Sparkles size={13} color="var(--accent-green)" />
                          <span className="tiny strong" style={{ color: 'var(--accent-green)' }}>Đã mở hộp — {it.blind.tierName}</span>
                        </div>
                        <div className="small strong clamp-2">{revealedBook?.title || it.title}</div>
                        <div className="tiny muted">{revealedBook?.author}</div>
                      </>
                    ) : (
                      <>
                        <div className="small strong clamp-2">{it.title}</div>
                        <div className="tiny muted">{currency(it.price)} × {it.qty}</div>
                      </>
                    )}
                  </div>
                  <div className="small strong">{currency(it.price * it.qty)}</div>
                </Link>
              );
            })}

            <div className="stack" style={{ gap: 8, marginTop: 14 }}>
              <div className="row-between small"><span className="muted">Tạm tính</span><span>{currency(order.subtotal)}</span></div>
              <div className="row-between small"><span className="muted">Phí vận chuyển</span><span>{order.shippingFee === 0 ? 'Miễn phí' : currency(order.shippingFee)}</span></div>
              {order.discount > 0 && (
                <div className="row-between small" style={{ color: 'var(--danger)' }}>
                  <span>Giảm giá{order.voucher ? ` (${order.voucher})` : ''}</span><span>-{currency(order.discount)}</span>
                </div>
              )}
              <hr className="divider" style={{ margin: '4px 0' }} />
              <div className="row-between">
                <span className="strong">Tổng cộng</span>
                <span className="price" style={{ fontSize: 20 }}>{currency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Lịch sử trạng thái</h3>
            <div className="stack" style={{ gap: 14 }}>
              {[...order.timeline].reverse().map((t, i) => (
                <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <span className="dot" style={{ background: i === 0 ? 'var(--accent-green)' : 'var(--border-color)', marginTop: 6 }} />
                  <div>
                    <div className="small strong">{ORDER_STATUS[t.status].label}</div>
                    <div className="tiny muted">{t.note}</div>
                    <div className="tiny muted">{dateTime(t.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 76 }}>
          <div className="card">
            <div className="row" style={{ marginBottom: 12 }}>
              <MapPin size={17} color="var(--accent-green)" />
              <h3 style={{ margin: 0, fontSize: 15 }}>Địa chỉ nhận hàng</h3>
            </div>
            <div className="small strong">{order.address.name}</div>
            <div className="small muted">{order.address.phone}</div>
            <div className="small muted" style={{ marginTop: 4 }}>{order.address.detail}</div>
            {order.note && <div className="tiny muted" style={{ marginTop: 8 }}>Ghi chú: {order.note}</div>}
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <Receipt size={17} color="var(--accent-green)" />
              <h3 style={{ margin: 0, fontSize: 15 }}>Thanh toán</h3>
            </div>
            <div className="small">{PAYMENT_LABEL[order.payment]}</div>
            {shop && (
              <>
                <hr className="divider" />
                <div className="row" style={{ marginBottom: 10 }}>
                  <img src={shop.avatar} alt="" className="avatar" style={{ width: 34, height: 34 }} />
                  <div className="small strong truncate">{shop.name}</div>
                </div>
                <button className="btn btn-ghost btn-sm btn-block" onClick={chatShop}>
                  <MessageSquare size={15} /> Nhắn tin cho shop
                </button>
              </>
            )}
          </div>

          <div className="card stack" style={{ gap: 8 }}>
            {['pending', 'confirmed'].includes(order.status) && (
              <button
                className="btn btn-ghost btn-block"
                style={{ color: 'var(--danger)' }}
                onClick={() => {
                  if (!window.confirm(`Hủy đơn hàng ${order.code}?`)) return;
                  updateOrderStatus(order.id, 'cancelled', 'Khách hàng hủy đơn');
                  toast('Đã hủy đơn hàng.', 'info');
                }}
              >
                Hủy đơn hàng
              </button>
            )}
            {order.status === 'delivered' && (
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  updateOrderStatus(order.id, 'completed', 'Khách xác nhận đã nhận hàng');
                  toast('Cảm ơn bạn! Đơn hàng đã hoàn thành.');
                }}
              >
                Xác nhận đã nhận hàng
              </button>
            )}
            <Link to="/shop" className="btn btn-soft btn-block">Tiếp tục mua sắm</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
